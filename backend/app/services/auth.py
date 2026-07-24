from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.libs.errors import AppError, ErrorCode
from app.models.user import OneTimePassword, User, UserProfile
from app.schemas.user import TokenOut


def _generate_otp_code() -> str:
    """Generate a cryptographically secure 6-digit OTP code."""
    return f"{secrets.randbelow(1000000):06d}"


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
        if existing.is_verified:
            raise AppError(
                "Un utilisateur avec cet email existe déjà.",
                ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
            )
        existing.first_name = first_name
        existing.last_name = last_name
        existing.set_password(password)
        db.flush()
        stmt = (
            update(OneTimePassword)
            .where(
                OneTimePassword.user_id == existing.id,
                OneTimePassword.is_used == False,  # noqa: E712
            )
            .values(is_used=True)
        )
        db.execute(stmt)
        otp = OneTimePassword(
            user_id=existing.id,
            code=_generate_otp_code(),
            expires_at=datetime.now(UTC) + timedelta(minutes=15),
        )
        db.add(otp)
        db.flush()
        return existing

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
        code=_generate_otp_code(),
        expires_at=datetime.now(UTC) + timedelta(minutes=15),
    )
    db.add(otp)
    db.flush()

    return user


def user_generate_otp(db: Session, *, user: User) -> OneTimePassword:
    stmt = (
        update(OneTimePassword)
        .where(OneTimePassword.user_id == user.id, not OneTimePassword.is_used)
        .values(is_used=True)
    )
    db.execute(stmt)

    otp = OneTimePassword(
        user_id=user.id,
        code=_generate_otp_code(),
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
    if not user.is_verified:
        raise AppError(
            "Veuillez vérifier votre adresse email avant de vous connecter.",
            ErrorCode.AUTH_USER_NOT_VERIFIED,
        )
    return user


def get_user_by_id(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise AppError("Utilisateur non trouvé.", ErrorCode.AUTH_USER_NOT_FOUND)
    return user


def create_password_reset_token(user_id: int) -> str:
    """Create a short-lived token for password reset (1 hour expiry)."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(hours=1),
        "iat": now,
        "iss": settings.JWT_ISSUER,
        "token_type": "password_reset",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_password_reset_token(token: str) -> int:
    """Verify a password reset token and return the user_id.

    Raises AppError if token is invalid or expired.
    """
    payload = decode_token(token)
    if payload.get("token_type") != "password_reset":
        raise AppError("Token de réinitialisation invalide.", ErrorCode.AUTH_INVALID_RESET_TOKEN)
    return int(payload["sub"])


def create_email_change_token(user_id: int, new_email: str) -> str:
    """Create a short-lived token for email change (1 hour expiry)."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "new_email": new_email,
        "exp": now + timedelta(hours=1),
        "iat": now,
        "iss": settings.JWT_ISSUER,
        "token_type": "email_change",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_email_change_token(token: str) -> tuple[int, str]:
    """Verify an email change token and return (user_id, new_email).

    Raises AppError if token is invalid or expired.
    """
    payload = decode_token(token)
    if payload.get("token_type") != "email_change":
        raise AppError("Token de changement d'email invalide.", ErrorCode.AUTH_INVALID_RESET_TOKEN)
    return int(payload["sub"]), payload["new_email"]


def user_change_password(
    db: Session, *, user: User, current_password: str, new_password: str
) -> None:
    """Change a user's password after verifying the current password."""
    if not user.check_password(current_password):
        raise AppError(
            "Le mot de passe actuel est incorrect.",
            ErrorCode.AUTH_INVALID_CREDENTIALS,
        )
    user.set_password(new_password)
    db.flush()


def user_delete(db: Session, *, user: User, password: str) -> None:
    """Delete a user account after verifying the password."""
    if not user.check_password(password):
        raise AppError(
            "Le mot de passe est incorrect.",
            ErrorCode.AUTH_INVALID_CREDENTIALS,
        )
    db.delete(user)
    db.flush()
