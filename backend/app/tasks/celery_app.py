from __future__ import annotations

import os

from celery import Celery

from app.config import settings

os.environ.setdefault("FASTAPI_SETTINGS_MODULE", "app.config")

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

celery_app.autodiscover_tasks(["app.tasks"])
