from __future__ import annotations

from typing import TYPE_CHECKING, Any

from django.db import transaction
from django.utils import timezone

if TYPE_CHECKING:
    from users.models import User

from .models import Notification


@transaction.atomic
def notification_create(
    *, user: User, type: str, title: str, body: str = "", payload: dict[str, Any] | None = None
) -> Notification:
    notification = Notification(user=user, type=type, title=title, body=body, payload=payload or {})
    notification.full_clean()
    notification.save()
    return notification


@transaction.atomic
def notification_mark_as_read(*, notification: Notification) -> Notification:
    # No nested import
    notification.read_at = timezone.now()
    notification.save(update_fields=["read_at"])
    return notification


@transaction.atomic
def notification_bulk_mark_as_read(*, user: User, notification_ids: list[str]) -> int:
    # No nested import
    return Notification.objects.filter(
        user=user, id__in=notification_ids, read_at__isnull=True
    ).update(read_at=timezone.now())
