from django.db import transaction

from users.models import User

from .models import Project, UserProjectProfile


@transaction.atomic
def project_create(*, title: str, description: str = "", user: User) -> Project:
    project = Project(title=title, description=description)
    project.full_clean()
    project.save()

    UserProjectProfile.objects.create(
        user=user, project=project, role=UserProjectProfile.Role.ADMIN
    )

    return project


@transaction.atomic
def project_update(*, project: Project, title: str, description: str = "") -> Project:
    project.title = title
    project.description = description
    project.full_clean()
    project.save()

    return project


@transaction.atomic
def project_delete(*, project: Project) -> None:
    project.delete()
