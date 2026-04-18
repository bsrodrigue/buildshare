"""
Constraint names for the Core models.
"""

# CheckConstraint names
CHECK_TASK_JOB_STARTED_AFTER_CREATED = "check_started_after_created"
CHECK_TASK_JOB_FINISHED_AFTER_STARTED = "check_finished_after_started"
CHECK_TASK_JOB_ERROR_ON_FAILURE = "check_error_on_failure"

# UniqueConstraint names
UNIQUE_TASK_JOB_USER_TASK_IDEMPOTENCY = "unique_user_task_idempotency"
