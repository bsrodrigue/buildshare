from core.errors import ErrorCode
from core.exceptions import ApplicationError
from users.models import User

from .models import Project, UserProjectProfile


def is_project_admin(*, user: User, project: Project) -> bool:
    return UserProjectProfile.objects.filter(
        user=user, project=project, role=UserProjectProfile.Role.ADMIN
    ).exists()


def check_is_project_admin(*, user: User, project: Project) -> None:
    if not is_project_admin(user=user, project=project):
        raise ApplicationError(
            message="Seuls les administrateurs peuvent effectuer cette action.",
            code=ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        )


def is_project_member(*, user: User, project: Project) -> bool:
    return UserProjectProfile.objects.filter(user=user, project=project).exists()


def check_is_project_member(*, user: User, project: Project) -> None:
    if not is_project_member(user=user, project=project):
        raise ApplicationError(
            message="Vous n'êtes pas membre de ce projet.",
            code=ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        )
