from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.libs.errors import AppError, ErrorCode
from app.models.user import User
from app.services.auth import decode_token, get_user_by_id
from app.services.storage import StorageBackend, get_storage_backend

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    if payload.get("token_type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": ErrorCode.AUTH_TOKEN_EXPIRED,
                "message": "Token invalide.",
                "fields": {},
            },
        )

    user_id = int(payload["sub"])
    try:
        return get_user_by_id(db, user_id)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e


def get_storage() -> StorageBackend:
    return get_storage_backend()
