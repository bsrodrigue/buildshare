from django.db.models import QuerySet

from .models import Project


def project_list(*, user) -> QuerySet[Project]:
    return Project.objects.filter(user_profiles__user=user).distinct()
