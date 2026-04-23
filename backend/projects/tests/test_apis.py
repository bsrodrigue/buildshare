import pytest
from rest_framework import status
from rest_framework.test import APIClient

from projects.models import ProjectInvitation, UserProjectProfile
from projects.services import project_create
from users.models import User


@pytest.mark.django_db
class TestProjectMembershipAPI:
    @pytest.fixture
    def client(self):
        return APIClient()

    @pytest.fixture
    def admin_user(self):
        return User.objects.create_user(email="admin_api@example.com", password="password")

    @pytest.fixture
    def target_user(self):
        return User.objects.create_user(email="target_api@example.com", password="password")

    @pytest.fixture
    def project(self, admin_user):
        return project_create(title="API Project", user=admin_user)

    def test_send_invitation_api(self, client, admin_user, target_user, project):
        client.force_authenticate(user=admin_user)
        url = f"/api/projects/{project.id}/invitations/"

        response = client.post(url, {"email": target_user.email, "role": "MEMBER"})

        assert response.status_code == status.HTTP_201_CREATED
        assert ProjectInvitation.objects.filter(project=project, email=target_user.email).exists()

    def test_accept_invitation_api(self, client, admin_user, target_user, project):
        # Create invitation
        invitation = ProjectInvitation.objects.create(
            project=project, inviter=admin_user, email=target_user.email, role="MEMBER"
        )

        client.force_authenticate(user=target_user)
        url = f"/api/projects/invitations/{invitation.id}/accept/"

        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "accepted"
        assert UserProjectProfile.objects.filter(project=project, user=target_user).exists()

    def test_revoke_membership_api(self, client, admin_user, target_user, project):
        # Setup: Target is member
        UserProjectProfile.objects.create(project=project, user=target_user, role="MEMBER")

        client.force_authenticate(user=admin_user)
        url = f"/api/projects/{project.id}/members/{target_user.id}/"

        response = client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not UserProjectProfile.objects.filter(project=project, user=target_user).exists()

    def test_list_members_api(self, client, admin_user, target_user, project):
        UserProjectProfile.objects.create(project=project, user=target_user, role="MEMBER")

        client.force_authenticate(user=admin_user)
        url = f"/api/projects/{project.id}/members/"

        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2  # Admin + Target
        emails = [m["email"] for m in response.data]
        assert target_user.email in emails
        assert admin_user.email in emails

    def test_view_project_detail_unauthorized(self, client, target_user, project):
        # target_user is not a member
        client.force_authenticate(user=target_user)
        url = f"/api/projects/{project.id}/"

        response = client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND  # Or 403 depending on project_get

    def test_send_invitation_non_admin_fails(self, client, target_user, project):
        # Setup: target_user is a MEMBER, not ADMIN
        UserProjectProfile.objects.create(project=project, user=target_user, role="MEMBER")

        client.force_authenticate(user=target_user)
        url = f"/api/projects/{project.id}/invitations/"

        response = client.post(url, {"email": "another@example.com", "role": "MEMBER"})

        assert response.status_code == status.HTTP_403_FORBIDDEN
