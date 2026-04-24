from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.db.models.fields.related_descriptors import RelatedManager

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


class Release(BaseModel):
    application: models.ForeignKey[Application | int, Application] = models.ForeignKey(
        Application, related_name="releases", on_delete=models.CASCADE
    )
    version_code: models.PositiveIntegerField[int, int] = models.PositiveIntegerField(
        "Code de version"
    )
    version_id: models.CharField[str, str] = models.CharField("Nom de version (ID)", max_length=50)
    release_notes: models.TextField[str, str] = models.TextField("Notes de version", blank=True)

    if TYPE_CHECKING:
        artifacts: RelatedManager[Artifact]

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
