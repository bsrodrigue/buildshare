from django.db.models import QuerySet

from core.errors import ErrorCode
from core.exceptions import ApplicationError
from projects.models import Project
from users.models import User

from .models import Application


def application_list(*, project: Project) -> QuerySet[Application]:
    return Application.objects.filter(project=project)


def application_get(*, user: User, application_id: int) -> Application:
    try:
        return Application.objects.get(project__user_profiles__user=user, id=application_id)
    except Application.DoesNotExist:
        raise ApplicationError(
            message="Application non trouvée.", code=ErrorCode.APP_NOT_FOUND
        ) from None
