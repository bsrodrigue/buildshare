from __future__ import annotations

from enum import StrEnum
from typing import Any


class ErrorCode(StrEnum):
    VALIDATION_ERROR = "gen_val_001"
    UNIQUE_CONSTRAINT_VIOLATED = "gen_val_002"
    RESOURCE_NOT_FOUND = "gen_val_003"

    AUTH_INVALID_CREDENTIALS = "auth_val_001"
    AUTH_TOKEN_EXPIRED = "auth_val_002"
    AUTH_INSUFFICIENT_PERMISSIONS = "auth_val_003"
    AUTH_USER_NOT_FOUND = "auth_val_004"
    AUTH_USER_INACTIVE = "auth_val_005"
    AUTH_SESSION_EXPIRED = "auth_val_006"

    PROJECT_NOT_FOUND = "prj_val_001"
    PROJECT_ALREADY_EXISTS = "prj_val_002"
    PROJECT_ONLY_ONE_ADMIN = "prj_val_003"

    APP_NOT_FOUND = "bin_val_001"
    APP_ALREADY_EXISTS = "bin_val_002"
    RELEASE_ALREADY_EXISTS = "bin_val_003"
    ARTIFACT_ALREADY_EXISTS = "bin_val_004"
    INVALID_BINARY_FORMAT = "bin_val_005"


class AppError(Exception):
    def __init__(
        self,
        message: str,
        code: ErrorCode = ErrorCode.VALIDATION_ERROR,
        extra: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.extra = extra or {}
