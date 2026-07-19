from __future__ import annotations

import uuid
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_storage
from app.libs.errors import AppError
from app.models.binary import (
    Application,
    Artifact,
    BugMessage,
    BugReport,
    Release,
    ReleaseTag,
    ReleaseTagAssociation,
)
from app.models.project import Project
from app.models.task_job import TaskJob
from app.models.user import User
from app.schemas.binary import (
    AnalysisResult,
    AppConflictInfo,
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
    ProcessAPKInput,
    ProcessAPKWithResolution,
    ReleaseOut,
    ReleasePatchInput,
    ReleaseTagInput,
    ReleaseTagOut,
    Resolution,
    TaskJobOut,
    UploadIntentInput,
    UploadIntentOut,
    UserRef,
)
from app.services import binary as binary_service
from app.services.project import (
    check_is_project_admin,
    check_is_project_member,
    get_user_role_in_project,
    is_project_member,
)
from app.services.storage import StorageBackend
from app.tasks.binary_processing import process_apk_task
from libs.android import AndroidBinaryDownloader, AndroidBinaryService

router = APIRouter(prefix="/api/binaries", tags=["binaries"])


@router.get("/applications/", response_model=list[ApplicationOut])
def list_applications(
    project_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "gen_val_001",
                "message": "project_id est obligatoire.",
                "fields": {},
            },
        )
    project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "prj_val_001", "message": "Projet non trouvé.", "fields": {}},
        )

    if not is_project_member(db, user=user, project=project):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "auth_val_003",
                "message": "Vous n'êtes pas membre de ce projet.",
                "fields": {},
            },
        )

    apps = binary_service.application_list(db, project=project)
    result = []
    for a in apps:
        latest = db.execute(
            select(Release)
            .where(Release.application_id == a.id)
            .order_by(Release.version_code.desc())
        ).scalar_one_or_none()
        latest_release = None
        if latest:
            latest_release = {
                "id": latest.id,
                "version_id": latest.version_id,
                "created_at": latest.created_at,
            }

        role = get_user_role_in_project(db, user, project)
        result.append(
            ApplicationOut(
                id=a.id,
                project=a.project_id,
                project_role=role,
                app_id=a.app_id,
                title=a.title,
                description=a.description,
                created_at=a.created_at,
                latest_release=latest_release,
            )
        )
    return result


@router.post("/applications/", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    data: ApplicationInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(Project, data.project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "prj_val_001", "message": "Projet non trouvé.", "fields": {}},
        )
    try:
        app = binary_service.application_create(
            db,
            project=project,
            app_id=data.app_id,
            title=data.title,
            description=data.description,
            app_signature=data.app_signature,
            user=user,
        )
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    role = get_user_role_in_project(db, user, project)
    return ApplicationOut(
        id=app.id,
        project=app.project_id,
        project_role=role,
        app_id=app.app_id,
        title=app.title,
        description=app.description,
        created_at=app.created_at,
        latest_release=None,
    )


