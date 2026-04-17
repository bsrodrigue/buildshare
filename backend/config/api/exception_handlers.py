from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from core.errors import ErrorCode
from core.exceptions import ApplicationError
from core.api.constraint_registry import ConstraintRegistry, AUTH_MESSAGES
from core.api.exception_utils import (
    format_field_errors,
    extract_error_code,
    extract_non_field_errors,
    promote_error
)


def _handle_integrity_error(exc: IntegrityError) -> Response | None:
    """
    Handle database integrity errors by matching against Registered Constraints.
    """
    exc_str = str(exc)
    mappings = ConstraintRegistry.get_mappings()

    for pattern, mapping in mappings.items():
        if pattern in exc_str:
            return Response(
                {
                    "code": ErrorCode.VALIDATION_ERROR,
                    "message": "Certains champs sont invalides.",
                    "fields": {
                        mapping.field: [{"message": mapping.message, "code": mapping.code}]
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    if "UNIQUE" in exc_str.upper():
        return Response(
            {
                "code": ErrorCode.UNIQUE_CONSTRAINT_VIOLATED,
                "message": "Cette ressource existe déjà.",
                "fields": {},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return None


def _handle_application_error(exc: ApplicationError) -> Response:
    """
    Handle project-specific ApplicationError.
    """
    return Response(
        {
            "code": exc.code,
            "message": exc.message,
            "fields": exc.extra.get("fields", {}),
        },
        status=status.HTTP_400_BAD_REQUEST
    )


def _apply_auth_translations(standardized_data: dict, code: str) -> None:
    """
    Apply French translations for standard auth error codes.
    """
    if code in AUTH_MESSAGES:
        standardized_data["code"], standardized_data["message"] = AUTH_MESSAGES[code]
        return

    # Fallback search by message if code is generic
    msg = standardized_data.get("message")
    if msg in AUTH_MESSAGES:
        standardized_data["code"], standardized_data["message"] = AUTH_MESSAGES[msg]


def custom_exception_handler(exc, context):
    """
    Robust DRF exception handler with standardized error responses:
    {
        "code": "...",
        "message": "...",
        "fields": { "field": [{"message": "...", "code": "..."}] }
    }
    """
    # 1. Database Integrity Errors
    if isinstance(exc, IntegrityError):
        if (response := _handle_integrity_error(exc)) is not None:
            return response

    # 2. Project-specific Application Errors
    if isinstance(exc, ApplicationError):
        return _handle_application_error(exc)

    # 3. Convert Django ValidationError to DRF
    if isinstance(exc, DjangoValidationError):
        # We handle this by letting it fall through to DRF's validation error
        # but normally one would convert it here if needed for non-view contexts.
        # For now, we rely on services calling full_clean() which might raise this.
        # If it's a Django ValidationError, we wrap it in a DRF one.
        from rest_framework.serializers import as_serializer_error
        exc = exceptions.ValidationError(as_serializer_error(exc))

    # 4. Standard DRF Exception Handling
    response = exception_handler(exc, context)
    if response is None:
        return None

    # 5. Standardize Response Data
    code = extract_error_code(exc)
    standardized_data = {
        "code": code,
        "message": "",
        "fields": {},
    }

    if isinstance(exc, exceptions.ValidationError):
        standardized_data["message"] = "Certains champs sont invalides."
        formatted_fields = format_field_errors(response.data)
        formatted_fields, non_field_errors = extract_non_field_errors(formatted_fields)

        if non_field_errors:
            promote_error(standardized_data, non_field_errors)

        standardized_data["fields"] = formatted_fields
    else:
        # For non-validation errors (NotFound, PermissionDenied, etc.)
        detail = response.data.get("detail", str(exc))
        standardized_data["message"] = str(detail)

    # 6. Post-processing (Translations, etc.)
    _apply_auth_translations(standardized_data, code)

    response.data = standardized_data
    return response
