from django.utils import timezone
from viewflow import fsm

from .api.mapping import get_error_message
from .models import TaskJob, TaskJobStatus

ERROR_MESSAGE_MAX_LENGTH = 500


class TaskJobFlow:
    """
    Decoupled FSM for TaskJob models.
    Separates state transition logic from the data persistence layer.
    """

    status = fsm.State(TaskJobStatus, default=TaskJobStatus.PENDING)

    def __init__(self, task_job: TaskJob) -> None:
        self.task_job = task_job

    @status.getter()  # type: ignore[misc]
    def _get_status(self) -> str:
        return str(self.task_job.status)

    @status.setter()  # type: ignore[misc]
    def _set_status(self, value: str) -> None:
        self.task_job.status = value

    @status.transition(source=TaskJobStatus.PENDING, target=TaskJobStatus.STARTED)  # type: ignore[misc]
    def start(self) -> None:
        """Transition from PENDING to STARTED."""
        self.task_job.started_at = timezone.now()

    @status.transition(source=TaskJobStatus.STARTED, target=TaskJobStatus.SUCCESS)  # type: ignore[misc]
    def finish(self) -> None:
        """Transition from STARTED to SUCCESS."""
        self.task_job.finished_at = timezone.now()

    @status.transition(  # type: ignore[misc]
        source=[TaskJobStatus.PENDING, TaskJobStatus.STARTED], target=TaskJobStatus.FAILURE
    )
    def fail(self, error_message: str) -> None:
        """Transition to FAILURE with an error message."""
        self.task_job.finished_at = timezone.now()

        # Standardize the error message if it's a DB error
        # We wrap in Exception to trigger mapping logic if it's a string from a generic exception
        clean_message = get_error_message(Exception(error_message), fallback=error_message)

        # Truncate error message if needed (keeping it safe for DB)
        self.task_job.error_message = (
            (clean_message[: ERROR_MESSAGE_MAX_LENGTH - 3] + "...")
            if len(clean_message) > ERROR_MESSAGE_MAX_LENGTH
            else clean_message
        )

    @status.transition(  # type: ignore[misc]
        source=[TaskJobStatus.PENDING, TaskJobStatus.STARTED],
        target=TaskJobStatus.CANCELLED,
    )
    def cancel(self) -> None:
        """Transition to CANCELLED from either PENDING or STARTED."""
        self.task_job.finished_at = timezone.now()

    @status.on_success()  # type: ignore[misc]
    def _save_task_job(
        self, _descriptor: object, _source: object, _target: object, **_kwargs: object
    ) -> None:
        """
        Auto-save the model after every successful transition.
        Ensures persistence is decoupled from transition logic but still automated.
        """
        self.task_job.save()