@router.get("/applications/{application_id}/", response_model=ApplicationOut)
def get_application(
    application_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        app = binary_service.application_get(db, user=user, application_id=application_id)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    latest = db.execute(
        select(Release)
        .where(Release.application_id == app.id)
        .order_by(Release.version_code.desc())
    ).scalar_one_or_none()
    latest_release = None
    if latest:
        latest_release = {
            "id": latest.id,
            "version_id": latest.version_id,
            "created_at": latest.created_at,
        }

    project = db.get(Project, app.project_id)
    role = get_user_role_in_project(db, user, project) if project else None

    return ApplicationOut(
        id=app.id,
        project=app.project_id,
        project_role=role,
        app_id=app.app_id,
        title=app.title,
        description=app.description,
        created_at=app.created_at,
        latest_release=latest_release,
    )


@router.put("/applications/{application_id}/", response_model=ApplicationOut)
def update_application(
    application_id: int,
    data: ApplicationUpdateInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        app = binary_service.application_get(db, user=user, application_id=application_id)
        title = data.title if data.title is not None else app.title
        desc = data.description if data.description is not None else app.description
        app = binary_service.application_update(
            db, application=app, title=title, description=desc, user=user
        )
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    project = db.get(Project, app.project_id)
    role = get_user_role_in_project(db, user, project) if project else None
    return ApplicationOut(
        id=app.id,
        project=app.project_id,
        project_role=role,
        app_id=app.app_id,
        title=app.title,
        description=app.description,
        created_at=app.created_at,
    )


@router.delete("/applications/{application_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        app = binary_service.application_get(db, user=user, application_id=application_id)
        binary_service.application_delete(db, application=app, user=user)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e


@router.get("/releases/", response_model=list[ReleaseOut])
def list_releases(
    application_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not application_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "gen_val_001",
                "message": "application_id est obligatoire.",
                "fields": {},
            },
        )

    application = db.execute(
        select(Application).join(Project).where(Application.id == application_id)
    ).scalar_one_or_none()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "bin_val_001", "message": "Application non trouvée.", "fields": {}},
        )

    project = db.get(Project, application.project_id)
    if not is_project_member(db, user=user, project=project):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "auth_val_003",
                "message": "Vous n'êtes pas membre de ce projet.",
                "fields": {},
            },
        )

    stmt = (
        select(Release)
        .where(Release.application_id == application_id)
        .order_by(Release.version_code.desc())
    )
    releases = list(db.execute(stmt).scalars().all())

    result = []
    for r in releases:
        artifacts = db.execute(select(Artifact).where(Artifact.release_id == r.id)).scalars().all()

        bug_count = db.execute(select(BugReport).where(BugReport.release_id == r.id)).all()
        bug_count_total = len(bug_count)
        bug_count_open = db.execute(
            select(BugReport).where(
                BugReport.release_id == r.id,
                BugReport.status.in_(["OPENED", "REOPENED"]),
            )
        ).all()
        bug_count_open_total = len(bug_count_open)

        tag_assocs = (
            db.execute(
                select(ReleaseTagAssociation).where(ReleaseTagAssociation.release_id == r.id)
            )
            .scalars()
            .all()
        )
        tags = []
        for ta in tag_assocs:
            tag = db.get(ReleaseTag, ta.releasetag_id)
            if tag:
                tags.append(ReleaseTagOut(id=tag.id, name=tag.name, color=tag.color))

        result.append(
            ReleaseOut(
                id=r.id,
                version_code=r.version_code,
                version_id=r.version_id,
                release_notes=r.release_notes,
                created_at=r.created_at,
                artifacts=[
                    ArtifactOut(
                        id=a.id,
                        file=a.file_path,
                        architecture=a.architecture,
                        hash=a.hash,
                        size=a.size,
                        created_at=a.created_at,
                    )
                    for a in artifacts
                ],
                bugs_count=bug_count_total,
                open_bugs_count=bug_count_open_total,
                application=r.application_id,
                tags=tags,
            )
        )
    return result


@router.get("/releases/{release_id}/", response_model=ReleaseOut)
def get_release(
    release_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release = db.execute(
        select(Release).join(Application).join(Project).where(Release.id == release_id)
    ).scalar_one_or_none()

    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Release non trouvée.", "fields": {}},
        )

    if not is_project_member(db, user=user, project=release.application.project):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "auth_val_003",
                "message": "Vous n'êtes pas membre de ce projet.",
                "fields": {},
            },
        )

    artifacts = (
        db.execute(select(Artifact).where(Artifact.release_id == release.id)).scalars().all()
    )

    tag_assocs = (
        db.execute(
            select(ReleaseTagAssociation).where(ReleaseTagAssociation.release_id == release.id)
        )
        .scalars()
        .all()
    )
    tags = []
    for ta in tag_assocs:
        tag = db.get(ReleaseTag, ta.releasetag_id)
        if tag:
            tags.append(ReleaseTagOut(id=tag.id, name=tag.name, color=tag.color))

    return ReleaseOut(
        id=release.id,
        version_code=release.version_code,
        version_id=release.version_id,
        release_notes=release.release_notes,
        created_at=release.created_at,
        artifacts=[
            ArtifactOut(
                id=a.id,
                file=a.file_path,
                architecture=a.architecture,
                hash=a.hash,
                size=a.size,
                created_at=a.created_at,
            )
            for a in artifacts
        ],
        application=release.application_id,
        tags=tags,
    )


