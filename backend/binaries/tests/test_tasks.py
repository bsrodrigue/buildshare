from unittest.mock import MagicMock, patch

import pytest
from django.core.files.base import ContentFile

from binaries.models import Application, Artifact, Release
from binaries.tasks import process_apk_task
from core.models import TaskJob, TaskJobStatus, TaskJobType
from projects.models import Project, UserProjectProfile
from users.models import User


@pytest.mark.django_db
class TestProcessAPKTask:
    @pytest.fixture
    def user(self) -> User:
        return User.objects.create_user(
            email="test@example.com",
            password="password123",  # noqa: S106
        )

    @pytest.fixture
    def project(self, user: User) -> Project:
        project = Project.objects.create(title="Test Project")
        UserProjectProfile.objects.create(
            user=user, project=project, role=UserProjectProfile.Role.ADMIN
        )
        return project

    @pytest.fixture
    def job(self, user: User, project: Project) -> TaskJob:
        return TaskJob.objects.create(
            user=user,
            type=TaskJobType.BINARY_PROCESSING,
            input_data={"r2_path": "uploads/test.apk", "project_id": project.id},
        )

    @patch("binaries.tasks.R2StorageService")
    @patch("binaries.tasks.AndroidBinaryService")
    @patch("binaries.tasks.open", create=True)
    @patch("binaries.tasks.File")
    @patch("os.remove")
    def test_process_apk_task_success(  # noqa: PLR0913
        self,
        _mock_remove: MagicMock,
        mock_file: MagicMock,
        mock_open: MagicMock,
        mock_service_class: MagicMock,
        mock_r2_service_class: MagicMock,
        job: TaskJob,
    ) -> None:
        # Setup mocks
        mock_r2_service = mock_r2_service_class.return_value
        mock_r2_service.download_file.return_value = None

        mock_service = mock_service_class.return_value
        mock_metadata = MagicMock()
        mock_metadata.package_name = "com.test.app"
        mock_metadata.version_code = 100
        mock_metadata.version_name = "1.0.0"
        mock_metadata.app_label = "Test App"
        mock_metadata.signature_hash = "fake-signature"
        mock_metadata.architecture = "arm64-v8a"
        mock_service.parse_metadata.return_value = mock_metadata

        # Mock the built-in open
        mock_open.return_value.__enter__.return_value = MagicMock()
        mock_open.return_value.__enter__.return_value.read.return_value = b"fake-apk-content"

        # Mock File to return a real ContentFile
        mock_file.side_effect = lambda f, name: ContentFile(f.read(), name=name)

        # Execute task
        process_apk_task(str(job.id))

        # Verify job status
        job.refresh_from_db()
        assert job.status == TaskJobStatus.SUCCESS  # noqa: S101
        assert job.output_data["package_name"] == "com.test.app"  # noqa: S101
        assert job.output_data["version_code"] == 100  # noqa: S101, PLR2004

        # Verify database records
        assert Application.objects.filter(app_id="com.test.app").exists()  # noqa: S101
        assert Release.objects.filter(version_code=100).exists()  # noqa: S101, PLR2004
        assert Artifact.objects.count() == 1  # noqa: S101

        app = Application.objects.get(app_id="com.test.app")
        assert app.title == "Test App"  # noqa: S101
        assert app.app_signature == "fake-signature"  # noqa: S101

    @patch("binaries.tasks.R2StorageService")
    @patch("binaries.tasks.AndroidBinaryService")
    @patch("binaries.tasks.open", create=True)
    def test_process_apk_task_signature_mismatch(
        self,
        _mock_open: MagicMock,
        mock_service_class: MagicMock,
        mock_r2_service_class: MagicMock,
        job: TaskJob,
        project: Project,
    ) -> None:
        # Create an existing app with a different signature
        Application.objects.create(
            project=project,
            app_id="com.test.app",
            title="Existing App",
            app_signature="original-signature",
        )

        # Setup mocks
        mock_r2_service = mock_r2_service_class.return_value
        mock_r2_service.download_file.return_value = None

        mock_service = mock_service_class.return_value
        mock_metadata = MagicMock()
        mock_metadata.package_name = "com.test.app"
        mock_metadata.version_code = 101
        mock_metadata.version_name = "1.0.1"
        mock_metadata.app_label = "Test App"
        mock_metadata.signature_hash = "malicious-signature"
        mock_metadata.architecture = "arm64-v8a"
        mock_service.parse_metadata.return_value = mock_metadata

        # Execute task (it should fail)
        process_apk_task(str(job.id))

        # Verify job status
        job.refresh_from_db()
        assert job.status == TaskJobStatus.FAILURE  # noqa: S101
        assert "ne correspond pas à la signature enregistrée" in job.error_message  # noqa: S101

    @patch("binaries.tasks.R2StorageService")
    def test_process_apk_task_failure(self, mock_r2_service_class: MagicMock, job: TaskJob) -> None:
        # Setup mock to raise exception
        mock_r2_service = mock_r2_service_class.return_value
        mock_r2_service.download_file.side_effect = Exception("Download failed")

        # Execute task (it should re-raise the exception)
        with pytest.raises(Exception, match="Download failed"):
            process_apk_task(str(job.id))

        # Verify job status
        job.refresh_from_db()
        assert job.status == TaskJobStatus.FAILURE  # noqa: S101
        assert "Download failed" in job.error_message  # noqa: S101
