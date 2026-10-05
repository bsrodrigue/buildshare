from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.libs.errors import AppError, ErrorCode
from app.models.notification import Notification
from app.models.user import User
from app.services.project import invitation_find


def notification_list(db: Session, *, user: User) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def notification_is_actionable(db: Session, *, notification: Notification) -> bool:
    if notification.type != "PROJECT_INVITATION" or not notification.payload:
        return False
    invitation_id = notification.payload.get("invitation_id")
    if not invitation_id:
        return False
    invitation = invitation_find(db, invitation_id=UUID(invitation_id), missing_ok=True)
    return (
        invitation is not None
        and invitation.status == "PENDING"
        and (datetime.now(UTC) - invitation.created_at).days <= 7
    )


def notification_mark_as_read(db: Session, *, user: User, notification_id: str) -> Notification:
    notification = db.execute(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        )
    ).scalar_one_or_none()
    if not notification:
        raise AppError("Notification non trouvée.", ErrorCode.RESOURCE_NOT_FOUND)
    notification.read_at = datetime.now(UTC)
    db.flush()
    return notification


def notification_bulk_mark_as_read(db: Session, *, user: User, notification_ids: list[str]) -> int:
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.id.in_(notification_ids),
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
