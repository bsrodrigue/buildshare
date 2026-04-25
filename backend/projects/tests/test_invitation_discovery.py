import pytest
from rest_framework import status
from rest_framework.test import APIClient

from notifications.models import Notification, NotificationType
from projects.models import ProjectInvitation
from projects.services import invitation_send, project_create
from users.models import User


@pytest.mark.django_db
class TestInvitationDiscovery:
    @pytest.fixture
    def admin_user(self):
        return User.objects.create_user(email="admin@example.com", password="password")

    @pytest.fixture
    def project(self, admin_user):
        return project_create(title="Test Project", user=admin_user)

    def test_post_registration_invitation_discovery(self, project, admin_user):
        target_email = "newuser@example.com"

        # 1. A invites B (who doesn't exist yet)
        invitation = invitation_send(
            project=project,
            inviter=admin_user,
            email=target_email,
        )

        assert ProjectInvitation.objects.count() == 1
        assert Notification.objects.count() == 0  # No notification yet because user doesn't exist

        # 2. B registers
        new_user = User.objects.create_user(email=target_email, password="password")

        # 3. Verify B has a notification (triggered by signal)
        assert Notification.objects.count() == 1
        notif = Notification.objects.get(user=new_user)
        assert notif.type == NotificationType.PROJECT_INVITATION
        assert notif.payload["invitation_id"] == str(invitation.id)

        # 4. Verify B can list invitations via API
        client = APIClient()
        client.force_authenticate(user=new_user)

        response = client.get("/api/projects/invitations/me/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["id"] == str(invitation.id)
        assert response.data[0]["project"] == project.id

        # 5. Verify B can accept and see the project
        accept_url = f"/api/projects/invitations/{invitation.id}/accept/"
        response = client.post(accept_url)
        assert response.status_code == status.HTTP_200_OK

        # Check project list
        response = client.get("/api/projects/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["id"] == project.id
