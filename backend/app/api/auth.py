from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.errors import AppErrorRoute
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
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
    otp_verify,
    refresh_access_token,
    user_create,
    user_generate_otp,
    user_get_by_email,
)

router = APIRouter(prefix="/api/auth", tags=["auth"], route_class=AppErrorRoute)


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_verified=user.is_verified,
        created_at=user.created_at,
    )


@router.post("/register/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterInput, db: Session = Depends(get_db)):
    user = user_create(
        db,
        email=data.email,
        password=data.password,
        first_name=data.first_name,
        last_name=data.last_name,
    )
    return _user_out(user)


@router.post("/login/", response_model=TokenOut)
def login(data: LoginInput, db: Session = Depends(get_db)):
    user = authenticate_user(db, email=data.email, password=data.password)
    return create_tokens(user.id)


@router.post("/token/refresh/", response_model=RefreshOut)
def refresh(data: RefreshInput):
    return RefreshOut(access=refresh_access_token(data.refresh))


@router.get("/me/", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return _user_out(user)


@router.post("/verify-otp/", response_model=MessageOut)
def verify_otp(data: VerifyOtpInput, db: Session = Depends(get_db)):
    otp_verify(db, email=data.email, code=data.code)
    return MessageOut(message="Compte vérifié avec succès.")


@router.post("/resend-otp/", response_model=MessageOut)
def resend_otp(data: ResendOtpInput, db: Session = Depends(get_db)):
    user_generate_otp(db, user=user_get_by_email(db, email=data.email))
    return MessageOut(message="Nouveau code envoyé.")
