from __future__ import annotations

import logging
from typing import Any

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

_sync_url = settings.DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", "")
_engine = create_engine(_sync_url)


def _resolve_app(
    db: Session,
    project_id: int,
    package_name: str,
    signature: str | None,
    is_debuggable: bool,
    metadata: Any,
    resolution: dict[str, Any],
    title: str | None,
    description: str,
) -> Application:
    action = resolution.get("action") if resolution else None

    if action == "override":
        app_id = resolution.get("application_id")
        app = db.get(Application, app_id)
        if not app:
            raise ValueError(f"Application {app_id} not found for override.")
        app.app_signature = signature
        if is_debuggable:
            app.is_debuggable = True
        if "tag" in resolution:
            app.tag = resolution.get("tag")
        return app

    if action == "create_sibling":
        app = Application(
            project_id=project_id,
            app_id=package_name,
            title=title or metadata.app_label or package_name,
            description=description,
            app_signature=signature,
            is_debuggable=is_debuggable,
            tag=resolution.get("tag"),
        )
        db.add(app)
        db.flush()
        return app

    # Default: find existing app by signature or create new
    app = db.execute(
        select(Application).where(
            Application.project_id == project_id,
            Application.app_id == package_name,
            Application.app_signature == signature,
        )
    ).scalar_one_or_none()

    if not app and signature:
        app = db.execute(
            select(Application).where(
                Application.project_id == project_id,
                Application.app_id == package_name,
                Application.app_signature.is_(None),
            )
        ).scalar_one_or_none()
        if app:
            app.app_signature = signature

    if app:
        if app.app_signature and signature and app.app_signature != signature:
            raise ValueError(f"Signature mismatch: {signature} != {app.app_signature}")
        if not app.app_signature and signature:
            app.app_signature = signature
        if is_debuggable:
            app.is_debuggable = True
    else:
        app = Application(
            project_id=project_id,
            app_id=package_name,
            title=title or metadata.app_label or package_name,
            description=description,
            app_signature=signature,
            is_debuggable=is_debuggable,
        )
        db.add(app)
        db.flush()

    return app


@shared_task(bind=True, name="app.tasks.binary_processing.process_apk_task")
def process_apk_task(
    self,
    job_id: str,
    resolution: dict[str, Any] | None = None,
    title: str | None = None,
    description: str | None = None,
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
            is_debuggable = metadata.is_debuggable

            app = _resolve_app(
                db,
                project_id,
                package_name,
                signature,
                is_debuggable,
                metadata,
                resolution or {},
                title,
                description or "",
            )

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
                "is_debuggable": metadata.is_debuggable,
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
