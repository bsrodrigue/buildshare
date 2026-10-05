from __future__ import annotations

from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.libs.errors import AppError, ErrorCode
from app.models.user import OneTimePassword, User, UserProfile
from app.schemas.user import TokenOut


def create_access_token(user_id: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_MINUTES),
        "iat": now,
        "iss": settings.JWT_ISSUER,
        "token_type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(days=settings.JWT_REFRESH_TOKEN_DAYS),
        "iat": now,
        "iss": settings.JWT_ISSUER,
        "token_type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise AppError("Token invalide ou expiré.", ErrorCode.AUTH_TOKEN_EXPIRED) from e


def create_tokens(user_id: int) -> TokenOut:
    return TokenOut(
        access=create_access_token(user_id),
        refresh=create_refresh_token(user_id),
    )


def refresh_access_token(refresh_token: str) -> str:
    payload = decode_token(refresh_token)
    if payload.get("token_type") != "refresh":
        raise AppError("Token de refresh invalide.", ErrorCode.AUTH_TOKEN_EXPIRED)
    user_id = int(payload["sub"])
    return create_access_token(user_id)


def user_create(
    db: Session, *, email: str, password: str, first_name: str = "", last_name: str = ""
) -> User:
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise AppError(
            "Un utilisateur avec cet email existe déjà.", ErrorCode.UNIQUE_CONSTRAINT_VIOLATED
        )

    user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
    )
    user.set_password(password)
    db.add(user)
    db.flush()

    profile = UserProfile(user_id=user.id)
    db.add(profile)
    db.flush()

    otp = OneTimePassword(
        user_id=user.id,
        code="123456",
        expires_at=datetime.now(UTC) + timedelta(minutes=15),
    )
    db.add(otp)
    db.flush()

    return user


def user_generate_otp(db: Session, *, user: User) -> OneTimePassword:
    stmt = (
        update(OneTimePassword)
        .where(OneTimePassword.user_id == user.id, OneTimePassword.is_used.is_(False))
        .values(is_used=True)
    )
    db.execute(stmt)

    otp = OneTimePassword(
        user_id=user.id,
        code="123456",
        expires_at=datetime.now(UTC) + timedelta(minutes=15),
    )
    db.add(otp)
    db.flush()
    return otp


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user or not user.check_password(password):
        raise AppError(
            "L'identifiant ou le mot de passe est incorrect.",
            ErrorCode.AUTH_INVALID_CREDENTIALS,
        )
    if not user.is_active:
        raise AppError("Ce compte est inactif.", ErrorCode.AUTH_USER_INACTIVE)
    return user


def get_user_by_id(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise AppError("Utilisateur non trouvé.", ErrorCode.AUTH_USER_NOT_FOUND)
    return user


def user_get_by_email(db: Session, *, email: str) -> User:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        raise AppError("Utilisateur non trouvé.", ErrorCode.AUTH_USER_NOT_FOUND)
    return user


def otp_verify(db: Session, *, email: str, code: str) -> None:
    user = user_get_by_email(db, email=email)
    otp = db.execute(
        select(OneTimePassword).where(
            OneTimePassword.user_id == user.id,
            OneTimePassword.code == code,
            OneTimePassword.is_used.is_(False),
            OneTimePassword.expires_at > datetime.now(UTC),
        )
    ).scalar_one_or_none()
    if not otp:
        raise AppError("Code invalide ou expiré.", ErrorCode.VALIDATION_ERROR)

    otp.is_used = True
    user.is_verified = True
    db.flush()
