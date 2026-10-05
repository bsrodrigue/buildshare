from __future__ import annotations

from fastapi import HTTPException, Request
from fastapi.routing import APIRoute

from app.libs.errors import AppError, ErrorCode

_STATUS = {
    ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS: 403,
    ErrorCode.RESOURCE_NOT_FOUND: 404,
    ErrorCode.PROJECT_NOT_FOUND: 404,
    ErrorCode.APP_NOT_FOUND: 404,
    ErrorCode.AUTH_USER_NOT_FOUND: 404,
    ErrorCode.AUTH_INVALID_CREDENTIALS: 401,
    ErrorCode.AUTH_USER_INACTIVE: 401,
    ErrorCode.AUTH_TOKEN_EXPIRED: 401,
}


def http_error(e: AppError) -> HTTPException:
    return HTTPException(
        status_code=_STATUS.get(e.code, 400),
        detail={"code": e.code, "message": e.message, "fields": {}},
    )


class AppErrorRoute(APIRoute):
    """Route class that turns service-layer AppError into the HTTP error body."""

    def get_route_handler(self):
        handler = super().get_route_handler()

        async def wrapped(request: Request):
            try:
                return await handler(request)
            except AppError as e:
                raise http_error(e) from e

        return wrapped
