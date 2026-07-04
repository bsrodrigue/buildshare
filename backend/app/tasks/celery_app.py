from __future__ import annotations

import os

from celery import Celery

from app.config import settings

os.environ.setdefault("FASTAPI_SETTINGS_MODULE", "app.config")

celery_app = Celery("buildshare")

celery_app.conf.broker_url = settings.celery_broker_url
celery_app.conf.result_backend = settings.celery_result_backend
celery_app.conf.accept_content = ["json"]
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.timezone = "UTC"

celery_app.autodiscover_tasks(["app.tasks"])
