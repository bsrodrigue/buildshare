from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.libs.errors import AppError, ErrorCode
from app.libs.flows import BugReportFlow
from app.models.binary import (
    Application,
    Artifact,
    BugMessage,
    BugReport,
    Release,
    ReleaseTag,
    ReleaseTagAssociation,
)
from app.models.notification import Notification
from app.models.project import Project, UserProjectProfile
from app.models.user import User
from app.schemas.binary import AnalysisResult, AppConflictInfo
from app.services.project import check_is_project_admin, check_is_project_member, project_find
from app.services.storage import StorageBackend
from app.services.task_job import job_find
from libs.android import AndroidBinaryDownloader, AndroidBinaryService


def application_list(db: Session, *, project: Project) -> list[Application]:
    stmt = select(Application).where(Application.project_id == project.id)
    return list(db.execute(stmt).scalars().all())


def application_list_for_user(db: Session, *, user: User, project_id: int) -> list[Application]:
    project = project_find(db, project_id=project_id)
    check_is_project_member(db, user=user, project=project)
    return application_list(db, project=project)


def application_latest_release(application: Application) -> Release | None:
    return max(application.releases, key=lambda r: r.version_code, default=None)


def application_get(db: Session, *, user: User, application_id: int) -> Application:
    app = db.execute(
        select(Application)
        .join(Project)
        .join(UserProjectProfile)
        .where(
            Application.id == application_id,
            UserProjectProfile.user_id == user.id,
        )
    ).scalar_one_or_none()
    if not app:
        raise AppError("Application non trouvée.", ErrorCode.APP_NOT_FOUND)
    return app


def application_create(
    db: Session, *, project: Project, app_id: str, title: str, description: str, user: User,
    app_signature: str | None = None,
) -> Application:
    check_is_project_admin(db, user=user, project=project)

    app = Application(
        project_id=project.id,
        app_id=app_id,
        title=title,
        description=description,
        app_signature=app_signature,
    )
    db.add(app)
    db.flush()

    notify_project_members(
        db,
        project_id=project.id,
        type="APPLICATION_CREATED",
        title="Nouvelle application",
        body=f"{user.first_name or user.email} a créé l'application {app.title}.",
        exclude_user_id=user.id,
        payload={"application_id": app.id},
    )

    return app


def application_update(
    db: Session, *, application: Application, title: str, description: str, user: User
) -> Application:
    check_is_project_admin(db, user=user, project=application.project)

    application.title = title
    application.description = description
    db.flush()

    return application


def application_delete(db: Session, *, application: Application, user: User) -> None:
    check_is_project_admin(db, user=user, project=application.project)

    notify_project_members(
        db,
        project_id=application.project_id,
        type="APPLICATION_DELETED",
        title="Application supprimée",
        body=f"{user.first_name or user.email} a supprimé l'application {application.title}.",
        exclude_user_id=user.id,
    )

    db.delete(application)
    db.flush()


def release_create(
    db: Session,
    *,
    application: Application,
    version_code: int,
    version_id: str,
    release_notes: str,
    user: User,
) -> Release:
    check_is_project_admin(db, user=user, project=application.project)

    release = Release(
        application_id=application.id,
        version_code=version_code,
        version_id=version_id,
        release_notes=release_notes,
    )
    db.add(release)
    db.flush()

    notify_project_members(
        db,
        project_id=application.project_id,
        type="NEW_RELEASE",
        title="Nouvelle release disponible",
        body=f"Une nouvelle version ({release.version_id}) de {application.title} est disponible.",
        exclude_user_id=user.id,
        payload={"application_id": application.id, "release_id": release.id},
    )

    return release


def artifact_create(
    db: Session,
    *,
    release: Release,
    file_path: str,
    architecture: str,
    hash: str,
    size: int | None,
    user: User,
) -> Artifact:
    check_is_project_admin(db, user=user, project=release.application.project)

    artifact = Artifact(
        release_id=release.id,
        file_path=file_path,
        architecture=architecture,
        hash=hash,
        size=size,
    )
    db.add(artifact)
    db.flush()

    return artifact


def bug_create(db: Session, *, user: User, release: Release, description: str) -> BugReport:
    check_is_project_member(db, user=user, project=release.application.project)

    bug = BugReport(
        release_id=release.id,
        reporter_id=user.id,
        description=description,
    )
    db.add(bug)
    db.flush()

    return bug


def bug_message_create(db: Session, *, bug: BugReport, user: User, text: str) -> BugMessage:
    check_is_project_member(db, user=user, project=bug.release.application.project)

    message = BugMessage(
        bug_id=bug.id,
        user_id=user.id,
        text=text,
    )
    db.add(message)
    db.flush()

    limit = 100
    body = f"{user.first_name or user.email}: {text[:limit]}{'...' if len(text) > limit else ''}"
    notify_project_members(
        db,
        project_id=bug.release.application.project_id,
        type="NEW_MESSAGE",
        title=f"Nouveau message sur le Bug {str(bug.id)[:8]}",
        body=body,
        exclude_user_id=user.id,
        payload={
            "application_id": bug.release.application_id,
            "release_id": bug.release_id,
            "bug_id": str(bug.id),
            "message_id": str(message.id),
        },
    )

    return message


