from __future__ import annotations

import io
import logging
import shutil
from pathlib import Path
from typing import BinaryIO, Protocol

import boto3
from botocore.config import Config

from app.config import settings

logger = logging.getLogger(__name__)


class StorageBackend(Protocol):
    def upload(self, fileobj: BinaryIO, key: str) -> str: ...
    def download(self, key: str) -> BinaryIO: ...
    def delete(self, key: str) -> None: ...
    def presigned_upload_url(self, key: str, expires: int = 3600) -> str | None: ...
    def presigned_download_url(self, key: str, expires: int = 3600) -> str | None: ...
    def download_file(self, key: str, local_path: str) -> None: ...


class S3StorageBackend:
    def __init__(self) -> None:
        self.access_key_id: str = settings.R2_ACCESS_KEY_ID
        self.secret_access_key: str = settings.R2_SECRET_ACCESS_KEY
        self.bucket_name: str = settings.R2_BUCKET_NAME
        self.endpoint_url: str = settings.R2_ENDPOINT_URL

    def _client(self):
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )

    def presigned_upload_url(self, key: str, expires: int = 3600) -> str:
        client = self._client()
        url = client.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expires,
        )
        return str(url)

    def presigned_download_url(self, key: str, expires: int = 3600) -> str:
        client = self._client()
        url = client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expires,
        )
        return str(url)

    def download_file(self, key: str, local_path: str) -> None:
        client = self._client()
        client.download_file(self.bucket_name, key, local_path)

    def upload(self, fileobj: BinaryIO, key: str) -> str:
        client = self._client()
        client.upload_fileobj(fileobj, self.bucket_name, key)
        return f"{self.endpoint_url}/{self.bucket_name}/{key}"

    def download(self, key: str) -> BinaryIO:
        client = self._client()
        buf = io.BytesIO()
        client.download_fileobj(self.bucket_name, key, buf)
        buf.seek(0)
        return buf

    def delete(self, key: str) -> None:
        client = self._client()
        client.delete_object(Bucket=self.bucket_name, Key=key)


class LocalStorageBackend:
    def __init__(self) -> None:
        self.base_path = Path(settings.STORAGE_LOCAL_PATH)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        full_path = (self.base_path / key).resolve()
        if not str(full_path).startswith(str(self.base_path.resolve())):
            raise ValueError(f"Invalid key: {key}")
        return full_path

    def upload(self, fileobj: BinaryIO, key: str) -> str:
        path = self._resolve(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("wb") as f:
            shutil.copyfileobj(fileobj, f)
        return str(path)

    def download(self, key: str) -> BinaryIO:
        path = self._resolve(key)
        return path.open("rb")

    def delete(self, key: str) -> None:
        path = self._resolve(key)
        if path.exists():
            path.unlink()

    def presigned_upload_url(self, _key: str, _expires: int = 3600) -> str | None:
        return None

    def presigned_download_url(self, _key: str, _expires: int = 3600) -> str | None:
        return None

    def download_file(self, key: str, local_path: str) -> None:
        path = self._resolve(key)
        shutil.copy2(path, local_path)


def get_storage_backend() -> StorageBackend:
    backend_type = settings.STORAGE_BACKEND
    if backend_type == "s3":
        if settings.R2_ENDPOINT_URL:
            return S3StorageBackend()
        logger.warning("R2_ENDPOINT_URL not set, falling back to local storage")
        return LocalStorageBackend()
    if backend_type == "local":
        return LocalStorageBackend()
    raise ValueError(f"Unknown storage backend: {backend_type}")
