from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from io import BytesIO
from typing import Any

from celery import shared_task
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.config import settings
from app.libs.flows import TaskJobFlow
from app.models.binary import Application, Artifact, Release
from app.models.project import Project
from app.models.task_job import TaskJob
from app.schemas.binary import AppConflictInfo
from app.services.storage import get_storage_backend
from libs.android import AndroidBinaryDownloader, AndroidBinaryService, APKDownloader, APKParser

logger = logging.getLogger(__name__)

_sync_url = settings.DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", "")
_engine = create_engine(_sync_url)

ERROR_MESSAGE_MAX_LENGTH = 500


def flow_finish(job: TaskJob) -> None:
    job.status = "SUCCESS"
    job.finished_at = datetime.now(UTC)


def flow_fail(job: TaskJob, error_message: str) -> None:
    job.status = "FAILURE"
    job.finished_at = datetime.now(UTC)
    job.error_message = (
        error_message[: ERROR_MESSAGE_MAX_LENGTH - 3] + "..."
        if len(error_message) > ERROR_MESSAGE_MAX_LENGTH
        else error_message
    )


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
        if app.project_id != project_id:
            raise ValueError(f"Application {app_id} does not belong to project {project_id}.")
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


@shared_task(bind=True, name="app.tasks.binary_processing.analyze_apk_task")
def analyze_apk_task(
    self,
    job_id: str,
    parser: APKParser | None = None,
    downloader: APKDownloader | None = None,
) -> None:
    db = Session(_engine)
    try:
        job = db.execute(select(TaskJob).where(TaskJob.id == uuid.UUID(job_id))).scalar_one()
        flow = TaskJobFlow(job)
        logger.info(f"Starting APK analysis for job {job_id}")

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
        downloader = downloader or AndroidBinaryDownloader()
        parser = parser or AndroidBinaryService()

        apk_bytes = downloader.download(storage_service, r2_path)
        metadata = parser.parse_metadata(apk_bytes)

        package_name = metadata.package_name
        signature = metadata.signature_hash
        version_code = metadata.version_code
        file_hash = metadata.file_hash
        architecture = metadata.architecture

        existing_apps = list(
            db.execute(
                select(Application).where(
                    Application.project_id == project_id,
                    Application.app_id == package_name,
                )
            )
            .scalars()
            .all()
        )

        matching_app = None
        sibling_apps: list[AppConflictInfo] = []
        app_id_exists = len(existing_apps) > 0
        signature_matches: bool | None = None

        for app in existing_apps:
            info = AppConflictInfo(
                app_id=app.id, title=app.title, app_signature=app.app_signature, tag=app.tag
            )
            if app.app_signature == signature:
                matching_app = info
                signature_matches = True
            elif app.app_signature is not None and app.app_signature != signature:
                sibling_apps.append(info)

        if app_id_exists and signature_matches is None:
            signature_matches = False

        version_code_exists = False
        architecture_exists = False
        hash_exists = False

        if matching_app:
            existing_release = db.execute(
                select(Release).where(
                    Release.application_id == matching_app.app_id,
                    Release.version_code == version_code,
                )
            ).scalar_one_or_none()
            if existing_release:
                version_code_exists = True
                existing_arch = db.execute(
                    select(Artifact).where(
                        Artifact.release_id == existing_release.id,
                        Artifact.architecture == architecture,
                    )
                ).scalar_one_or_none()
                if existing_arch:
                    architecture_exists = True
                existing_hash = db.execute(
                    select(Artifact).where(
                        Artifact.release_id == existing_release.id,
                        Artifact.hash == file_hash,
                    )
                ).scalar_one_or_none()
                if existing_hash:
                    hash_exists = True

        decisions_needed: list[str] = []
        if app_id_exists and signature_matches is False:
            decisions_needed.append("app_conflict_signature")
        if version_code_exists and hash_exists:
            decisions_needed.append("artifact_duplicate")

        job.output_data = {
            "package_name": package_name,
            "version_code": version_code,
            "version_name": metadata.version_name,
            "architecture": architecture,
            "hash": file_hash,
            "signature": signature,
            "is_debuggable": metadata.is_debuggable,
            "file_size": metadata.file_size,
            "app_id_exists": app_id_exists,
            "signature_matches": signature_matches,
            "existing_app": matching_app.model_dump() if matching_app else None,
            "sibling_apps": [s.model_dump() for s in sibling_apps],
            "version_code_exists": version_code_exists,
            "architecture_exists": architecture_exists,
            "hash_exists": hash_exists,
            "decisions_needed": decisions_needed,
        }
        flow.finish()
        db.commit()

        logger.info(f"Successfully analyzed APK for job {job_id}")

    except Exception as e:
        logger.exception(f"Error analyzing APK for job {job_id}: {e}")
        db.rollback()
        try:
            job = db.execute(select(TaskJob).where(TaskJob.id == uuid.UUID(job_id))).scalar_one()
            flow = TaskJobFlow(job)
            flow.fail(error_message=str(e))
            db.commit()
        except Exception:
            logger.exception(f"Failed to mark job {job_id} as failed")
            db.rollback()
    finally:
        db.close()


@shared_task(bind=True, name="app.tasks.binary_processing.process_apk_task")
def process_apk_task(
    self,
    job_id: str,
    resolution: dict[str, Any] | None = None,
    title: str | None = None,
    description: str | None = None,
    parser: APKParser | None = None,
    downloader: APKDownloader | None = None,
) -> None:
    db = Session(_engine)
    try:
        job = db.execute(select(TaskJob).where(TaskJob.id == uuid.UUID(job_id))).scalar_one()
        logger.info(f"Starting APK processing for job {job_id} (current status: {job.status})")

        flow = TaskJobFlow(job)
        flow.restart()
        db.flush()

        r2_path = job.input_data.get("r2_path")
        project_id = job.input_data.get("project_id")

        if not r2_path or not project_id:
            raise ValueError("Missing r2_path or project_id in job input data.")

        project = db.execute(select(Project).where(Project.id == project_id)).scalar_one()
        if not project:
            raise ValueError(f"Project {project_id} not found.")

        storage_service = get_storage_backend()
        downloader = downloader or AndroidBinaryDownloader()
        parser = parser or AndroidBinaryService()

        apk_bytes = downloader.download(storage_service, r2_path)
        metadata = parser.parse_metadata(apk_bytes)

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

        icon_bytes = parser.get_app_icon_bytes(apk_bytes)
        if icon_bytes is not None:
            icon_key = f"icons/{package_name}/{version_code}/{uuid.uuid4().hex}.png"
            storage_service.upload(BytesIO(icon_bytes), icon_key)
            app.icon_key = icon_key
        else:
            app.icon_key = None

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

        artifact_key = f"artifacts/{package_name}/{version_code}/{package_name}-{version_name}.apk"
        storage_service.upload(BytesIO(apk_bytes), artifact_key)

        artifact = Artifact(
            release_id=release.id,
            file_path=artifact_key,
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
        flow_finish(job)
        db.commit()

        logger.info(f"Successfully processed APK for job {job_id}")

    except Exception as e:
        logger.exception(f"Error processing APK for job {job_id}: {e}")
        db.rollback()
        try:
            job = db.execute(select(TaskJob).where(TaskJob.id == uuid.UUID(job_id))).scalar_one()
            flow_fail(job, str(e))
            db.commit()
        except Exception:
            logger.exception(f"Failed to mark job {job_id} as failed")
            db.rollback()
    finally:
        db.close()
