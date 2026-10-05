from __future__ import annotations

import uuid
from typing import BinaryIO

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.libs.errors import AppError, ErrorCode
from app.models.task_job import TaskJob
from app.models.user import User
from app.services.project import check_is_project_admin, project_find
from app.services.storage import StorageBackend

BINARY_PROCESSING = "BINARY_PROCESSING"


def job_find(db: Session, *, user: User, job_id: uuid.UUID) -> TaskJob:
    job = db.execute(
        select(TaskJob).where(
            TaskJob.id == job_id,
            TaskJob.user_id == user.id,
            TaskJob.type == BINARY_PROCESSING,
        )
    ).scalar_one_or_none()
    if not job:
        raise AppError("Tâche non trouvée.", ErrorCode.RESOURCE_NOT_FOUND)
    return job


def job_list(db: Session, *, user: User, project_id: int | None = None) -> list[TaskJob]:
    stmt = select(TaskJob).where(TaskJob.user_id == user.id)
    if project_id:
        stmt = stmt.where(TaskJob.input_data["project_id"].as_integer() == project_id)
    return list(db.execute(stmt.order_by(TaskJob.created_at.desc())).scalars().all())


def upload_intent_create(
    db: Session,
    *,
    user: User,
    project_id: int,
    idempotency_key: str | None,
    storage: StorageBackend,
) -> tuple[TaskJob, str]:
    project = project_find(db, project_id=project_id)
    check_is_project_admin(db, user=user, project=project)

    job = None
    if idempotency_key:
        job = db.execute(
            select(TaskJob).where(
                TaskJob.user_id == user.id,
                TaskJob.type == BINARY_PROCESSING,
                TaskJob.idempotency_key == idempotency_key,
            )
        ).scalar_one_or_none()

    if not job:
        job = TaskJob(user_id=user.id, type=BINARY_PROCESSING, idempotency_key=idempotency_key)
        db.add(job)
        db.flush()

    key = f"uploads/{job.id}.apk"
    upload_url = storage.presigned_upload_url(key)
    job.input_data = {"r2_path": key, "project_id": project_id}
    db.flush()
    return job, upload_url


def job_upload(
    db: Session, *, user: User, job_id: uuid.UUID, file: BinaryIO, storage: StorageBackend
) -> None:
    job = job_find(db, user=user, job_id=job_id)
    key = f"uploads/{job.id}.apk"
    storage.upload(file, key)
    job.input_data = {**job.input_data, "r2_path": key}
    db.flush()


def job_authorize_processing(db: Session, *, user: User, job_id: uuid.UUID) -> TaskJob:
    job = job_find(db, user=user, job_id=job_id)
    project_id = job.input_data.get("project_id")
    if project_id:
        check_is_project_admin(db, user=user, project=project_find(db, project_id=project_id))
    return job
