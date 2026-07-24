from __future__ import annotations

import logging

from celery import shared_task

from app.services.email import (
    send_account_activated_email,
    send_otp_email,
)

logger = logging.getLogger(__name__)


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=60,
    retry_jitter=True,
    acks_late=True,
)
def send_otp_email_task(
    to_email: str,
    otp_code: str,
    user_name: str = "",
) -> None:
    send_otp_email(to_email=to_email, otp_code=otp_code, user_name=user_name)


@shared_task(
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=60,
    retry_jitter=True,
    acks_late=True,
)
def send_account_activated_email_task(
    to_email: str,
    user_name: str = "",
) -> None:
    send_account_activated_email(to_email=to_email, user_name=user_name)
