from typing import Any

from django.core.files.base import File

from core.errors import ErrorCode
from core.exceptions import ApplicationError
from projects.models import Project, UserProjectProfile
from users.models import User

from .models import Application, Artifact, Release


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

    return release


def artifact_create(
    *, release: Release, file: File[Any], architecture: str = "", hash: str = "", user: User
) -> Artifact:
    _check_is_project_admin(user=user, project=release.application.project)

    artifact = Artifact(release=release, file=file, architecture=architecture, hash=hash)
    artifact.full_clean()
    artifact.save()

    return artifact
