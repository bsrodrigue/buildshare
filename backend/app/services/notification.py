from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User


def notification_list(db: Session, *, user: User) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def notification_mark_as_read(db: Session, *, notification: Notification) -> Notification:
    notification.read_at = datetime.now(UTC)
    db.flush()
    return notification


def notification_bulk_mark_as_read(db: Session, *, user: User, notification_ids: list[str]) -> int:
    ids = [uuid.UUID(nid) for nid in notification_ids]
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.id.in_(ids),
            Notification.read_at.is_(None),
        )
        .values(read_at=datetime.now(UTC))
    )
    result = db.execute(stmt)
    db.flush()
    return result.rowcount


def notification_create(
    db: Session,
    *,
    user_id: int,
    type: str,
    title: str,
    body: str = "",
    payload: dict | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        payload=payload or {},
    )
    db.add(notification)
    db.flush()
    return notification
