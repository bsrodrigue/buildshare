from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.errors import AppErrorRoute
from app.database import get_db
from app.dependencies import get_current_user, get_storage
from app.models.binary import Application, BugMessage, BugReport, Release
from app.models.user import User
from app.schemas.binary import (
    AnalysisResult,
    ApplicationInput,
    ApplicationOut,
    ApplicationUpdateInput,
    ArtifactInput,
    ArtifactOut,
    BugMessageInput,
    BugMessageOut,
    BugReportInput,
    BugReportOut,
    BugReportPatchInput,
    MessageOut,
    ProcessAPKWithResolution,
    ReleaseOut,
    ReleasePatchInput,
    ReleaseTagInput,
    ReleaseTagOut,
    TaskJobOut,
    UploadIntentInput,
    UploadIntentOut,
    UserRef,
)
from app.services import binary as binary_service
from app.services import task_job as job_service
from app.services.project import get_user_role_in_project, project_find
from app.services.storage import StorageBackend
from app.tasks.binary_processing import process_apk_task

router = APIRouter(prefix="/api/binaries", tags=["binaries"], route_class=AppErrorRoute)

OPEN_BUG_STATUSES = ("OPENED", "REOPENED")


def _missing_param(name: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": "gen_val_001", "message": f"{name} est obligatoire.", "fields": {}},
    )


