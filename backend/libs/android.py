from __future__ import annotations

import hashlib
import logging
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from androguard.core.apk import APK as AndroguardAPK  # noqa: N811
from pyaxmlparser import APK as PyAXMLAPK  # noqa: N811

if TYPE_CHECKING:
    from core.services.storage import R2StorageService

logger = logging.getLogger(__name__)


@dataclass
class AndroidMetadata:
    package_name: str
    version_code: int
    version_name: str
    app_label: str
    signature_hash: str | None
    architecture: str
    file_hash: str
    file_size: int


class AndroidBinaryService:
    """
    Service for parsing and extracting metadata from Android binaries (APK/AAB).
    Wraps pyaxmlparser and androguard for robust analysis.
    """

    @staticmethod
    def get_architecture(path: Path) -> str:
        """
        Extracts the architecture from the APK by inspecting the lib/ directory.
        """
        try:
            with zipfile.ZipFile(path, "r") as zf:
                lib_dirs = [
                    info.filename for info in zf.infolist() if info.filename.startswith("lib/")
                ]
                archs = set()
                for d in lib_dirs:
                    parts = d.split("/")
                    if len(parts) > 1:
                        archs.add(parts[1])

                if not archs:
                    return "universal"
                return ",".join(sorted(archs))
        except Exception as e:
            logger.error(f"Failed to extract architecture from {path}: {e}")
            return "unknown"

    @staticmethod
    def get_signature_hash(path: Path) -> str | None:
        """
        Extracts the SHA-256 fingerprint of the first signing certificate.
        Uses androguard for more reliable signature parsing.
        """
        try:
            apk = AndroguardAPK(str(path))
            certs = apk.get_certificates()
            if certs:
                # Get the SHA-256 fingerprint from the first certificate
                # format is usually "AA:BB:CC..."
                fingerprint = str(certs[0].sha256_fingerprint)
                return fingerprint.replace(":", "").lower()
        except Exception as e:
            logger.error(f"Failed to extract signature from {path}: {e}")

        return None

    @staticmethod
    def calculate_hash(path: Path) -> str:
        """Calculates the SHA-256 hash of the binary."""
        sha256_hash = hashlib.sha256()
        with path.open("rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def parse_metadata(self, path: Path) -> AndroidMetadata:
        """
        Extracts all relevant metadata from an Android binary.
        """
        # We use pyaxmlparser for basic metadata as it's often faster
        py_apk = PyAXMLAPK(str(path))

        package_name = py_apk.package
        version_code = int(py_apk.version_code) if py_apk.version_code else 0
        version_name = py_apk.version_name or ""
        app_label = py_apk.application or ""

        if not package_name or not version_code:
            raise ValueError("Could not extract package name or version code from APK.")

        # Use androguard for the signature
        signature_hash = self.get_signature_hash(path)

        # Extract architecture
        architecture = self.get_architecture(path)

        # Calculate file hash
        file_hash = self.calculate_hash(path)

        # File size
        file_size = path.stat().st_size

        return AndroidMetadata(
            package_name=package_name,
            version_code=version_code,
            version_name=version_name,
            app_label=app_label,
            signature_hash=signature_hash,
            architecture=architecture,
            file_hash=file_hash,
            file_size=file_size,
        )


class AndroidBinaryDownloader:
    """Service to download Android binaries from remote storage."""

    def download(self, storage: R2StorageService, r2_path: str) -> Path:
        """Download APK from storage to a temporary file."""
        with tempfile.NamedTemporaryFile(suffix=".apk", delete=False) as tmp_file:
            logger.info(f"Downloading {r2_path} to {tmp_file.name}")
            storage.download_file(r2_path, tmp_file.name)
            return Path(tmp_file.name)
