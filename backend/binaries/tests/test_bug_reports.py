import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from binaries.models import BugReport, BugStatus
from binaries.services import application_create, release_create
from projects.models import UserProjectProfile
from projects.services import project_create
from users.models import User


@pytest.mark.django_db
class TestBugReports:
    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def user(self, django_user_model):
        return django_user_model.objects.create_user(email="user@example.com", password="password")

    @pytest.fixture
    def project(self, user):
        return project_create(title="Test Project", user=user)

    @pytest.fixture
    def application(self, project, user):
        return application_create(
            project=project, app_id="com.test.app", title="Test App", user=user
        )

    @pytest.fixture
    def release(self, application, user):
        return release_create(
            application=application, version_code=1, version_id="1.0.0", user=user
        )

    @pytest.fixture
    def bug_report(self, release, user):
        return BugReport.objects.create(release=release, reporter=user, description="Bug Desc")

    def test_bug_creation(self, api_client, user, release):
        """Anyone in the project can report a bug."""
        api_client.force_authenticate(user=user)
        url = reverse("api:release-bug-list", kwargs={"release_id": release.id})
        data = {"description": "Bug description"}

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert BugReport.objects.filter(description="Bug description").count() == 1
        assert (
            BugReport.objects.filter(description="Bug description").first().status
            == BugStatus.DRAFT
        )

    def test_bug_transition_publish(self, api_client, user, bug_report):
        """User can publish their own bug."""
        api_client.force_authenticate(user=user)
        url = reverse(
            "api:bug-transition", kwargs={"bug_id": bug_report.id, "transition": "publish"}
        )

        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        bug_report.refresh_from_db()
        assert bug_report.status == BugStatus.OPENED

    def test_bug_resolution_admin_only(self, api_client, user, bug_report, project):
        """Only admins can resolve a bug."""
        # 1. Publish first
        bug_report.status = BugStatus.OPENED
        bug_report.save()

        # 2. Try as regular member (user was member by default in fixtures probably)
        # Note: In project_create, the creator is usually admin. Let's make sure they are MEMBER first.
        profile = project.user_profiles.get(user=user)
        profile.role = UserProjectProfile.Role.MEMBER
        profile.save()

        api_client.force_authenticate(user=user)
        url = reverse(
            "api:bug-transition", kwargs={"bug_id": bug_report.id, "transition": "resolve"}
        )
        response = api_client.post(url)
        assert (
            response.status_code == status.HTTP_400_BAD_REQUEST
        )  # ApplicationError returns 400 by default if custom handler not set yet, or we check the message

        # 3. Try as admin
        profile.role = UserProjectProfile.Role.ADMIN
        profile.save()

        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        bug_report.refresh_from_db()
        assert bug_report.status == BugStatus.RESOLVED

    def test_bug_messages(self, api_client, user, bug_report):
        """Test listing and creating messages."""
        api_client.force_authenticate(user=user)
        url = reverse("api:bug-message-list-create", kwargs={"bug_id": bug_report.id})

        # Create
        data = {"text": "Test message"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        # List
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["text"] == "Test message"

    def test_invalid_transition_name(self, api_client, user, bug_report):
        api_client.force_authenticate(user=user)
        url = reverse(
            "api:bug-transition", kwargs={"bug_id": bug_report.id, "transition": "invalid_name"}
        )
        response = api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "non trouvée" in response.data["message"]

    def test_illegal_state_transition(self, api_client, user, bug_report):
        """Cannot resolve a bug that is in DRAFT status according to FSM (needs OPENED/REOPENED)."""
        bug_report.release.application.project.user_profiles.filter(user=user).update(
            role=UserProjectProfile.Role.ADMIN
        )

        api_client.force_authenticate(user=user)
        # Bug is DRAFT. Trying to resolve it directly.
        url = reverse(
            "api:bug-transition", kwargs={"bug_id": bug_report.id, "transition": "resolve"}
        )
        response = api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "impossible depuis l'état actuel" in response.data["message"]

    def test_bug_access_control(self, api_client, bug_report):
        """A user who is not a project member cannot see/report bugs."""
        other_user = User.objects.create_user(email="other@test.com", password="password")
        api_client.force_authenticate(user=other_user)

        # Detail view
        url = reverse("api:bug-detail", kwargs={"bug_id": bug_report.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

        # List view
        url = reverse("api:release-bug-list", kwargs={"release_id": bug_report.release.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_bug_creation_validation(self, api_client, user, release):
        api_client.force_authenticate(user=user)
        url = reverse("api:release-bug-list", kwargs={"release_id": release.id})
        data = {"description": ""}  # Empty description

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "description" in response.data["fields"]
