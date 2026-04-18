import tempfile
from pathlib import Path

from celery import shared_task
from django.core.files import File
from django.db import transaction
from pyaxmlparser import APK

from core.flows import TaskJobFlow
from core.models import TaskJob
from core.services.storage import R2StorageService
from projects.models import Project

from .models import Application, Artifact, Release


@shared_task(bind=True, name="binaries.tasks.process_apk_task")
def process_apk_task(_self, job_id, title=None, description=None):
    """
    Background task to process an uploaded APK from R2.
    Extracts metadata, ensures Application/Release records exist,
    and creates an Artifact.
    """
    job = TaskJob.objects.select_related("user").get(id=job_id)
    flow = TaskJobFlow(job)

    try:
        # Start the job
        with transaction.atomic():
            flow.start()

        storage_service = R2StorageService()
        r2_path = job.input_data.get("r2_path")
        project_id = job.input_data.get("project_id")

        if not r2_path or not project_id:
            raise ValueError("Missing r2_path or project_id in job input data.")

        project = Project.objects.get(id=project_id)

        # Download APK to temp file
        with tempfile.NamedTemporaryFile(suffix=".apk", delete=False) as tmp_file:
            storage_service.download_file(r2_path, tmp_file.name)
            tmp_path = Path(tmp_file.name)

        try:
            # Parse APK
            apk = APK(str(tmp_path))
            package_name = apk.package
            version_code = int(apk.version_code)
            version_name = apk.version_name

            with transaction.atomic():
                # Get or Create Application
                app, _ = Application.objects.get_or_create(
                    project=project,
                    app_id=package_name,
                    defaults={
                        "title": title or apk.application or package_name,
                        "description": description or "",
                    },
                )

                # Get or Create Release
                release, _ = Release.objects.get_or_create(
                    application=app,
                    version_code=version_code,
                    defaults={
                        "version_id": version_name,
                    },
                )

                # Create Artifact
                with tmp_path.open("rb") as f:
                    artifact = Artifact.objects.create(
                        release=release,
                        file=File(f, name=f"{package_name}-{version_name}.apk"),
                    )

                # Update job output
                job.output_data = {
                    "application_id": str(app.id),
                    "release_id": str(release.id),
                    "artifact_id": str(artifact.id),
                    "package_name": package_name,
                    "version_code": version_code,
                    "version_name": version_name,
                }

                flow.finish()

        finally:
            # Cleanup temp file
            if tmp_path.exists():
                tmp_path.unlink()

    except Exception as e:
        # Mark job as failed
        flow.fail(error_message=str(e))
        # Re-raise to let Celery handle retries if configured
        raise e
