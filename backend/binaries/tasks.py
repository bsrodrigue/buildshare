import logging

from celery import shared_task
from django.db import transaction

from core.flows import TaskJobFlow
from core.models import TaskJob
from core.services.storage import R2StorageService
from libs.android import AndroidBinaryDownloader, AndroidBinaryService
from projects.models import Project

from .services.android_process import AndroidArtifactProcessingService

logger = logging.getLogger(__name__)


@shared_task(bind=True, name="binaries.tasks.process_apk_task")  # type: ignore[untyped-decorator]
def process_apk_task(
    _self: object, job_id: str, title: str | None = None, description: str | None = None
) -> None:
    """
    Background task to process an uploaded APK from R2.
    """
    job = TaskJob.objects.select_related("user").get(id=job_id)
    flow = TaskJobFlow(job)
    logger.info(f"Starting APK processing for job {job_id}")

    try:
        with transaction.atomic():
            flow.start()

        storage_service = R2StorageService()
        r2_path = job.input_data.get("r2_path")
        project_id = job.input_data.get("project_id")

        if not r2_path or not project_id:
            raise ValueError("Missing r2_path or project_id in job input data.")

        project = Project.objects.get(id=project_id)

        # Initialize Services
        downloader = AndroidBinaryDownloader()
        binary_service = AndroidBinaryService()
        process_service = AndroidArtifactProcessingService()

        # 1. Download
        tmp_path = downloader.download(storage_service, r2_path)

        try:
            # 2. Parse
            metadata = binary_service.parse_metadata(tmp_path)

            # 3. Process & Save (Wrapped in transaction for consistency)
            with transaction.atomic():
                results = process_service.process_and_save(
                    project=project,
                    metadata=metadata,
                    apk_path=tmp_path,
                    title=title,
                    description=description,
                )

                # Finalize job output inside the same transaction
                job.output_data = {
                    "package_name": metadata.package_name,
                    "version_code": metadata.version_code,
                    "version_name": metadata.version_name,
                    "hash": metadata.file_hash,
                    "architecture": metadata.architecture,
                    "apk_label": metadata.app_label,
                    "signature": metadata.signature_hash,
                    **results,
                }
                flow.finish()

            logger.info(f"Successfully processed APK for job {job_id}")

        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    except Exception as e:
        logger.exception(f"Error processing APK for job {job_id}: {e}")
        # Mark job as failed
        flow.fail(error_message=str(e))
        # Re-raise to let Celery handle retries if configured
        raise e
