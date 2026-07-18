from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification
from app.models.project import ProjectInvitation
from app.models.user import User
from app.schemas.notification import BulkMarkReadInput, CountOut, NotificationOut
from app.services import notification as notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/", response_model=list[NotificationOut])
def list_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifications = notification_service.notification_list(db, user=user)

    result = []
    for n in notifications:
        is_actionable = False
        if n.type == "PROJECT_INVITATION" and n.payload:
            invitation_id = n.payload.get("invitation_id")
            if invitation_id:
                invitation = db.execute(
                    select(ProjectInvitation).where(ProjectInvitation.id == UUID(invitation_id))
                ).scalar_one_or_none()
                if invitation and invitation.status == "PENDING":
                    days_diff = (datetime.now(UTC) - invitation.created_at).days
                    if days_diff <= 7:
                        is_actionable = True

        result.append(
            NotificationOut(
                id=n.id,
                type=n.type,
                title=n.title,
                body=n.body,
                payload=n.payload,
                read_at=n.read_at,
                created_at=n.created_at,
                is_actionable=is_actionable,
            )
        )
    return result


@router.post("/{notification_id}/mark_as_read/", status_code=status.HTTP_204_NO_CONTENT)
def mark_as_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
    ).scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "gen_val_003",
                "message": "Notification non trouvée.",
                "fields": {},
            },
        )

    notification_service.notification_mark_as_read(db, notification=notification)


@router.post("/bulk_mark_as_read/", response_model=CountOut)
def bulk_mark_as_read(
    data: BulkMarkReadInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = notification_service.notification_bulk_mark_as_read(
        db, user=user, notification_ids=data.notification_ids
    )
    return CountOut(count=count)
