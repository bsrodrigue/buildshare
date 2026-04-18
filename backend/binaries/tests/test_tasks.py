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
    def user(self):
        return User.objects.create_user(email="test@example.com", password="password123")

    @pytest.fixture
    def project(self, user):
        project = Project.objects.create(title="Test Project")
        UserProjectProfile.objects.create(user=user, project=project, role="ADMIN")
        return project

    @pytest.fixture
    def job(self, user, project):
        return TaskJob.objects.create(
            user=user,
            type=TaskJobType.BINARY_PROCESSING,
            input_data={"r2_path": "uploads/test.apk", "project_id": project.id},
        )

    @patch("binaries.tasks.R2StorageService")
    @patch("binaries.tasks.APK")
    @patch("binaries.tasks.open", create=True)
    @patch("binaries.tasks.File")
    @patch("os.remove")
    def test_process_apk_task_success(
        self, mock_remove, mock_file, mock_open, mock_apk, mock_r2_service_class, job
    ):
        # Setup mocks
        mock_r2_service = mock_r2_service_class.return_value
        mock_r2_service.download_file.return_value = None

        mock_apk_instance = mock_apk.return_value
        mock_apk_instance.package = "com.test.app"
        mock_apk_instance.version_code = "100"
        mock_apk_instance.version_name = "1.0.0"
        mock_apk_instance.application = "Test App"

        # Mock the built-in open
        mock_open.return_value.__enter__.return_value = MagicMock()
        mock_open.return_value.__enter__.return_value.read.return_value = b"fake-apk-content"

        # Mock File to return a real ContentFile
        mock_file.side_effect = lambda f, name: ContentFile(f.read(), name=name)

        # Execute task
        process_apk_task(str(job.id))

        # Verify job status
        job.refresh_from_db()
        assert job.status == TaskJobStatus.SUCCESS
        assert job.output_data["package_name"] == "com.test.app"
        assert job.output_data["version_code"] == 100

        # Verify database records
        assert Application.objects.filter(app_id="com.test.app").exists()
        assert Release.objects.filter(version_code=100).exists()
        assert Artifact.objects.count() == 1

        app = Application.objects.get(app_id="com.test.app")
        assert app.title == "Test App"

    @patch("binaries.tasks.R2StorageService")
    def test_process_apk_task_failure(self, mock_r2_service_class, job):
        # Setup mock to raise exception
        mock_r2_service = mock_r2_service_class.return_value
        mock_r2_service.download_file.side_effect = Exception("Download failed")

        # Execute task (it should re-raise the exception)
        with pytest.raises(Exception, match="Download failed"):
            process_apk_task(str(job.id))

        # Verify job status
        job.refresh_from_db()
        assert job.status == TaskJobStatus.FAILURE
        assert "Download failed" in job.error_message