@router.patch("/releases/{release_id}/", response_model=ReleaseOut)
def patch_release(
    release_id: int,
    data: ReleasePatchInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release = db.execute(
        select(Release).join(Application).join(Project).where(Release.id == release_id)
    ).scalar_one_or_none()

    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Release non trouvée.", "fields": {}},
        )

    check_is_project_admin(db, user=user, project=release.application.project)

    if data.tag_ids is not None:
        # Remove existing associations
        db.execute(
            select(ReleaseTagAssociation).where(ReleaseTagAssociation.release_id == release.id)
        ).scalars().all()

        if data.tag_ids:
            # We need to handle this via raw delete + insert approach
            stmt_del = ReleaseTagAssociation.__table__.delete().where(
                ReleaseTagAssociation.release_id == release.id
            )
            db.execute(stmt_del)
            for tag_id in data.tag_ids:
                assoc = ReleaseTagAssociation(release_id=release.id, releasetag_id=tag_id)
                db.add(assoc)
        db.flush()

    return get_release(release_id, user, db)


@router.post("/upload-intent/", response_model=UploadIntentOut, status_code=status.HTTP_201_CREATED)
def create_upload_intent(
    data: UploadIntentInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
):
    project = db.get(Project, data.project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "prj_val_001", "message": "Projet non trouvé.", "fields": {}},
        )

    try:
        check_is_project_admin(db, user=user, project=project)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    # Idempotency check
    job = None
    if data.idempotency_key:
        job = db.execute(
            select(TaskJob).where(
                TaskJob.user_id == user.id,
                TaskJob.type == "BINARY_PROCESSING",
                TaskJob.idempotency_key == data.idempotency_key,
            )
        ).scalar_one_or_none()

    if not job:
        job = TaskJob(
            user_id=user.id,
            type="BINARY_PROCESSING",
            idempotency_key=data.idempotency_key,
        )
        db.add(job)
        db.flush()

    key = f"uploads/{job.id}.apk"
    upload_url = storage.presigned_upload_url(key)

    job.input_data = {"r2_path": key, "project_id": data.project_id}
    db.flush()

    return UploadIntentOut(job_id=job.id, upload_url=upload_url)


@router.post("/upload/{job_id}/", status_code=status.HTTP_204_NO_CONTENT)
def upload_apk_direct(
    job_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
):
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format.") from None
    job = db.execute(
        select(TaskJob).where(
            TaskJob.id == job_uuid,
            TaskJob.user_id == user.id,
            TaskJob.type == "BINARY_PROCESSING",
        )
    ).scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Tâche non trouvée.", "fields": {}},
        )

    key = f"uploads/{job.id}.apk"
    storage.upload(file.file, key)
    job.input_data = {**job.input_data, "r2_path": key}
    db.flush()


