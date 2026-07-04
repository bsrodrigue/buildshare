from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProjectOut(BaseModel):
    id: int
    title: str
    description: str
    created_at: datetime
    role: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ProjectInput(BaseModel):
    title: str
    description: str = ""


class ProjectInvitationInput(BaseModel):
    email: str
    role: str = "MEMBER"


class ProjectInvitationOut(BaseModel):
    id: UUID
    project: int
    project_title: str
    email: str
    role: str
    inviter: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberOut(BaseModel):
    user_id: int
    email: str
    first_name: str
    last_name: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StatusOut(BaseModel):
    status: str
