from viewflow import fsm

from .models import BugReport, BugStatus


class BugReportFlow:
    """
    FSM for BugReport lifecycle management.
    """

    status = fsm.State(BugStatus, default=BugStatus.DRAFT)

    def __init__(self, bug: BugReport) -> None:
        self.bug = bug

    @status.getter()  # type: ignore[untyped-decorator]
    def _get_status(self) -> str:
        return str(self.bug.status)

    @status.setter()  # type: ignore[untyped-decorator]
    def _set_status(self, value: str) -> None:
        self.bug.status = value

    @status.transition(source=BugStatus.DRAFT, target=BugStatus.OPENED)  # type: ignore[untyped-decorator]
    def publish(self) -> None:
        """Transition from DRAFT to OPENED."""
        pass

    @status.transition(source=[BugStatus.OPENED, BugStatus.REOPENED], target=BugStatus.RESOLVED)  # type: ignore[untyped-decorator]
    def resolve(self) -> None:
        """Transition to RESOLVED."""
        pass

    @status.transition(source=BugStatus.RESOLVED, target=BugStatus.REOPENED)  # type: ignore[untyped-decorator]
    def reopen(self) -> None:
        """Transition from RESOLVED back to REOPENED."""
        pass

    @status.on_success()  # type: ignore[untyped-decorator]
    def _save_bug(
        self, _descriptor: object, _source: object, _target: object, **_kwargs: object
    ) -> None:
        """Auto-save the model after every successful transition."""
        self.bug.save()