@router.post("/analyze-apk/{job_id}/", response_model=AnalysisResult)
def analyze_apk(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
):
    try:
        job_uuid = uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format.")
    job = db.execute(
        select(TaskJob).where(
            TaskJob.id == job_uuid,
            TaskJob.user_id == user.id,
            TaskJob.type == "BINARY_PROCESSING",
        )
    ).scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Tâche non trouvée.", "fields": {}},
        )

    project_id = job.input_data.get("project_id")
    r2_path = job.input_data.get("r2_path")
    if not project_id or not r2_path:
        raise HTTPException(status_code=400, detail="Job input data incomplete.")

    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    try:
        check_is_project_admin(db, user=user, project=project)
    except AppError as e:
        raise HTTPException(status_code=403, detail=e.message) from e

    downloader = AndroidBinaryDownloader()
    binary_service = AndroidBinaryService()

    tmp_path = downloader.download(storage, r2_path)
    try:
        metadata = binary_service.parse_metadata(tmp_path)
    finally:
        if tmp_path.exists():
            tmp_path.unlink()

    package_name = metadata.package_name
    signature = metadata.signature_hash
    version_code = metadata.version_code
    file_hash = metadata.file_hash
    architecture = metadata.architecture

    existing_apps = list(
        db.execute(
            select(Application).where(
                Application.project_id == project_id,
                Application.app_id == package_name,
            )
        ).scalars().all()
    )

    matching_app = None
    sibling_apps: list[AppConflictInfo] = []
    app_id_exists = len(existing_apps) > 0
    signature_matches: bool | None = None

    for app in existing_apps:
        info = AppConflictInfo(
            app_id=app.id, title=app.title, app_signature=app.app_signature, tag=app.tag
        )
        if app.app_signature == signature:
            matching_app = info
            signature_matches = True
        elif app.app_signature is not None and app.app_signature != signature:
            sibling_apps.append(info)

    if app_id_exists and signature_matches is None:
        signature_matches = False

    existing_release = None
    version_code_exists = False
    architecture_exists = False
    hash_exists = False

    if matching_app:
        existing_release = db.execute(
            select(Release).where(
                Release.application_id == matching_app.app_id,
                Release.version_code == version_code,
            )
        ).scalar_one_or_none()
        if existing_release:
            version_code_exists = True
            existing_arch = db.execute(
                select(Artifact).where(
                    Artifact.release_id == existing_release.id,
                    Artifact.architecture == architecture,
                )
            ).scalar_one_or_none()
            if existing_arch:
                architecture_exists = True
            existing_hash = db.execute(
                select(Artifact).where(
                    Artifact.release_id == existing_release.id,
                    Artifact.hash == file_hash,
                )
            ).scalar_one_or_none()
            if existing_hash:
                hash_exists = True

    decisions_needed: list[str] = []
    if app_id_exists and signature_matches is False:
        decisions_needed.append("app_conflict_signature")
    if version_code_exists and hash_exists:
        decisions_needed.append("artifact_duplicate")

    return AnalysisResult(
        job_id=job.id,
        package_name=package_name,
        version_code=version_code,
        version_name=metadata.version_name,
        architecture=architecture,
        hash=file_hash,
        signature=signature,
        is_debuggable=metadata.is_debuggable,
        file_size=metadata.file_size,
        app_id_exists=app_id_exists,
        signature_matches=signature_matches,
        existing_app=matching_app,
        sibling_apps=sibling_apps,
        version_code_exists=version_code_exists,
        architecture_exists=architecture_exists,
        hash_exists=hash_exists,
        decisions_needed=decisions_needed,
    )


@router.post("/process-apk/", response_model=MessageOut, status_code=status.HTTP_202_ACCEPTED)
def process_apk(
    data: ProcessAPKWithResolution,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.execute(
        select(TaskJob).where(
            TaskJob.id == data.job_id,
            TaskJob.user_id == user.id,
            TaskJob.type == "BINARY_PROCESSING",
        )
    ).scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Tâche non trouvée.", "fields": {}},
        )

    project_id = job.input_data.get("project_id")
    if project_id:
        project = db.get(Project, project_id)
        if project:
            try:
                check_is_project_admin(db, user=user, project=project)
            except AppError as e:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": e.code, "message": e.message, "fields": {}},
                ) from e

    resolution_data = data.resolution.model_dump() if data.resolution else {}
    process_apk_task.delay(
        job_id=str(job.id),
        resolution=resolution_data,
    )

    return MessageOut(message="Tâche démarrée")


@router.get("/jobs/", response_model=list[TaskJobOut])
def list_jobs(
    project_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(TaskJob).where(TaskJob.user_id == user.id)
    if project_id:
        stmt = stmt.where(TaskJob.input_data["project_id"].as_integer() == project_id)
    stmt = stmt.order_by(TaskJob.created_at.desc())
    jobs = list(db.execute(stmt).scalars().all())

    result = []
    for j in jobs:
        app_title = j.output_data.get("application_title") or j.input_data.get("title") or ""
        result.append(
            TaskJobOut(
                id=j.id,
                type=j.type,
                status=j.status,
                status_display=j.status,
                error_message=j.error_message,
                input_data=j.input_data,
                output_data=j.output_data,
                app_title=app_title,
                started_at=j.started_at,
                finished_at=j.finished_at,
                created_at=j.created_at,
            )
        )
    return result


@router.get("/releases/{release_id}/bugs/", response_model=list[BugReportOut])
def list_bugs(
    release_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release = db.execute(select(Release).where(Release.id == release_id)).scalar_one_or_none()
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Release non trouvée.", "fields": {}},
        )

    if not is_project_member(db, user=user, project=release.application.project):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "auth_val_003",
                "message": "Vous n'êtes pas membre de ce projet.",
                "fields": {},
            },
        )

    stmt = select(BugReport).where(BugReport.release_id == release_id)
    bugs = list(db.execute(stmt).scalars().all())

    result = []
    for b in bugs:
        reporter = db.get(User, b.reporter_id)
        user_ref = (
            UserRef(
                id=reporter.id,
                email=reporter.email,
                first_name=reporter.first_name,
                last_name=reporter.last_name,
            )
            if reporter
            else None
        )
        mc = len(list(db.execute(select(BugMessage).where(BugMessage.bug_id == b.id)).all()))
        result.append(
            BugReportOut(
                id=b.id,
                release=b.release_id,
                reporter=user_ref,
                description=b.description,
                status=b.status,
                status_display=b.status,
                messages_count=mc,
                created_at=b.created_at,
            )
        )
    return result


