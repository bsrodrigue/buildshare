from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.errors import AppErrorRoute
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import BulkMarkReadInput, CountOut, NotificationOut
from app.services import notification as notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"], route_class=AppErrorRoute)


@router.get("/", response_model=list[NotificationOut])
def list_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [
        NotificationOut(
            id=n.id,
            type=n.type,
            title=n.title,
            body=n.body,
            payload=n.payload,
            read_at=n.read_at,
            created_at=n.created_at,
            is_actionable=notification_service.notification_is_actionable(db, notification=n),
        )
        for n in notification_service.notification_list(db, user=user)
    ]


@router.post("/{notification_id}/mark_as_read/", status_code=status.HTTP_204_NO_CONTENT)
def mark_as_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification_service.notification_mark_as_read(
        db, user=user, notification_id=notification_id
    )


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
