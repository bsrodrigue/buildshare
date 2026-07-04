from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: UUID
    type: str
    title: str
    body: str
    payload: dict
    read_at: datetime | None
    created_at: datetime
    is_actionable: bool = False

    class Config:
        from_attributes = True


class BulkMarkReadInput(BaseModel):
    notification_ids: list[str]


class CountOut(BaseModel):
    count: int
