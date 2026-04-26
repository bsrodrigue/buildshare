import pytest
from django.core.files.base import ContentFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from binaries.models import Application, Artifact, Release
from projects.models import Project, UserProjectProfile
from users.models import User


@pytest.mark.django_db
class TestArtifactDownloadApi:
    @pytest.fixture
    def user(self) -> User:
        return User.objects.create_user(email="user@example.com", password="password123")

    @pytest.fixture
    def other_user(self) -> User:
        return User.objects.create_user(email="other@example.com", password="password123")

    @pytest.fixture
    def project(self, user: User) -> Project:
        project = Project.objects.create(title="Test Project")
        UserProjectProfile.objects.create(
            user=user, project=project, role=UserProjectProfile.Role.MEMBER
        )
        return project

    @pytest.fixture
    def artifact(self, project: Project) -> Artifact:

        app = Application.objects.create(project=project, app_id="com.test", title="Test App")
        release = Release.objects.create(application=app, version_code=1, version_id="1.0.0")
        return Artifact.objects.create(
            release=release,
            file=ContentFile(b"fake-content", name="test.apk"),
            hash="hash",
            architecture="arm64",
            size=123,
        )

    def test_download_success(self, user: User, artifact: Artifact) -> None:
        client = APIClient()
        client.force_authenticate(user=user)

        url = reverse("api:artifact-download", kwargs={"artifact_id": artifact.id})
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Django appends a random suffix to file names in tests to ensure uniqueness
        assert 'attachment; filename="test' in response.get("Content-Disposition")

    def test_download_forbidden(self, other_user: User, artifact: Artifact) -> None:
        client = APIClient()
        client.force_authenticate(user=other_user)

        url = reverse("api:artifact-download", kwargs={"artifact_id": artifact.id})
        response = client.get(url)

        # Our exception handler returns 400 for ApplicationError by default
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_download_unauthenticated(self, artifact: Artifact) -> None:
        client = APIClient()

        url = reverse("api:artifact-download", kwargs={"artifact_id": artifact.id})
        response = client.get(url)

        # DRF returns 401 for unauthenticated users when authentication is required
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
