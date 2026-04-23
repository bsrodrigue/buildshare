from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from users.models import User

from django.conf import settings
from django.db import models
from django_stubs_ext.db.models import TypedModelMeta

from core.models import BaseModel

from .constraints import UNIQUE_PROJECT_ADMIN, UNIQUE_USER_PROJECT


class Project(BaseModel):
    title: models.CharField[str, str] = models.CharField("Titre", max_length=255)
    description: models.TextField[str, str] = models.TextField("Description", blank=True)

    def __str__(self) -> str:
        return str(self.title)


class UserProjectProfile(BaseModel):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrateur"
        MEMBER = "MEMBER", "Membre"

    user: models.ForeignKey[User | int, User] = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="user_project_profiles", on_delete=models.CASCADE
    )
    project: models.ForeignKey[Project | int, Project] = models.ForeignKey(
        Project, related_name="user_profiles", on_delete=models.CASCADE
    )
    role: models.CharField[str, str] = models.CharField(
        "Rôle", max_length=20, choices=Role.choices, default=Role.MEMBER
    )

    if TYPE_CHECKING:

        def get_role_display(self) -> str: ...

    class Meta(TypedModelMeta):
        constraints = [
            models.UniqueConstraint(
                fields=["project"], condition=models.Q(role="ADMIN"), name=UNIQUE_PROJECT_ADMIN
            ),
            models.UniqueConstraint(fields=["user", "project"], name=UNIQUE_USER_PROJECT),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.project.title} ({self.role})"
