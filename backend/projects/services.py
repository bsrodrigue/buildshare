from django.db import transaction

from .models import Project, UserProjectProfile


@transaction.atomic
def project_create(*, title: str, description: str = "", user) -> Project:
    project = Project(title=title, description=description)
    project.full_clean()
    project.save()

    UserProjectProfile.objects.create(
        user=user,
        project=project,
        role=UserProjectProfile.Role.ADMIN
    )

    return project