@router.post(
    "/releases/{release_id}/bugs/", response_model=BugReportOut, status_code=status.HTTP_201_CREATED
)
def create_bug(
    release_id: int,
    data: BugReportInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release = db.execute(select(Release).where(Release.id == release_id)).scalar_one_or_none()
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Release non trouvée.", "fields": {}},
        )

    try:
        bug = binary_service.bug_create(
            db, user=user, release=release, description=data.description
        )
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    return BugReportOut(
        id=bug.id,
        release=bug.release_id,
        reporter=UserRef(
            id=user.id, email=user.email, first_name=user.first_name, last_name=user.last_name
        ),
        description=bug.description,
        status=bug.status,
        status_display=bug.status,
        created_at=bug.created_at,
    )


@router.get("/bugs/{bug_id}/", response_model=BugReportOut)
def get_bug(
    bug_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bug = db.execute(select(BugReport).where(BugReport.id == bug_id)).scalar_one_or_none()
    if not bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Bug non trouvé.", "fields": {}},
        )

    if not is_project_member(db, user=user, project=bug.release.application.project):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "auth_val_003",
                "message": "Vous n'êtes pas membre de ce projet.",
                "fields": {},
            },
        )

    reporter = db.get(User, bug.reporter_id)
    user_ref = (
        UserRef(
            id=reporter.id,
            email=reporter.email,
            first_name=reporter.first_name,
            last_name=reporter.last_name,
        )
        if reporter
        else None
    )
    mc = len(list(db.execute(select(BugMessage).where(BugMessage.bug_id == bug.id)).all()))

    return BugReportOut(
        id=bug.id,
        release=bug.release_id,
        reporter=user_ref,
        description=bug.description,
        status=bug.status,
        status_display=bug.status,
        messages_count=mc,
        created_at=bug.created_at,
    )


@router.patch("/bugs/{bug_id}/", response_model=BugReportOut)
def patch_bug(
    bug_id: str,
    data: BugReportPatchInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bug = db.execute(select(BugReport).where(BugReport.id == bug_id)).scalar_one_or_none()
    if not bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Bug non trouvé.", "fields": {}},
        )

    if data.description is not None:
        bug.description = data.description
        db.flush()

    reporter = db.get(User, bug.reporter_id)
    user_ref = (
        UserRef(
            id=reporter.id,
            email=reporter.email,
            first_name=reporter.first_name,
            last_name=reporter.last_name,
        )
        if reporter
        else None
    )

    return BugReportOut(
        id=bug.id,
        release=bug.release_id,
        reporter=user_ref,
        description=bug.description,
        status=bug.status,
        status_display=bug.status,
        created_at=bug.created_at,
    )


@router.post("/bugs/{bug_id}/transitions/{transition}/", response_model=BugReportOut)
def transition_bug(
    bug_id: str,
    transition: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bug = db.execute(select(BugReport).where(BugReport.id == bug_id)).scalar_one_or_none()
    if not bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Bug non trouvé.", "fields": {}},
        )

    try:
        bug = binary_service.bug_transition(db, bug=bug, transition_name=transition, user=user)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    reporter = db.get(User, bug.reporter_id)
    user_ref = (
        UserRef(
            id=reporter.id,
            email=reporter.email,
            first_name=reporter.first_name,
            last_name=reporter.last_name,
        )
        if reporter
        else None
    )

    return BugReportOut(
        id=bug.id,
        release=bug.release_id,
        reporter=user_ref,
        description=bug.description,
        status=bug.status,
        status_display=bug.status,
        created_at=bug.created_at,
    )


