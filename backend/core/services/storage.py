from typing import Any

import boto3
from botocore.config import Config
from django.conf import settings


class R2StorageService:
    def __init__(self) -> None:
        self.account_id: str = settings.R2_ACCOUNT_ID
        self.access_key_id: str = settings.R2_ACCESS_KEY_ID
        self.secret_access_key: str = settings.R2_SECRET_ACCESS_KEY
        self.bucket_name: str = settings.R2_BUCKET_NAME
        self.endpoint_url: str = settings.R2_ENDPOINT_URL

    def get_client(self) -> Any:
        """Returns a configured boto3 client for Cloudflare R2."""
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",  # R2 expects 'auto'
        )

    def get_upload_url(self, key: str, expires: int = 3600) -> str:
        """
        Generates a presigned PUT URL for uploading a file directly to R2.
        """
        client = self.get_client()
        url = client.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expires,
        )
        return str(url)

    def download_file(self, key: str, local_path: str) -> None:
        """
        Downloads a file from R2 to the local filesystem.
        """
        client = self.get_client()
        client.download_file(self.bucket_name, key, local_path)
