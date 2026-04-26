import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from binaries.models import ReleaseMessage
from binaries.services import application_create, release_create
from projects.models import UserProjectProfile
from projects.services import project_create


@pytest.mark.django_db
class TestReleaseMessages:
    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def user_admin(self, django_user_model):
        return django_user_model.objects.create_user(email="admin@example.com", password="password")

    @pytest.fixture
    def user_member(self, django_user_model):
        return django_user_model.objects.create_user(
            email="member@example.com", password="password"
        )

    @pytest.fixture
    def user_non_member(self, django_user_model):
        return django_user_model.objects.create_user(email="none@example.com", password="password")

    @pytest.fixture
    def project(self, user_admin):
        return project_create(title="Test Project", user=user_admin)

    @pytest.fixture
    def application(self, project, user_admin):
        return application_create(
            project=project, app_id="com.test.app", title="Test App", user=user_admin
        )

    @pytest.fixture
    def release(self, application, user_admin):
        return release_create(
            application=application, version_code=1, version_id="1.0.0", user=user_admin
        )

    def test_admin_can_add_message(self, api_client, user_admin, release):
        api_client.force_authenticate(user=user_admin)
        url = reverse("api:release-message-list-create", kwargs={"release_id": release.id})
        data = {"text": "This is a bug report from admin"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["text"] == data["text"]
        assert response.data["user"]["email"] == user_admin.email
        assert ReleaseMessage.objects.count() == 1

    def test_member_can_add_message(self, api_client, user_member, release, project):
        # Setup: Add member to project
        UserProjectProfile.objects.create(
            user=user_member, project=project, role=UserProjectProfile.Role.MEMBER
        )

        api_client.force_authenticate(user=user_member)
        url = reverse("api:release-message-list-create", kwargs={"release_id": release.id})
        data = {"text": "This is a suggestion from member"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["text"] == data["text"]
        assert ReleaseMessage.objects.count() == 1

    def test_non_member_cannot_add_message(self, api_client, user_non_member, release):
        api_client.force_authenticate(user=user_non_member)
        url = reverse("api:release-message-list-create", kwargs={"release_id": release.id})
        data = {"text": "I should not be able to comment"}

        response = api_client.post(url, data)

        assert (
            response.status_code == status.HTTP_404_NOT_FOUND
        )  # get_object_or_404 filters by user membership

    def test_list_messages(self, api_client, user_admin, release):
        ReleaseMessage.objects.create(release=release, user=user_admin, text="Message 1")
        ReleaseMessage.objects.create(release=release, user=user_admin, text="Message 2")

        api_client.force_authenticate(user=user_admin)
        url = reverse("api:release-message-list-create", kwargs={"release_id": release.id})

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        assert response.data[0]["text"] == "Message 1"
        assert response.data[1]["text"] == "Message 2"