@router.get("/bugs/{bug_id}/messages/", response_model=list[BugMessageOut])
def list_bug_messages(
    bug_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bug = db.execute(select(BugReport).where(BugReport.id == bug_id)).scalar_one_or_none()
    if not bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Bug non trouvé.", "fields": {}},
        )

    stmt = select(BugMessage).where(BugMessage.bug_id == bug.id).order_by(BugMessage.created_at)
    messages = list(db.execute(stmt).scalars().all())

    result = []
    for m in messages:
        msg_user = db.get(User, m.user_id)
        user_ref = (
            UserRef(
                id=msg_user.id,
                email=msg_user.email,
                first_name=msg_user.first_name,
                last_name=msg_user.last_name,
            )
            if msg_user
            else None
        )
        result.append(BugMessageOut(id=m.id, user=user_ref, text=m.text, created_at=m.created_at))
    return result


@router.post(
    "/bugs/{bug_id}/messages/", response_model=BugMessageOut, status_code=status.HTTP_201_CREATED
)
def create_bug_message(
    bug_id: str,
    data: BugMessageInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bug = db.execute(select(BugReport).where(BugReport.id == bug_id)).scalar_one_or_none()
    if not bug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Bug non trouvé.", "fields": {}},
        )

    try:
        message = binary_service.bug_message_create(db, bug=bug, user=user, text=data.text)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    return BugMessageOut(
        id=message.id,
        user=UserRef(
            id=user.id, email=user.email, first_name=user.first_name, last_name=user.last_name
        ),
        text=message.text,
        created_at=message.created_at,
    )


@router.get("/projects/{project_id}/tags/", response_model=list[ReleaseTagOut])
def list_tags(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "prj_val_001", "message": "Projet non trouvé.", "fields": {}},
        )

    if not is_project_member(db, user=user, project=project):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "auth_val_003",
                "message": "Vous n'êtes pas membre de ce projet.",
                "fields": {},
            },
        )

    stmt = select(ReleaseTag).where(ReleaseTag.project_id == project_id)
    tags = list(db.execute(stmt).scalars().all())
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
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "prj_val_001", "message": "Projet non trouvé.", "fields": {}},
        )

    try:
        check_is_project_admin(db, user=user, project=project)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    tag = binary_service.release_tag_create(db, project=project, name=data.name, color=data.color)
    return ReleaseTagOut(id=tag.id, name=tag.name, color=tag.color)


@router.delete("/tags/{tag_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tag = db.get(ReleaseTag, tag_id)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Tag non trouvé.", "fields": {}},
        )

    try:
        check_is_project_admin(db, user=user, project=tag.project)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    db.delete(tag)
    db.flush()


@router.get("/artifacts/{artifact_id}/download/")
def download_artifact(
    artifact_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    artifact = db.get(Artifact, artifact_id)
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "gen_val_003", "message": "Artifact non trouvé.", "fields": {}},
        )

    check_is_project_member(db, user=user, project=artifact.release.application.project)

    file_path = Path("/") / artifact.file_path
    if file_path.exists():
        return FileResponse(path=file_path, filename=file_path.name)

    # Try relative to media
    media_path = Path("media") / artifact.file_path
    if media_path.exists():
        return FileResponse(path=media_path, filename=media_path.name)

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
    app = db.get(Application, data.application_id)
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "bin_val_001", "message": "Application non trouvée.", "fields": {}},
        )

    try:
        check_is_project_admin(db, user=user, project=app.project)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    release = db.execute(
        select(Release).where(
            Release.application_id == data.application_id,
            Release.version_code == data.version_code,
        )
    ).scalar_one_or_none()

    if not release:
        release = binary_service.release_create(
            db,
            application=app,
            version_code=data.version_code,
            version_id=data.version_id,
            release_notes=data.release_notes,
            user=user,
        )

    artifact = binary_service.artifact_create(
        db,
        release=release,
        file_path="",
        architecture=data.architecture,
        hash="",
        size=None,
        user=user,
    )

    return ArtifactOut(
        id=artifact.id,
        file=artifact.file_path,
        architecture=artifact.architecture,
        hash=artifact.hash,
        size=artifact.size,
        created_at=artifact.created_at,
    )
