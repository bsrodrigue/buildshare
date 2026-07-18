from __future__ import annotations

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
)
from app.models.notification import Notification
from app.models.project import Project, UserProjectProfile
from app.models.user import User
from app.services.project import check_is_project_admin, check_is_project_member


def application_list(db: Session, *, project: Project) -> list[Application]:
    stmt = select(Application).where(Application.project_id == project.id)
    return list(db.execute(stmt).scalars().all())


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


def release_tag_create(db: Session, *, project: Project, name: str, color: str) -> ReleaseTag:
    tag = ReleaseTag(project_id=project.id, name=name, color=color)
    db.add(tag)
    db.flush()
    return tag


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