def bug_transition(db: Session, *, bug: BugReport, transition_name: str, user: User) -> BugReport:
    if transition_name == "resolve":
        check_is_project_admin(db, user=user, project=bug.release.application.project)
    else:
        check_is_project_member(db, user=user, project=bug.release.application.project)

    flow = BugReportFlow(bug)
    transition_fn = getattr(flow, transition_name, None)
    if not transition_fn:
        raise AppError(
            f"Transition '{transition_name}' non trouvée.",
            ErrorCode.VALIDATION_ERROR,
        )

    transition_fn()
    db.flush()

    if transition_name == "publish":
        body_limit = 100
        body = (
            f"{bug.description[:body_limit]}..."
            if len(bug.description) > body_limit
            else bug.description
        )
        notify_project_members(
            db,
            project_id=bug.release.application.project_id,
            type="NEW_BUG",
            title=f"Nouveau Bug {str(bug.id)[:8]}",
            body=body,
            exclude_user_id=user.id,
            payload={
                "application_id": bug.release.application_id,
                "release_id": bug.release_id,
                "bug_id": str(bug.id),
            },
        )

    return bug


def release_tag_list(db: Session, *, user: User, project_id: int) -> list[ReleaseTag]:
    project = project_find(db, project_id=project_id)
    check_is_project_member(db, user=user, project=project)
    return list(
        db.execute(select(ReleaseTag).where(ReleaseTag.project_id == project.id)).scalars().all()
    )


def release_tag_create(
    db: Session, *, user: User, project_id: int, name: str, color: str
) -> ReleaseTag:
    project = project_find(db, project_id=project_id)
    check_is_project_admin(db, user=user, project=project)
    tag = ReleaseTag(project_id=project.id, name=name, color=color)
    db.add(tag)
    db.flush()
    return tag


def release_tag_delete(db: Session, *, user: User, tag_id: int) -> None:
    tag = db.get(ReleaseTag, tag_id)
    if not tag:
        raise AppError("Tag non trouvé.", ErrorCode.RESOURCE_NOT_FOUND)
    check_is_project_admin(db, user=user, project=tag.project)
    db.delete(tag)
    db.flush()


def release_find(db: Session, *, release_id: int) -> Release:
    release = db.get(Release, release_id)
    if not release:
        raise AppError("Release non trouvée.", ErrorCode.RESOURCE_NOT_FOUND)
    return release


def release_get(db: Session, *, user: User, release_id: int) -> Release:
    release = release_find(db, release_id=release_id)
    check_is_project_member(db, user=user, project=release.application.project)
    return release


def release_list(db: Session, *, user: User, application_id: int) -> list[Release]:
    application = db.get(Application, application_id)
    if not application:
        raise AppError("Application non trouvée.", ErrorCode.APP_NOT_FOUND)
    check_is_project_member(db, user=user, project=application.project)
    stmt = (
        select(Release)
        .where(Release.application_id == application_id)
        .order_by(Release.version_code.desc())
    )
    return list(db.execute(stmt).scalars().all())


def release_set_tags(db: Session, *, user: User, release_id: int, tag_ids: list[int]) -> Release:
    release = release_find(db, release_id=release_id)
    check_is_project_admin(db, user=user, project=release.application.project)

    db.execute(
        ReleaseTagAssociation.__table__.delete().where(
            ReleaseTagAssociation.release_id == release.id
        )
    )
    for tag_id in tag_ids:
        db.add(ReleaseTagAssociation(release_id=release.id, releasetag_id=tag_id))
    db.flush()
    db.expire(release, ["tags"])
    return release


def artifact_upload(
    db: Session,
    *,
    user: User,
    application_id: int,
    version_code: int,
    version_id: str,
    release_notes: str,
    architecture: str,
) -> Artifact:
    application = db.get(Application, application_id)
    if not application:
        raise AppError("Application non trouvée.", ErrorCode.APP_NOT_FOUND)
    check_is_project_admin(db, user=user, project=application.project)

    release = db.execute(
        select(Release).where(
            Release.application_id == application_id, Release.version_code == version_code
        )
    ).scalar_one_or_none()
    if not release:
        release = release_create(
            db,
            application=application,
            version_code=version_code,
            version_id=version_id,
            release_notes=release_notes,
            user=user,
        )

    return artifact_create(
        db,
        release=release,
        file_path="",
        architecture=architecture,
        hash="",
        size=None,
        user=user,
    )


