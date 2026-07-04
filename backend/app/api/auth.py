from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.libs.errors import AppError
from app.models.user import OneTimePassword, User
from app.schemas.user import (
    LoginInput,
    MessageOut,
    RefreshInput,
    RefreshOut,
    RegisterInput,
    ResendOtpInput,
    TokenOut,
    UserOut,
    VerifyOtpInput,
)
from app.services.auth import (
    authenticate_user,
    create_tokens,
    refresh_access_token,
    user_create,
    user_generate_otp,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterInput, db: Session = Depends(get_db)):
    try:
        user = user_create(
            db,
            email=data.email,
            password=data.password,
            first_name=data.first_name,
            last_name=data.last_name,
        )
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e
    return UserOut(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_verified=user.is_verified,
        created_at=user.created_at,
    )


@router.post("/login/", response_model=TokenOut)
def login(data: LoginInput, db: Session = Depends(get_db)):
    try:
        user = authenticate_user(db, email=data.email, password=data.password)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e
    return create_tokens(user.id)


@router.post("/token/refresh/", response_model=RefreshOut)
def refresh(data: RefreshInput):
    try:
        access = refresh_access_token(data.refresh)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e
    return RefreshOut(access=access)


@router.get("/me/", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_verified=user.is_verified,
        created_at=user.created_at,
    )


@router.post("/verify-otp/", response_model=MessageOut)
def verify_otp(data: VerifyOtpInput, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "auth_val_004", "message": "Utilisateur non trouvé.", "fields": {}},
        )

    otp = db.execute(
        select(OneTimePassword).where(
            OneTimePassword.user_id == user.id,
            OneTimePassword.code == data.code,
            not OneTimePassword.is_used,
            OneTimePassword.expires_at > datetime.now(UTC),
        )
    ).scalar_one_or_none()

    if not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "gen_val_001",
                "message": "Code invalide ou expiré.",
                "fields": {},
            },
        )

    otp.is_used = True
    user.is_verified = True
    db.flush()

    return MessageOut(message="Compte vérifié avec succès.")


@router.post("/resend-otp/", response_model=MessageOut)
def resend_otp(data: ResendOtpInput, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "auth_val_004", "message": "Utilisateur non trouvé.", "fields": {}},
        )

    try:
        user_generate_otp(db, user=user)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    return MessageOut(message="Nouveau code envoyé.")
