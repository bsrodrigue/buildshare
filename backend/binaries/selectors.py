from django.db.models import QuerySet

from projects.models import Project

from .models import Application


def application_list(*, project: Project) -> QuerySet[Application]:
    return Application.objects.filter(project=project)
