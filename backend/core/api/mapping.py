from typing import Any, AnyStr

from core.api.constraint_registry import ConstraintMapping, ConstraintRegistry


def resolve_db_error[T: Exception](exc: T | AnyStr | Any) -> ConstraintMapping | None:
    """
    Attempts to map a database exception to a registered ConstraintMapping.
    """
    exc_str = str(exc)
    mappings = ConstraintRegistry.get_mappings()

    # Search for registered patterns in the exception message
    for pattern, mapping in mappings.items():
        if pattern in exc_str:
            return mapping

    return None


def get_error_message[T: Exception](
    exc: T | AnyStr | Any, fallback: str = "Une erreur de base de données est survenue."
) -> str:
    """
    Returns a human-readable error message for a database exception.
    """
    mapping = resolve_db_error(exc)
    if mapping:
        return mapping.message

    from django.db import IntegrityError  # noqa: PLC0415

    if isinstance(exc, IntegrityError) and "UNIQUE" in str(exc).upper():
        return "Cette ressource déjà existe."

    return fallback
