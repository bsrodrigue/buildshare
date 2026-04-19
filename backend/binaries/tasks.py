import hashlib
import tempfile
import zipfile
from pathlib import Path

from celery import shared_task
from django.core.files import File
from django.db import IntegrityError, transaction
from libs.log import create_logger
from pyaxmlparser import APK

from core.flows import TaskJobFlow
from core.models import TaskJob
from core.services.storage import R2StorageService
from projects.models import Project

from .models import Application, Artifact, Release

logger = create_logger("binaries.tasks")


def get_apk_architecture(path: Path) -> str:
    """
    Extracts the architecture from the APK by inspecting the lib/ directory.
    If no lib/ directory is found, it's likely a 'universal' or 'no-arch' build.
    """
    try:
        with zipfile.ZipFile(path, "r") as zf:
            lib_dirs = [info.filename for info in zf.infolist() if info.filename.startswith("lib/")]
            archs = set()
            for d in lib_dirs:
                # lib/<arch>/...
                parts = d.split("/")
                if len(parts) > 1:
                    archs.add(parts[1])

            if not archs:
                return "universal"
            return ",".join(sorted(archs))
    except Exception as e:
        logger.error(f"Failed to extract architecture: {e}")
        return "unknown"


@shared_task(bind=True, name="binaries.tasks.process_apk_task")
def process_apk_task(_self, job_id, title=None, description=None):
    """
    Background task to process an uploaded APK from R2.
    Extracts metadata, ensures Application/Release records exist,
    and creates an Artifact.
    """
    job = TaskJob.objects.select_related("user").get(id=job_id)
    flow = TaskJobFlow(job)

    logger.info(f"Starting APK processing for job {job_id}")

    try:
        # Start the job
        with transaction.atomic():
            flow.start()

        storage_service = R2StorageService()
        r2_path = job.input_data.get("r2_path")
        project_id = job.input_data.get("project_id")

        if not r2_path or not project_id:
            raise ValueError("Missing r2_path or project_id in job input data.")

        project = Project.objects.get(id=project_id)

        # Download APK to temp file
        with tempfile.NamedTemporaryFile(suffix=".apk", delete=False) as tmp_file:
            logger.info(f"Downloading {r2_path} to {tmp_file.name}")
            storage_service.download_file(r2_path, tmp_file.name)
            tmp_path = Path(tmp_file.name)

        try:
            # Parse APK
            apk = APK(str(tmp_path))
            package_name = apk.package
            version_code = int(apk.version_code)
            version_name = apk.version_name

            if not package_name or not version_code:
                raise ValueError("Could not extract package name or version code from APK.")

            logger.info(f"Parsed APK: {package_name} v{version_name} ({version_code})")

            # Calculate file hash
            sha256_hash = hashlib.sha256()
            with tmp_path.open("rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            file_hash = sha256_hash.hexdigest()

            # Extract architecture
            architecture = get_apk_architecture(tmp_path)
            logger.info(f"Calculated Hash: {file_hash}, Architecture: {architecture}")

            with transaction.atomic():
                # Get or Create Application
                app, _ = Application.objects.get_or_create(
                    project=project,
                    app_id=package_name,
                    defaults={
                        "title": title or apk.application or package_name,
                        "description": description or "",
                    },
                )

                # Get or Create Release
                release, _ = Release.objects.get_or_create(
                    application=app,
                    version_code=version_code,
                    defaults={
                        "version_id": version_name,
                    },
                )

                # Check if this exact artifact already exists (manual check for better error message)
                existing = Artifact.objects.filter(release=release, hash=file_hash).first()
                if existing:
                    raise ValueError("Ce binaire a déjà été téléversé pour cette version.")

                # Check if this architecture already exists for this release
                if architecture != "unknown":
                    existing_arch = Artifact.objects.filter(
                        release=release, architecture=architecture
                    ).first()
                    if existing_arch:
                        raise ValueError(
                            f"Une version pour l'architecture '{architecture}' existe déjà pour cette release."
                        )

                # Create Artifact
                with tmp_path.open("rb") as f:
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
                            "Conflit de données : ce binaire ou cette architecture a déjà été enregistré."
                        ) from e

                # Update job output
                job.output_data = {
                    "application_id": str(app.id),
                    "application_title": app.title,
                    "release_id": str(release.id),
                    "artifact_id": str(artifact.id),
                    "package_name": package_name,
                    "version_code": version_code,
                    "version_name": version_name,
                    "hash": file_hash,
                    "architecture": architecture,
                }

                flow.finish()
                logger.info(f"Successfully processed APK for job {job_id}")

        finally:
            # Cleanup temp file
            if tmp_path.exists():
                tmp_path.unlink()

    except Exception as e:
        logger.exception(f"Error processing APK for job {job_id}: {e}")
        # Mark job as failed
        flow.fail(error_message=str(e))
        # Re-raise to let Celery handle retries if configured
        raise e
