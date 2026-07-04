from __future__ import annotations

from datetime import UTC, datetime

from app.libs.errors import AppError, ErrorCode
from app.models.binary import BugReport
from app.models.task_job import TaskJob

ERROR_MESSAGE_MAX_LENGTH = 500


class TaskJobFlow:
    def __init__(self, task_job: TaskJob) -> None:
        self.task_job = task_job

    def start(self) -> None:
        if self.task_job.status != "PENDING":
            raise AppError("Cannot start a job that is not PENDING.", ErrorCode.VALIDATION_ERROR)
        self.task_job.status = "STARTED"
        self.task_job.started_at = datetime.now(UTC)

    def finish(self) -> None:
        if self.task_job.status != "STARTED":
            raise AppError("Cannot finish a job that is not STARTED.", ErrorCode.VALIDATION_ERROR)
        self.task_job.status = "SUCCESS"
        self.task_job.finished_at = datetime.now(UTC)

    def fail(self, error_message: str) -> None:
        if self.task_job.status not in ("PENDING", "STARTED"):
            raise AppError(
                "Cannot fail a job that is not PENDING or STARTED.", ErrorCode.VALIDATION_ERROR
            )
        self.task_job.status = "FAILURE"
        self.task_job.finished_at = datetime.now(UTC)
        self.task_job.error_message = (
            error_message[: ERROR_MESSAGE_MAX_LENGTH - 3] + "..."
            if len(error_message) > ERROR_MESSAGE_MAX_LENGTH
            else error_message
        )

    def cancel(self) -> None:
        if self.task_job.status not in ("PENDING", "STARTED"):
            raise AppError(
                "Cannot cancel a job that is not PENDING or STARTED.", ErrorCode.VALIDATION_ERROR
            )
        self.task_job.status = "CANCELLED"
        self.task_job.finished_at = datetime.now(UTC)


class BugReportFlow:
    def __init__(self, bug: BugReport) -> None:
        self.bug = bug

    def publish(self) -> None:
        if self.bug.status != "DRAFT":
            raise AppError("Only DRAFT bugs can be published.", ErrorCode.VALIDATION_ERROR)
        self.bug.status = "OPENED"

    def resolve(self) -> None:
        if self.bug.status not in ("OPENED", "REOPENED"):
            raise AppError(
                "Only OPENED or REOPENED bugs can be resolved.", ErrorCode.VALIDATION_ERROR
            )
        self.bug.status = "RESOLVED"

    def reopen(self) -> None:
        if self.bug.status != "RESOLVED":
            raise AppError("Only RESOLVED bugs can be reopened.", ErrorCode.VALIDATION_ERROR)
        self.bug.status = "REOPENED"
