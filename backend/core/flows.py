from django.utils import timezone
from viewflow import fsm

from .models import TaskJob, TaskJobStatus


class TaskJobFlow:
    """
    Decoupled FSM for TaskJob models.
    Separates state transition logic from the data persistence layer.
    """

    status = fsm.State(TaskJobStatus, default=TaskJobStatus.PENDING)

    def __init__(self, task_job: TaskJob):
        self.task_job = task_job

    @status.getter()
    def _get_status(self):
        return self.task_job.status

    @status.setter()
    def _set_status(self, value):
        self.task_job.status = value

    @status.transition(source=TaskJobStatus.PENDING, target=TaskJobStatus.STARTED)
    def start(self):
        """Transition from PENDING to STARTED."""
        self.task_job.started_at = timezone.now()

    @status.transition(source=TaskJobStatus.STARTED, target=TaskJobStatus.SUCCESS)
    def finish(self):
        """Transition from STARTED to SUCCESS."""
        self.task_job.finished_at = timezone.now()

    @status.transition(source=TaskJobStatus.STARTED, target=TaskJobStatus.FAILURE)
    def fail(self, error_message: str):
        """Transition from STARTED to FAILURE with an error message."""
        self.task_job.finished_at = timezone.now()
        self.task_job.error_message = error_message

    @status.transition(
        source=[TaskJobStatus.PENDING, TaskJobStatus.STARTED],
        target=TaskJobStatus.CANCELLED,
    )
    def cancel(self):
        """Transition to CANCELLED from either PENDING or STARTED."""
        self.task_job.finished_at = timezone.now()

    @status.on_success()
    def _save_task_job(self, descriptor, source, target, **kwargs):
        """
        Auto-save the model after every successful transition.
        Ensures persistence is decoupled from transition logic but still automated.
        """
        self.task_job.save()
