from django.db import models

from core.models import BaseModel
from projects.models import Project


class Application(BaseModel):
    project = models.ForeignKey(
        Project,
        related_name="applications",
        on_delete=models.CASCADE
    )
    app_id = models.CharField("ID de l'application (Package name)", max_length=255)
    title = models.CharField("Titre", max_length=255)
    description = models.TextField("Description", blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["project", "app_id"],
                name="unique_app_per_project"
            )
        ]

    def __str__(self):
        return f"{self.title} ({self.app_id})"


class Release(BaseModel):
    application = models.ForeignKey(
        Application,
        related_name="releases",
        on_delete=models.CASCADE
    )
    version_code = models.PositiveIntegerField("Code de version")
    version_id = models.CharField("Nom de version (ID)", max_length=50)
    release_notes = models.TextField("Notes de version", blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["application", "version_code"],
                name="unique_release_per_app"
            )
        ]

    def __str__(self):
        return f"{self.application.title} v{self.version_id} ({self.version_code})"


def artifact_upload_path(instance, filename):
    return f"artifacts/{instance.release.application.app_id}/{instance.release.version_code}/{filename}"


class Artifact(BaseModel):
    release = models.ForeignKey(
        Release,
        related_name="artifacts",
        on_delete=models.CASCADE
    )
    file = models.FileField("Fichier binaire", upload_to=artifact_upload_path)
    architecture = models.CharField("Architecture", max_length=50, blank=True)
    hash = models.CharField("Hash (SHA256)", max_length=64, blank=True)

    def __str__(self):
        return f"Artifact for {self.release} ({self.architecture})"
