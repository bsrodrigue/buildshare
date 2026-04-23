import logging
from pathlib import Path
from typing import Any

from django.core.files import File
from django.db import IntegrityError, transaction

from libs.android import AndroidMetadata
from projects.models import Project

from ..models import Application, Artifact, Release

logger = logging.getLogger(__name__)


class AndroidArtifactProcessingService:
    """Service to handle database operations for Android binary processing."""

    def process_and_save(
        self,
        project: Project,
        metadata: AndroidMetadata,
        apk_path: Any,  # Path
        title: str | None = None,
        description: str | None = None,
    ) -> dict[str, Any]:
        """
        Save Application, Release, and Artifact records based on metadata.
        Returns a dictionary with created object IDs.
        """
        package_name = metadata.package_name
        version_code = metadata.version_code
        version_name = metadata.version_name
        file_hash = metadata.file_hash
        architecture = metadata.architecture
        signature = metadata.signature_hash

        with transaction.atomic():
            # Get or Create Application
            app, created = Application.objects.get_or_create(
                project=project,
                app_id=package_name,
                defaults={
                    "title": title or metadata.app_label or package_name,
                    "description": description or "",
                    "app_signature": signature,
                },
            )

            # Enforce App Signature consistency
            if not created and app.app_signature and signature and app.app_signature != signature:
                raise ValueError(
                    f"La signature de l'APK ({signature}) ne correspond pas à la "
                    f"signature enregistrée pour cette application ({app.app_signature})."
                )

            # Update signature if not already set (for existing apps)
            if not app.app_signature and signature:
                app.app_signature = signature
                app.save(update_fields=["app_signature"])

            # Get or Create Release
            release, _ = Release.objects.get_or_create(
                application=app,
                version_code=version_code,
                defaults={
                    "version_id": version_name,
                },
            )

            # Validity checks
            if Artifact.objects.filter(release=release, hash=file_hash).exists():
                raise ValueError("Ce binaire a déjà été téléversé pour cette version.")

            if (
                architecture != "unknown"
                and Artifact.objects.filter(release=release, architecture=architecture).exists()
            ):
                raise ValueError(
                    f"Une version pour l'architecture '{architecture}' "
                    "existe déjà pour cette release."
                )

            # Create Artifact
            with Path(apk_path).open("rb") as f:
                try:
                    artifact = Artifact.objects.create(
                        release=release,
                        file=File(f, name=f"{package_name}-{version_name}.apk"),
                        hash=file_hash,
                        architecture=architecture,
                    )
                except IntegrityError as e:
                    logger.error(f"Integrity Error: {e}")
                    raise ValueError(
                        "Conflit de données : ce binaire ou cette architecture "
                        "a déjà été enregistré."
                    ) from e

            return {
                "application_id": str(app.id),
                "application_title": app.title,
                "release_id": str(release.id),
                "artifact_id": str(artifact.id),
            }
