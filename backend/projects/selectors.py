from django.db.models import QuerySet

from core.errors import ErrorCode
from core.exceptions import ApplicationError
from users.models import User

from .models import Project


def project_list(*, user: User) -> QuerySet[Project]:
    return Project.objects.filter(user_profiles__user=user).distinct()


def project_get(*, user: User, project_id: int) -> Project:
    try:
        return Project.objects.get(user_profiles__user=user, id=project_id)
    except Project.DoesNotExist:
        raise ApplicationError(
            message="Projet non trouvé.", code=ErrorCode.PROJECT_NOT_FOUND
        ) from None
