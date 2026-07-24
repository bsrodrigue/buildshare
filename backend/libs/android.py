from __future__ import annotations

import hashlib
import logging
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Protocol, runtime_checkable

from androguard.core.apk import APK as AndroguardAPK  # noqa: N811
from pyaxmlparser import APK as PyAXMLAPK  # noqa: N811

if TYPE_CHECKING:
    from app.services.storage import StorageBackend

logger = logging.getLogger(__name__)


@dataclass
class AndroidMetadata:
    app_label: str
    package_name: str
    signature_hash: str | None
    is_debuggable: bool
    version_code: int
    version_name: str
    architecture: str
    file_hash: str
    file_size: int


@runtime_checkable
class APKParser(Protocol):
    """Parses raw APK bytes into metadata and extractable content."""

    def parse_metadata(self, data: bytes) -> AndroidMetadata:
        """Extract all metadata from raw APK bytes."""
        ...

    def get_app_icon_bytes(self, data: bytes) -> bytes | None:
        """Extract the app launcher icon from raw APK bytes."""
        ...


@runtime_checkable
class APKDownloader(Protocol):
    """Downloads an APK from remote storage as raw bytes."""

    def download(self, storage: StorageBackend, key: str) -> bytes: ...


class AndroidBinaryService:
    """Parses Android APK/AAB files using androguard and pyaxmlparser.

    Implements APKParser. Internally writes APK bytes to a temporary file
    because the underlying C libraries require a filesystem path.
    """

    # --- Helpers that operate on a Path (shared by all public methods) ---

    @staticmethod
    def _get_architecture(path: Path) -> str:
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
            logger.error("Failed to extract architecture from %s: %s", path, e)
            return "unknown"

    @staticmethod
    def _get_signature_hash(path: Path) -> str | None:
        try:
            apk = AndroguardAPK(str(path))
            certs = apk.get_certificates()
            if certs:
                fingerprint = str(certs[0].sha256_fingerprint)
                return fingerprint.replace(":", "").replace(" ", "").lower()
        except Exception as e:
            logger.error("Failed to extract signature from %s: %s", path, e)
        return None

    @staticmethod
    def _is_debuggable(path: Path) -> bool:
        try:
            apk = AndroguardAPK(str(path))
            manifest = apk.get_android_manifest_xml()
            if manifest is None:
                return False
            ns_android = "{http://schemas.android.com/apk/res/android}"
            application = manifest.find("application")
            if application is None:
                return False
            val = application.get(f"{ns_android}debuggable")
            return val == "true"
        except Exception as e:
            logger.error("Failed to extract debuggable flag from %s: %s", path, e)
        return False

    @staticmethod
    def _is_valid_image(data: bytes) -> bool:
        if len(data) < 12:
            return False
        # PNG: 89 50 4E 47 0D 0A 1A 0A
        if data[:8] == b"\x89PNG\r\n\x1a\n":
            return True
        # JPEG: FF D8 FF
        if data[:3] == b"\xff\xd8\xff":
            return True
        # WebP: 52 49 46 46 .... 57 45 42 50
        return data[:4] == b"RIFF" and data[8:12] == b"WEBP"

    @staticmethod
    def _get_icon_bytes(path: Path) -> bytes | None:
        try:
            apk = AndroguardAPK(str(path))
            icon_name = apk.get_app_icon()
            if icon_name and not icon_name.endswith(".xml"):
                data = apk.get_file(icon_name)
                if data and AndroidBinaryService._is_valid_image(data):
                    return data
        except Exception as e:
            logger.warning("androguard icon extraction failed for %s: %s", path, e)

        try:
            with zipfile.ZipFile(path, "r") as zf:
                all_files = zf.namelist()

                # Try structured res/mipmap and res/drawable dirs first
                candidates = [
                    n
                    for n in all_files
                    if n.startswith("res/")
                    and not n.endswith(".xml")
                    and not n.endswith(".9.png")
                    and (n.endswith(".png") or n.endswith(".webp"))
                ]

                if not candidates:
                    return None

                def _density(name: str) -> int:
                    for token in name.split("/"):
                        if "xxxhdpi" in token:
                            return 4
                        if "xxhdpi" in token:
                            return 3
                        if "xhdpi" in token:
                            return 2
                        if "hdpi" in token:
                            return 1
                    return 0

                def _score(name: str, info: zipfile.ZipInfo) -> float:
                    s = float(_density(name))
                    # Prefer files with "icon" or the app label in the path
                    lower = name.lower()
                    if "icon" in lower or "ic_" in lower:
                        s += 5.0
                    # Prefer non-9-patch files
                    if not name.endswith(".9.png"):
                        s += 2.0
                    # Larger files are higher resolution
                    s += info.file_size / 1000.0
                    return s

                scored = sorted(
                    ((n, _score(n, zf.getinfo(n))) for n in candidates),
                    key=lambda x: x[1],
                    reverse=True,
                )

                for name, _ in scored[:10]:
                    data = zf.read(name)
                    if AndroidBinaryService._is_valid_image(data):
                        logger.info("Extracted icon from %s (%d bytes)", name, len(data))
                        return data

                # Last resort: try 9-patch files if nothing else worked
                nine_patch = [n for n in all_files if n.startswith("res/") and n.endswith(".9.png")]
                for name in nine_patch:
                    data = zf.read(name)
                    if AndroidBinaryService._is_valid_image(data):
                        logger.info("Extracted 9-patch icon from %s (%d bytes)", name, len(data))
                        return data

                logger.warning("No valid icon in APK (%d candidates checked)", len(candidates))
                return None
        except Exception as e:
            logger.error("Failed to extract app icon from %s: %s", path, e)
        return None

    @staticmethod
    def _calculate_hash(path: Path) -> str:
        sha256_hash = hashlib.sha256()
        with path.open("rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    # --- Private helpers ---

    @staticmethod
    def _to_path(data: bytes) -> Path:
        with tempfile.NamedTemporaryFile(suffix=".apk", delete=False) as tmp:
            tmp.write(data)
            return Path(tmp.name)

    # --- Public APKParser interface ---

    def parse_metadata(self, data: bytes) -> AndroidMetadata:
        path = self._to_path(data)
        try:
            return self._parse_metadata_from_path(path)
        finally:
            path.unlink(missing_ok=True)

    def get_app_icon_bytes(self, data: bytes) -> bytes | None:
        path = self._to_path(data)
        try:
            return self._get_icon_bytes(path)
        finally:
            path.unlink(missing_ok=True)

    # --- Internal path-based implementation ---

    def _parse_metadata_from_path(self, path: Path) -> AndroidMetadata:
        py_apk = PyAXMLAPK(str(path))

        package_name = py_apk.package
        version_code = int(py_apk.version_code) if py_apk.version_code else 0
        version_name = py_apk.version_name or ""
        app_label = py_apk.application or ""

        if not package_name or not version_code:
            raise ValueError("Could not extract package name or version code from APK.")

        return AndroidMetadata(
            package_name=package_name,
            version_code=version_code,
            version_name=version_name,
            app_label=app_label,
            signature_hash=self._get_signature_hash(path),
            is_debuggable=self._is_debuggable(path),
            architecture=self._get_architecture(path),
            file_hash=self._calculate_hash(path),
            file_size=path.stat().st_size,
        )


class AndroidBinaryDownloader:
    """Downloads an Android binary from remote storage as raw bytes."""

    def download(self, storage: StorageBackend, key: str) -> bytes:
        logger.info("Downloading %s from storage", key)
        return storage.download(key).read()


def get_apk_parser() -> APKParser:
    """FastAPI dependency: returns the real APK parser."""
    return AndroidBinaryService()


def get_apk_downloader() -> APKDownloader:
    """FastAPI dependency: returns the real APK downloader."""
    return AndroidBinaryDownloader()
