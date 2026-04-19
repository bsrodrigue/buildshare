from django.db.models import QuerySet

from users.models import User

from .models import Project


def project_list(*, user: User) -> QuerySet[Project]:
    return Project.objects.filter(user_profiles__user=user).distinct()
