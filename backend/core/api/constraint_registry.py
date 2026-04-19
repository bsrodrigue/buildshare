from typing import NamedTuple

from core.errors import ErrorCode


class ConstraintMapping(NamedTuple):
    code: ErrorCode
    message: str
    field: str


class ConstraintRegistry:
    """
    Registry for database constraint mappings.
    constraint_pattern -> (code, message, field)
    """

    _mappings: dict[str, ConstraintMapping] = {}

    @classmethod
    def register(cls, pattern: str, code: ErrorCode, message: str, field: str):
        cls._mappings[pattern] = ConstraintMapping(code, message, field)

    @classmethod
    def get_mappings(cls) -> dict[str, ConstraintMapping]:
        return cls._mappings


# Standard Auth Translations
AUTH_MESSAGES: dict[str, tuple[ErrorCode, str]] = {
    "not_authenticated": (
        ErrorCode.AUTH_SESSION_EXPIRED,
        "Session expirée ou invalide.",
    ),
    "permission_denied": (
        ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        "Vous n'avez pas les permissions nécessaires.",
    ),
    "authentication_failed": (
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        "L'identifiant ou le mot de passe est incorrect.",
    ),
}
