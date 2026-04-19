from typing import Any, cast

from rest_framework.exceptions import ErrorDetail

from core.errors import ErrorCode


def format_field_errors(data: Any) -> Any:
    """
    Recursively format field errors to include both message and code.
    Matches the expected format: { "field": [{"message": "...", "code": "..."}] }
    """
    if isinstance(data, dict):
        return {k: format_field_errors(v) for k, v in data.items()}
    if isinstance(data, list):
        return [format_field_errors(item) for item in data]
    if isinstance(data, ErrorDetail):
        return {"message": str(data), "code": str(data.code) if data.code else None}
    return data


def extract_error_code(exc: Any) -> str:
    """
    Extract the most pertintent error code from an exception.
    """
    if hasattr(exc, "get_codes"):
        codes = cast(Any, exc).get_codes()
        if isinstance(codes, dict):
            # Handle standard DRF token errors
            if codes.get("code") == "token_not_valid" or codes.get("detail") == "token_not_valid":
                return "token_not_valid"
            return ErrorCode.VALIDATION_ERROR
        return codes if isinstance(codes, str) else codes[0]

    if hasattr(exc, "default_code"):
        return str(getattr(exc, "default_code", ErrorCode.VALIDATION_ERROR))

    return ErrorCode.VALIDATION_ERROR


def extract_non_field_errors(formatted_fields: Any) -> tuple[Any, list[dict[str, Any]] | None]:
    """
    Separate specific field errors from global (non-field) errors.
    """
    if isinstance(formatted_fields, list) and formatted_fields:
        return {}, formatted_fields

    if isinstance(formatted_fields, dict):
        errors = formatted_fields.pop("non_field_errors", None) or formatted_fields.pop(
            "__all__", None
        )
        return formatted_fields, errors

    return formatted_fields, None


def promote_error(
    standardized_data: dict[str, Any], non_field_errors: list[dict[str, Any]]
) -> None:
    """
    Promote the first meaningful non-field error to the top-level message and code.
    """
    if not non_field_errors:
        return

    # Try to find an error with a meaningful code, otherwise take the first one
    error_to_promote = next(
        (e for e in non_field_errors if e.get("code") and e.get("code") != "None"),
        non_field_errors[0],
    )

    standardized_data["message"] = error_to_promote["message"]
    promoted_code = error_to_promote.get("code")
    if promoted_code and promoted_code != "None":
        standardized_data["code"] = promoted_code
