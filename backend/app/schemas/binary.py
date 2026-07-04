from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserRef(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str

    class Config:
        from_attributes = True


class ApplicationOut(BaseModel):
    id: int
    project: int
    project_role: str | None = None
    app_id: str
    title: str
    description: str
    created_at: datetime
    latest_release: dict | None = None

    class Config:
        from_attributes = True


class ApplicationInput(BaseModel):
    project_id: int
    app_id: str
    title: str
    description: str = ""


class ApplicationUpdateInput(BaseModel):
    title: str | None = None
    description: str | None = None


class ReleaseTagOut(BaseModel):
    id: int
    name: str
    color: str

    class Config:
        from_attributes = True


class ReleaseTagInput(BaseModel):
    name: str
    color: str = "#6200EE"


class ArtifactOut(BaseModel):
    id: int
    file: str
    architecture: str
    hash: str
    size: int | None
    file_size_display: str = ""
    download_url: str = ""
    created_at: datetime

    class Config:
        from_attributes = True


class ReleaseOut(BaseModel):
    id: int
    version_code: int
    version_id: str
    release_notes: str
    created_at: datetime
    artifacts: list[ArtifactOut] = []
    bugs_count: int = 0
    open_bugs_count: int = 0
    application: int | None = None
    tags: list[ReleaseTagOut] = []

    class Config:
        from_attributes = True


class ArtifactInput(BaseModel):
    application_id: int
    version_code: int
    version_id: str
    release_notes: str = ""
    architecture: str = ""


class UploadIntentInput(BaseModel):
    project_id: int
    idempotency_key: str | None = None


class UploadIntentOut(BaseModel):
    job_id: UUID
    upload_url: str


class ProcessAPKInput(BaseModel):
    job_id: UUID
    title: str | None = None
    description: str = ""


class TaskJobOut(BaseModel):
    id: UUID
    type: str
    status: str
    status_display: str = ""
    error_message: str
    input_data: dict
    output_data: dict
    app_title: str = ""
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class BugReportOut(BaseModel):
    id: UUID
    release: int
    reporter: UserRef | None = None
    description: str
    status: str
    status_display: str = ""
    messages_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class BugReportInput(BaseModel):
    description: str


class BugReportPatchInput(BaseModel):
    description: str | None = None


class BugMessageOut(BaseModel):
    id: UUID
    user: UserRef | None = None
    text: str
    created_at: datetime

    class Config:
        from_attributes = True


class BugMessageInput(BaseModel):
    text: str


class ReleasePatchInput(BaseModel):
    tag_ids: list[int] | None = None


class MessageOut(BaseModel):
    message: str
