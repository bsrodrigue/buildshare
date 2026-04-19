from typing import Any

from .errors import ErrorCode


class ApplicationError(Exception):
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
