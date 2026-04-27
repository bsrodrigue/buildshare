from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from django.db.models.fields.related_descriptors import RelatedManager

    from users.models import User

from django.conf import settings
from django.db import models
from django_stubs_ext.db.models import TypedModelMeta

from core.models import BaseModel
from projects.models import Project

from .constraints import (
    UNIQUE_APP_PER_PROJECT,
    UNIQUE_ARTIFACT_ARCH_PER_RELEASE,
    UNIQUE_ARTIFACT_HASH_PER_RELEASE,
    UNIQUE_RELEASE_PER_APP,
)


class Application(BaseModel):
    project: models.ForeignKey[Project | int, Project] = models.ForeignKey(
        Project, related_name="applications", on_delete=models.CASCADE
    )
    app_id: models.CharField[str, str] = models.CharField(
        "ID de l'application (Package name)", max_length=255
    )
    title: models.CharField[str, str] = models.CharField("Titre", max_length=255)
    description: models.TextField[str, str] = models.TextField("Description", blank=True)
    app_signature: models.CharField[str | None, str | None] = models.CharField(
        "Signature de l'application (SHA-256)", max_length=64, null=True, blank=True
    )

    if TYPE_CHECKING:
        releases: RelatedManager[Release]

    class Meta(TypedModelMeta):
        constraints = [
            models.UniqueConstraint(
                fields=["project", "app_id", "app_signature"], name=UNIQUE_APP_PER_PROJECT
            )
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.app_id})"


class ReleaseTag(BaseModel):
    project: models.ForeignKey[Project | int, Project] = models.ForeignKey(
        Project, related_name="release_tags", on_delete=models.CASCADE
    )
    name: models.CharField[str, str] = models.CharField("Nom du tag", max_length=50)
    color: models.CharField[str, str] = models.CharField(
        "Couleur (Hex)", max_length=7, default="#6200EE"
    )

    class Meta(TypedModelMeta):
        constraints = [
            models.UniqueConstraint(fields=["project", "name"], name="unique_tag_per_project")
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.project.title})"


class Release(BaseModel):
    application: models.ForeignKey[Application | int, Application] = models.ForeignKey(
        Application, related_name="releases", on_delete=models.CASCADE
    )
    version_code: models.PositiveIntegerField[int, int] = models.PositiveIntegerField(
        "Code de version"
    )
    version_id: models.CharField[str, str] = models.CharField("Nom de version (ID)", max_length=50)
    release_notes: models.TextField[str, str] = models.TextField("Notes de version", blank=True)
    tags: models.ManyToManyField[ReleaseTag, models.Model] = models.ManyToManyField(
        ReleaseTag, related_name="releases", blank=True
    )

    if TYPE_CHECKING:
        artifacts: RelatedManager[Artifact]
        bugs: RelatedManager[BugReport]

    class Meta(TypedModelMeta):
        constraints = [
            models.UniqueConstraint(
                fields=["application", "version_code"], name=UNIQUE_RELEASE_PER_APP
            )
        ]

    def __str__(self) -> str:
        return f"{self.application.title} v{self.version_id} ({self.version_code})"


def artifact_upload_path(instance: Artifact, filename: str) -> str:
    return (
        f"artifacts/{instance.release.application.app_id}/"
        f"{instance.release.version_code}/{filename}"
    )


class Artifact(BaseModel):
    release: models.ForeignKey[Release | int, Release] = models.ForeignKey(
        Release, related_name="artifacts", on_delete=models.CASCADE
    )
    file: models.FileField = models.FileField(
        "Fichier binaire", upload_to=artifact_upload_path
    )  # TODO: Replace with R2 presigned URL
    architecture: models.CharField[str, str] = models.CharField(
        "Architecture", max_length=50, blank=True
    )
    hash: models.CharField[str, str] = models.CharField("Hash (SHA256)", max_length=64)
    size: models.PositiveBigIntegerField[int | None, int | None] = models.PositiveBigIntegerField(
        "Taille (octets)", null=True, blank=True
    )

    class Meta(TypedModelMeta):
        constraints = [
            models.UniqueConstraint(
                fields=["release", "hash"], name=UNIQUE_ARTIFACT_HASH_PER_RELEASE
            ),
            models.UniqueConstraint(
                fields=["release", "architecture"], name=UNIQUE_ARTIFACT_ARCH_PER_RELEASE
            ),
        ]

    def __str__(self) -> str:
        return f"Artifact for {self.release} ({self.architecture})"

    @property
    def file_size_display(self) -> str:
        if self.size is None:
            return "N/A"
        size = float(self.size)
        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if size < 1024:  # noqa: PLR2004
                return f"{size:.2f} {unit}" if unit != "B" else f"{int(size)} {unit}"
            size /= 1024
        return f"{size:.2f} PB"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.size and self.file:
            self.size = self.file.size
        super().save(*args, **kwargs)


class BugStatus(models.TextChoices):
    DRAFT = "DRAFT", "Brouillon"
    OPENED = "OPENED", "Ouvert"
    RESOLVED = "RESOLVED", "Résolu"
    REOPENED = "REOPENED", "Réouvert"


class BugReport(BaseModel):
    id: models.UUIDField[uuid.UUID | str, uuid.UUID] = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    release: models.ForeignKey[Release | int, Release] = models.ForeignKey(
        Release, related_name="bugs", on_delete=models.CASCADE
    )
    reporter: models.ForeignKey[User | int, User] = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="reported_bugs", on_delete=models.CASCADE
    )
    description: models.TextField[str, str] = models.TextField("Description du bug")
    status: models.CharField[str, str] = models.CharField(
        "Statut", max_length=20, choices=BugStatus.choices, default=BugStatus.DRAFT
    )

    class Meta(TypedModelMeta):
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Bug {self.id} on {self.release}"


class BugMessage(BaseModel):
    id: models.UUIDField[uuid.UUID | str, uuid.UUID] = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    bug: models.ForeignKey[BugReport | uuid.UUID, BugReport] = models.ForeignKey(
        BugReport, related_name="messages", on_delete=models.CASCADE
    )
    user: models.ForeignKey[User | int, User] = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="bug_messages", on_delete=models.CASCADE
    )
    text: models.TextField[str, str] = models.TextField("Message")

    class Meta(TypedModelMeta):
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Message by {self.user.email} on Bug {self.bug.id}"