def artifact_get(db: Session, *, user: User, artifact_id: int) -> Artifact:
    artifact = db.get(Artifact, artifact_id)
    if not artifact:
        raise AppError("Artifact non trouvé.", ErrorCode.RESOURCE_NOT_FOUND)
    check_is_project_member(db, user=user, project=artifact.release.application.project)
    return artifact


def bug_find(db: Session, *, bug_id: str) -> BugReport:
    bug = db.execute(select(BugReport).where(BugReport.id == bug_id)).scalar_one_or_none()
    if not bug:
        raise AppError("Bug non trouvé.", ErrorCode.RESOURCE_NOT_FOUND)
    return bug


def bug_get(db: Session, *, user: User, bug_id: str) -> BugReport:
    bug = bug_find(db, bug_id=bug_id)
    check_is_project_member(db, user=user, project=bug.release.application.project)
    return bug


def bug_list(db: Session, *, user: User, release_id: int) -> list[BugReport]:
    release = release_get(db, user=user, release_id=release_id)
    return list(
        db.execute(select(BugReport).where(BugReport.release_id == release.id)).scalars().all()
    )


def bug_update(db: Session, *, user: User, bug_id: str, description: str | None) -> BugReport:
    bug = bug_get(db, user=user, bug_id=bug_id)
    if description is not None:
        bug.description = description
        db.flush()
    return bug


def bug_message_list(db: Session, *, user: User, bug_id: str) -> list[BugMessage]:
    bug = bug_get(db, user=user, bug_id=bug_id)
    stmt = select(BugMessage).where(BugMessage.bug_id == bug.id).order_by(BugMessage.created_at)
    return list(db.execute(stmt).scalars().all())


def notify_project_members(
    db: Session,
    *,
    project_id: int,
    type: str,
    title: str,
    body: str = "",
    payload: dict | None = None,
    exclude_user_id: int | None = None,
) -> None:
    stmt = select(UserProjectProfile).where(UserProjectProfile.project_id == project_id)
    members = list(db.execute(stmt).scalars().all())

    notifications = []
    for member in members:
        if exclude_user_id and member.user_id == exclude_user_id:
            continue
        notifications.append(
            Notification(
                user_id=member.user_id,
                type=type,
                title=title,
                body=body,
                payload=payload or {},
            )
        )

    if notifications:
        for n in notifications:
            db.add(n)
        db.flush()


def binary_analyze(
    db: Session, *, user: User, job_id: uuid.UUID, storage: StorageBackend
) -> AnalysisResult:
    job = job_find(db, user=user, job_id=job_id)
    project_id = job.input_data.get("project_id")
    r2_path = job.input_data.get("r2_path")
    if not project_id or not r2_path:
        raise AppError("Job input data incomplete.", ErrorCode.VALIDATION_ERROR)

    project = project_find(db, project_id=project_id)
    check_is_project_admin(db, user=user, project=project)

    tmp_path = AndroidBinaryDownloader().download(storage, r2_path)
    try:
        metadata = AndroidBinaryService().parse_metadata(tmp_path)
    finally:
        if tmp_path.exists():
            tmp_path.unlink()

    existing_apps = list(
        db.execute(
            select(Application).where(
                Application.project_id == project_id,
                Application.app_id == metadata.package_name,
            )
        )
        .scalars()
        .all()
    )

    matching_app = None
    sibling_apps: list[AppConflictInfo] = []
    app_id_exists = len(existing_apps) > 0
    signature_matches: bool | None = None

    for app in existing_apps:
        info = AppConflictInfo(
            app_id=app.id, title=app.title, app_signature=app.app_signature, tag=app.tag
        )
        if app.app_signature == metadata.signature_hash:
            matching_app = info
            signature_matches = True
        elif app.app_signature is not None:
            sibling_apps.append(info)

    if app_id_exists and signature_matches is None:
        signature_matches = False

    version_code_exists = False
    architecture_exists = False
    hash_exists = False

    if matching_app:
        existing_release = db.execute(
            select(Release).where(
                Release.application_id == matching_app.app_id,
                Release.version_code == metadata.version_code,
            )
        ).scalar_one_or_none()
        if existing_release:
            version_code_exists = True
            artifacts = existing_release.artifacts
            architecture_exists = any(a.architecture == metadata.architecture for a in artifacts)
            hash_exists = any(a.hash == metadata.file_hash for a in artifacts)

    decisions_needed: list[str] = []
    if app_id_exists and signature_matches is False:
        decisions_needed.append("app_conflict_signature")
    if version_code_exists and hash_exists:
        decisions_needed.append("artifact_duplicate")

    return AnalysisResult(
        job_id=job.id,
        package_name=metadata.package_name,
        version_code=metadata.version_code,
        version_name=metadata.version_name,
        architecture=metadata.architecture,
        hash=metadata.file_hash,
        signature=metadata.signature_hash,
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
