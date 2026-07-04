from __future__ import annotations

from pathlib import Path
from typing import ClassVar

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config: ClassVar[SettingsConfigDict] = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server
    DEBUG: bool = True
    ALLOWED_HOSTS: list[str] = ["*"]

    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/db.sqlite3"

    # JWT
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ACCESS_TOKEN_MINUTES: int = 60
    JWT_REFRESH_TOKEN_DAYS: int = 1
    JWT_ISSUER: str = "appshare"
    JWT_ALGORITHM: str = "HS256"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage
    STORAGE_BACKEND: str = "s3"
    STORAGE_LOCAL_PATH: str = "./data/storage"

    # Cloudflare R2 / S3-compatible
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_ENDPOINT_URL: str = ""
    R2_PUBLIC_DOMAIN: str = ""

    @computed_field
    def celery_broker_url(self) -> str:
        return self.REDIS_URL

    @computed_field
    def celery_result_backend(self) -> str:
        return self.REDIS_URL


settings = Settings()
