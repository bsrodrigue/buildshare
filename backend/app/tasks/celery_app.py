from __future__ import annotations

from celery import Celery

import app.tasks.binary_processing  # noqa: F401 — register tasks
import app.tasks.email  # noqa: F401 — register tasks
from app.config import settings

celery_app = Celery("buildshare")

celery_app.conf.broker_url = settings.CELERY_BROKER_URL
celery_app.conf.result_backend = settings.CELERY_RESULT_BACKEND
celery_app.conf.broker_connection_retry_on_startup = (
    settings.CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP
)
celery_app.conf.accept_content = ["json"]
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.timezone = "UTC"

# Reliability — ack only after task completes, re-queue on worker loss
celery_app.conf.task_acks_late = True
celery_app.conf.task_reject_on_worker_lost = True

# Retries — exponential backoff, up to 3 attempts
celery_app.conf.task_max_retries = 3
celery_app.conf.task_default_retry_delay = 60
celery_app.conf.task_retry_jitter = True

# Suppress deprecation warning about cancelling tasks on connection loss
celery_app.conf.worker_cancel_long_running_tasks_on_connection_loss = True

celery_app.autodiscover_tasks(["app.tasks"])
