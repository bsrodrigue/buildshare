from typing import Any

from django.core.files.base import File

from core.errors import ErrorCode
from core.exceptions import ApplicationError
from projects.models import Project, UserProjectProfile
from projects.permissions import check_is_project_member
from users.models import User

from ..models import Application, Artifact, BugMessage, BugReport, Release, ReleaseTag


def _check_is_project_admin(*, user: User, project: Project) -> None:
    is_admin = UserProjectProfile.objects.filter(
        user=user, project=project, role=UserProjectProfile.Role.ADMIN
    ).exists()

    if not is_admin:
        raise ApplicationError(
            message="Vous n'avez pas les droits d'administrateur pour ce projet.",
            code=ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        )


def application_create(
    *, project: Project, app_id: str, title: str, description: str = "", user: User
) -> Application:
    _check_is_project_admin(user=user, project=project)

    app = Application(project=project, app_id=app_id, title=title, description=description)
    app.full_clean()
    app.save()

    from notifications.models import NotificationType  # noqa: PLC0415
    from notifications.services import notify_project_members  # noqa: PLC0415

    notify_project_members(
        project_id=project.id,
        type=NotificationType.APPLICATION_CREATED,
        title="Nouvelle application",
        body=f"{user.first_name or user.email} a créé l'application {app.title}.",
        exclude_user=user,
        payload={"application_id": app.id},
    )

    return app


def application_update(
    *, application: Application, title: str, description: str = "", user: User
) -> Application:
    _check_is_project_admin(user=user, project=application.project)

    application.title = title
    application.description = description
    application.full_clean()
    application.save()

    return application


def application_delete(*, application: Application, user: User) -> None:
    _check_is_project_admin(user=user, project=application.project)

    from notifications.models import NotificationType  # noqa: PLC0415
    from notifications.services import notify_project_members  # noqa: PLC0415

    notify_project_members(
        project_id=application.project_id,
        type=NotificationType.APPLICATION_DELETED,
        title="Application supprimée",
        body=f"{user.first_name or user.email} a supprimé l'application {application.title}.",
        exclude_user=user,
    )

    application.delete()


def release_create(
    *,
    application: Application,
    version_code: int,
    version_id: str,
    release_notes: str = "",
    user: User,
) -> Release:
    _check_is_project_admin(user=user, project=application.project)

    release = Release(
        application=application,
        version_code=version_code,
        version_id=version_id,
        release_notes=release_notes,
    )
    release.full_clean()
    release.save()

    from notifications.models import NotificationType  # noqa: PLC0415
    from notifications.services import notify_project_members  # noqa: PLC0415

    notify_project_members(
        project_id=application.project_id,
        type=NotificationType.NEW_RELEASE,
        title="Nouvelle release disponible",
        body=f"Une nouvelle version ({release.version_id}) de {application.title} est disponible.",
        exclude_user=user,
        payload={"application_id": application.id, "release_id": release.id},
    )

    return release


def artifact_create(  # noqa: PLR0913
    *,
    release: Release,
    file: File[Any],
    architecture: str = "",
    hash: str = "",
    size: int | None = None,
    user: User,
) -> Artifact:
    _check_is_project_admin(user=user, project=release.application.project)

    artifact = Artifact(release=release, file=file, architecture=architecture, hash=hash, size=size)
    artifact.full_clean()
    artifact.save()

    return artifact


def bug_create(*, user: User, release: Release, description: str) -> BugReport:
    check_is_project_member(user=user, project=release.application.project)

    bug = BugReport(release=release, reporter=user, description=description)
    bug.full_clean()
    bug.save()

    return bug


def bug_message_create(*, bug: BugReport, user: User, text: str) -> BugMessage:
    check_is_project_member(user=user, project=bug.release.application.project)

    message = BugMessage(bug=bug, user=user, text=text)
    message.full_clean()
    message.save()

    from notifications.models import NotificationType  # noqa: PLC0415
    from notifications.services import notify_project_members  # noqa: PLC0415

    limit = 100
    body = f"{user.first_name or user.email}: {text[:limit]}{'...' if len(text) > limit else ''}"
    notify_project_members(
        project_id=bug.release.application.project_id,
        type=NotificationType.NEW_MESSAGE,
        title=f"Nouveau message sur le Bug {str(bug.id)[:8]}",
        body=body,
        exclude_user=user,
        payload={
            "application_id": bug.release.application_id,
            "release_id": bug.release_id,
            "bug_id": bug.id,
            "message_id": message.id,
        },
    )

    return message


def bug_transition(*, bug: BugReport, transition_name: str, user: User) -> BugReport:
    from ..flows import BugReportFlow  # noqa: PLC0415

    # Permission check: Only admins can resolve bugs
    if transition_name == "resolve":
        _check_is_project_admin(user=user, project=bug.release.application.project)
    else:
        check_is_project_member(user=user, project=bug.release.application.project)

    flow = BugReportFlow(bug)
    transition = getattr(flow, transition_name, None)
    if not transition:
        raise ApplicationError(
            message=f"Transition '{transition_name}' non trouvée.",
            code=ErrorCode.VALIDATION_ERROR,
        )

    from viewflow.fsm import TransitionNotAllowed  # noqa: PLC0415

    try:
        transition()
        if transition_name == "publish":
            from notifications.models import NotificationType  # noqa: PLC0415
            from notifications.services import notify_project_members  # noqa: PLC0415

            body_limit = 100
            body = (
                f"{bug.description[:body_limit]}..."
                if len(bug.description) > body_limit
                else bug.description
            )
            notify_project_members(
                project_id=bug.release.application.project_id,
                type=NotificationType.NEW_BUG,
                title=f"Nouveau Bug {str(bug.id)[:8]}",
                body=body,
                exclude_user=user,
                payload={
                    "application_id": bug.release.application_id,
                    "release_id": bug.release_id,
                    "bug_id": bug.id,
                },
            )
    except TransitionNotAllowed as e:
        raise ApplicationError(
            message=f"Transition '{transition_name}' impossible depuis l'état actuel.",
            code=ErrorCode.VALIDATION_ERROR,
        ) from e

    return bug


def release_tag_create(*, project: Project, name: str, color: str = "#6200EE") -> ReleaseTag:
    tag = ReleaseTag(project=project, name=name, color=color)
    tag.full_clean()
    tag.save()
    return tag
