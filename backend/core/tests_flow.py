from django.contrib.auth import get_user_model
from django.test import TestCase

from core.flows import ERROR_MESSAGE_MAX_LENGTH, TaskJobFlow
from core.models import TaskJob, TaskJobStatus, TaskJobType

User = get_user_model()


class TaskJobFlowTest(TestCase):
    def setUp(self) -> None:
        self.user: User = User.objects.create_user(
            email="test@example.com",
            password="password",  # noqa: S106
        )
        self.job: TaskJob = TaskJob.objects.create(
            user=self.user, type=TaskJobType.BINARY_PROCESSING
        )
        self.flow: TaskJobFlow = TaskJobFlow(self.job)

    def test_start_transition(self) -> None:
        self.assertEqual(self.job.status, TaskJobStatus.PENDING)
        self.flow.start()
        self.assertEqual(self.job.status, TaskJobStatus.STARTED)
        self.assertIsNotNone(self.job.started_at)

        # Verify persistence
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, TaskJobStatus.STARTED)

    def test_fail_from_pending(self) -> None:
        """Test that we can fail even if the job hasn't started (New hardening)."""
        self.assertEqual(self.job.status, TaskJobStatus.PENDING)
        self.flow.fail(error_message="Early infrastructure failure")
        self.assertEqual(self.job.status, TaskJobStatus.FAILURE)
        self.assertEqual(self.job.error_message, "Early infrastructure failure")

        self.job.refresh_from_db()
        self.assertEqual(self.job.status, TaskJobStatus.FAILURE)

    def test_fail_from_started(self) -> None:
        self.flow.start()
        self.flow.fail(error_message="Processing failure")
        self.assertEqual(self.job.status, TaskJobStatus.FAILURE)

        self.job.refresh_from_db()
        self.assertEqual(self.job.status, TaskJobStatus.FAILURE)

    def test_error_message_truncation(self) -> None:
        long_message = "A" * 1000
        self.flow.fail(error_message=long_message)
        self.assertTrue(len(self.job.error_message) <= ERROR_MESSAGE_MAX_LENGTH)
        self.assertTrue(self.job.error_message.endswith("..."))