def _job_uuid(job_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format.") from None


def _user_ref(u: User) -> UserRef:
    return UserRef(id=u.id, email=u.email, first_name=u.first_name, last_name=u.last_name)


def _app_out(db: Session, user: User, app: Application) -> ApplicationOut:
    latest = binary_service.application_latest_release(app)
    return ApplicationOut(
        id=app.id,
        project=app.project_id,
        project_role=get_user_role_in_project(db, user, app.project),
        app_id=app.app_id,
        title=app.title,
        description=app.description,
        created_at=app.created_at,
        latest_release=(
            {"id": latest.id, "version_id": latest.version_id, "created_at": latest.created_at}
            if latest
            else None
        ),
    )


def _release_out(r: Release) -> ReleaseOut:
    return ReleaseOut(
        id=r.id,
        version_code=r.version_code,
        version_id=r.version_id,
        release_notes=r.release_notes,
        created_at=r.created_at,
        artifacts=[_artifact_out(a) for a in r.artifacts],
        bugs_count=len(r.bugs),
        open_bugs_count=sum(b.status in OPEN_BUG_STATUSES for b in r.bugs),
        application=r.application_id,
        tags=[ReleaseTagOut(id=t.id, name=t.name, color=t.color) for t in r.tags],
    )


def _artifact_out(a) -> ArtifactOut:
    return ArtifactOut(
        id=a.id,
        file=a.file_path,
        architecture=a.architecture,
        hash=a.hash,
        size=a.size,
        created_at=a.created_at,
    )


def _bug_out(b: BugReport) -> BugReportOut:
    return BugReportOut(
        id=b.id,
        release=b.release_id,
        reporter=_user_ref(b.reporter) if b.reporter else None,
        description=b.description,
        status=b.status,
        status_display=b.status,
        messages_count=len(b.messages),
        created_at=b.created_at,
    )


def _message_out(m: BugMessage) -> BugMessageOut:
    return BugMessageOut(
        id=m.id, user=_user_ref(m.user) if m.user else None, text=m.text, created_at=m.created_at
    )


# --- Applications ---


@router.get("/applications/", response_model=list[ApplicationOut])
def list_applications(
    project_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not project_id:
        raise _missing_param("project_id")
    apps = binary_service.application_list_for_user(db, user=user, project_id=project_id)
    return [_app_out(db, user, a) for a in apps]


@router.post("/applications/", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    data: ApplicationInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = project_find(db, project_id=data.project_id)
    app = binary_service.application_create(
        db,
        project=project,
        app_id=data.app_id,
        title=data.title,
        description=data.description,
        app_signature=data.app_signature,
        user=user,
    )
    return _app_out(db, user, app)


@router.get("/applications/{application_id}/", response_model=ApplicationOut)
def get_application(
    application_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = binary_service.application_get(db, user=user, application_id=application_id)
    return _app_out(db, user, app)


@router.put("/applications/{application_id}/", response_model=ApplicationOut)
def update_application(
    application_id: int,
    data: ApplicationUpdateInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = binary_service.application_get(db, user=user, application_id=application_id)
    app = binary_service.application_update(
        db,
        application=app,
        title=data.title if data.title is not None else app.title,
        description=data.description if data.description is not None else app.description,
        user=user,
    )
    return _app_out(db, user, app)


@router.delete("/applications/{application_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = binary_service.application_get(db, user=user, application_id=application_id)
    binary_service.application_delete(db, application=app, user=user)


# --- Releases ---


@router.get("/releases/", response_model=list[ReleaseOut])
def list_releases(
    application_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not application_id:
        raise _missing_param("application_id")
    releases = binary_service.release_list(db, user=user, application_id=application_id)
    return [_release_out(r) for r in releases]


@router.get("/releases/{release_id}/", response_model=ReleaseOut)
def get_release(
    release_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _release_out(binary_service.release_get(db, user=user, release_id=release_id))


@router.patch("/releases/{release_id}/", response_model=ReleaseOut)
def patch_release(
    release_id: int,
    data: ReleasePatchInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.tag_ids is not None:
        release = binary_service.release_set_tags(
            db, user=user, release_id=release_id, tag_ids=data.tag_ids
        )
    else:
        release = binary_service.release_get(db, user=user, release_id=release_id)
    return _release_out(release)


# --- Upload / processing jobs ---


@router.post("/upload-intent/", response_model=UploadIntentOut, status_code=status.HTTP_201_CREATED)
def create_upload_intent(
    data: UploadIntentInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
):
    job, upload_url = job_service.upload_intent_create(
        db,
        user=user,
        project_id=data.project_id,
        idempotency_key=data.idempotency_key,
        storage=storage,
    )
    return UploadIntentOut(job_id=job.id, upload_url=upload_url)


@router.post("/upload/{job_id}/", status_code=status.HTTP_204_NO_CONTENT)
def upload_apk_direct(
    job_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
):
    job_service.job_upload(db, user=user, job_id=_job_uuid(job_id), file=file.file, storage=storage)


@router.post("/analyze-apk/{job_id}/", response_model=AnalysisResult)
def analyze_apk(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
):
    return binary_service.binary_analyze(db, user=user, job_id=_job_uuid(job_id), storage=storage)


@router.post("/process-apk/", response_model=MessageOut, status_code=status.HTTP_202_ACCEPTED)
def process_apk(
    data: ProcessAPKWithResolution,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = job_service.job_authorize_processing(db, user=user, job_id=data.job_id)
    process_apk_task.delay(
        job_id=str(job.id),
        resolution=data.resolution.model_dump() if data.resolution else {},
    )
    return MessageOut(message="Tâche démarrée")


@router.get("/jobs/", response_model=list[TaskJobOut])
def list_jobs(
    project_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [
        TaskJobOut(
            id=j.id,
            type=j.type,
            status=j.status,
            status_display=j.status,
            error_message=j.error_message,
            input_data=j.input_data,
            output_data=j.output_data,
            app_title=j.output_data.get("application_title") or j.input_data.get("title") or "",
            started_at=j.started_at,
            finished_at=j.finished_at,
            created_at=j.created_at,
        )
        for j in job_service.job_list(db, user=user, project_id=project_id)
    ]


# --- Bugs ---


@router.get("/releases/{release_id}/bugs/", response_model=list[BugReportOut])
def list_bugs(
    release_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [_bug_out(b) for b in binary_service.bug_list(db, user=user, release_id=release_id)]


@router.post(
    "/releases/{release_id}/bugs/", response_model=BugReportOut, status_code=status.HTTP_201_CREATED
)
def create_bug(
    release_id: int,
    data: BugReportInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release = binary_service.release_find(db, release_id=release_id)
    bug = binary_service.bug_create(db, user=user, release=release, description=data.description)
    return _bug_out(bug)


@router.get("/bugs/{bug_id}/", response_model=BugReportOut)
def get_bug(
    bug_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _bug_out(binary_service.bug_get(db, user=user, bug_id=bug_id))


@router.patch("/bugs/{bug_id}/", response_model=BugReportOut)
def patch_bug(
    bug_id: str,
    data: BugReportPatchInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bug = binary_service.bug_update(db, user=user, bug_id=bug_id, description=data.description)
    return _bug_out(bug)


@router.post("/bugs/{bug_id}/transitions/{transition}/", response_model=BugReportOut)
def transition_bug(
    bug_id: str,
    transition: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bug = binary_service.bug_find(db, bug_id=bug_id)
    bug = binary_service.bug_transition(db, bug=bug, transition_name=transition, user=user)
    return _bug_out(bug)


@router.get("/bugs/{bug_id}/messages/", response_model=list[BugMessageOut])
def list_bug_messages(
    bug_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [_message_out(m) for m in binary_service.bug_message_list(db, user=user, bug_id=bug_id)]


@router.post(
    "/bugs/{bug_id}/messages/", response_model=BugMessageOut, status_code=status.HTTP_201_CREATED
)
def create_bug_message(
    bug_id: str,
    data: BugMessageInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bug = binary_service.bug_find(db, bug_id=bug_id)
    return _message_out(binary_service.bug_message_create(db, bug=bug, user=user, text=data.text))


# --- Tags ---


@router.get("/projects/{project_id}/tags/", response_model=list[ReleaseTagOut])
def list_tags(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tags = binary_service.release_tag_list(db, user=user, project_id=project_id)
    return [ReleaseTagOut(id=t.id, name=t.name, color=t.color) for t in tags]


@router.post(
    "/projects/{project_id}/tags/",
    response_model=ReleaseTagOut,
    status_code=status.HTTP_201_CREATED,
)
def create_tag(
    project_id: int,
    data: ReleaseTagInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tag = binary_service.release_tag_create(
        db, user=user, project_id=project_id, name=data.name, color=data.color
    )
    return ReleaseTagOut(id=tag.id, name=tag.name, color=tag.color)


@router.delete("/tags/{tag_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    binary_service.release_tag_delete(db, user=user, tag_id=tag_id)


# --- Artifacts ---


@router.get("/artifacts/{artifact_id}/download/")
def download_artifact(
    artifact_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    artifact = binary_service.artifact_get(db, user=user, artifact_id=artifact_id)

    for path in (Path("/") / artifact.file_path, Path("media") / artifact.file_path):
        if path.exists():
            return FileResponse(path=path, filename=path.name)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"code": "gen_val_003", "message": "Fichier non trouvé.", "fields": {}},
    )


@router.post("/artifacts/upload/", response_model=ArtifactOut, status_code=status.HTTP_201_CREATED)
def upload_artifact(
    data: ArtifactInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    artifact = binary_service.artifact_upload(
        db,
        user=user,
        application_id=data.application_id,
        version_code=data.version_code,
        version_id=data.version_id,
        release_notes=data.release_notes,
        architecture=data.architecture,
    )
    return _artifact_out(artifact)
