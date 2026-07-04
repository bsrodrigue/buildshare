from __future__ import annotations

import logging

from celery import shared_task
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.config import settings
from app.libs.flows import TaskJobFlow
from app.models.binary import Application, Artifact, Release
from app.models.project import Project
from app.models.task_job import TaskJob
from app.services.storage import get_storage_backend
from libs.android import AndroidBinaryDownloader, AndroidBinaryService

logger = logging.getLogger(__name__)

# Celery tasks need their own engine since they run outside FastAPI
_sync_url = settings.DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", "")
_engine = create_engine(_sync_url)


@shared_task(bind=True, name="app.tasks.binary_processing.process_apk_task")
def process_apk_task(
    self, job_id: str, title: str | None = None, description: str | None = None
) -> None:
    db = Session(_engine)
    try:
        job = db.execute(select(TaskJob).where(TaskJob.id == job_id)).scalar_one()
        flow = TaskJobFlow(job)
        logger.info(f"Starting APK processing for job {job_id}")

        flow.start()
        db.flush()

        r2_path = job.input_data.get("r2_path")
        project_id = job.input_data.get("project_id")

        if not r2_path or not project_id:
            raise ValueError("Missing r2_path or project_id in job input data.")

        project = db.execute(select(Project).where(Project.id == project_id)).scalar_one()
        if not project:
            raise ValueError(f"Project {project_id} not found.")

        storage_service = get_storage_backend()
        downloader = AndroidBinaryDownloader()
        binary_service = AndroidBinaryService()

        tmp_path = downloader.download(storage_service, r2_path)

        try:
            metadata = binary_service.parse_metadata(tmp_path)

            package_name = metadata.package_name
            version_code = metadata.version_code
            version_name = metadata.version_name
            file_hash = metadata.file_hash
            architecture = metadata.architecture
            signature = metadata.signature_hash

            app = db.execute(
                select(Application).where(
                    Application.project_id == project_id,
                    Application.app_id == package_name,
                )
            ).scalar_one_or_none()

            if app:
                if app.app_signature and signature and app.app_signature != signature:
                    raise ValueError(f"Signature mismatch: {signature} != {app.app_signature}")
                if not app.app_signature and signature:
                    app.app_signature = signature
            else:
                app = Application(
                    project_id=project_id,
                    app_id=package_name,
                    title=title or metadata.app_label or package_name,
                    description=description or "",
                    app_signature=signature,
                )
                db.add(app)

            db.flush()

            release = db.execute(
                select(Release).where(
                    Release.application_id == app.id,
                    Release.version_code == version_code,
                )
            ).scalar_one_or_none()

            if not release:
                release = Release(
                    application_id=app.id,
                    version_code=version_code,
                    version_id=version_name,
                )
                db.add(release)
                db.flush()

            existing_hash = db.execute(
                select(Artifact).where(
                    Artifact.release_id == release.id,
                    Artifact.hash == file_hash,
                )
            ).scalar_one_or_none()

            if existing_hash:
                raise ValueError("Ce binaire a déjà été téléversé pour cette version.")

            if architecture != "unknown":
                existing_arch = db.execute(
                    select(Artifact).where(
                        Artifact.release_id == release.id,
                        Artifact.architecture == architecture,
                    )
                ).scalar_one_or_none()
                if existing_arch:
                    raise ValueError(
                        f"Une version pour l'architecture '{architecture}' existe déjà."
                    )

            artifact = Artifact(
                release_id=release.id,
                file_path=f"artifacts/{package_name}/{version_code}/{package_name}-{version_name}.apk",
                hash=file_hash,
                architecture=architecture,
                size=metadata.file_size,
            )
            db.add(artifact)
            db.flush()

            job.output_data = {
                "package_name": metadata.package_name,
                "version_code": metadata.version_code,
                "version_name": metadata.version_name,
                "hash": metadata.file_hash,
                "architecture": metadata.architecture,
                "apk_label": metadata.app_label,
                "signature": metadata.signature_hash,
                "application_id": str(app.id),
                "application_title": app.title,
                "release_id": str(release.id),
                "artifact_id": str(artifact.id),
            }
            flow.finish()
            db.flush()

            logger.info(f"Successfully processed APK for job {job_id}")

        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    except Exception as e:
        logger.exception(f"Error processing APK for job {job_id}: {e}")
        try:
            job = db.execute(select(TaskJob).where(TaskJob.id == job_id)).scalar_one()
            flow = TaskJobFlow(job)
            flow.fail(error_message=str(e))
            db.flush()
        except Exception:
            logger.exception(f"Failed to mark job {job_id} as failed")
        raise e
    finally:
        db.close()
