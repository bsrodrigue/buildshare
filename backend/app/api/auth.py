from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.libs.errors import AppError, ErrorCode
from app.models.user import OneTimePassword, User
from app.schemas.user import (
    ChangeEmailInput,
    ChangeEmailVerifyInput,
    ChangePasswordInput,
    DeleteAccountInput,
    ForgotPasswordInput,
    LoginInput,
    MessageOut,
    RefreshInput,
    RefreshOut,
    RegisterInput,
    ResendOtpInput,
    ResetPasswordInput,
    TokenOut,
    UserOut,
    VerifyOtpInput,
)
from app.services.auth import (
    authenticate_user,
    create_access_token,
    create_password_reset_token,
    create_tokens,
    refresh_access_token,
    user_change_password,
    user_create,
    user_delete,
    user_generate_otp,
    verify_password_reset_token,
)
from app.services.email import (
    send_email_change_verification_email,
    send_password_reset_email,
)
from app.tasks.email import send_account_activated_email_task, send_otp_email_task

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

    user_name = f"{user.first_name} {user.last_name}".strip()
    otp = db.execute(
        select(OneTimePassword).where(
            OneTimePassword.user_id == user.id,
            OneTimePassword.is_used == False,  # noqa: E712
        )
    ).scalar_one_or_none()

    if otp:
        send_otp_email_task.delay(
            to_email=user.email,
            otp_code=otp.code,
            user_name=user_name,
        )

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
def refresh(data: RefreshInput, db: Session = Depends(get_db)):
    try:
        user_id = refresh_access_token(data.refresh)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": ErrorCode.AUTH_USER_INACTIVE,
                "message": "Ce compte est inactif.",
                "fields": {},
            },
        )

    return RefreshOut(access=create_access_token(user.id))


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
    otp = db.execute(
        select(OneTimePassword)
        .join(User)
        .where(
            User.email == data.email,
            OneTimePassword.code == data.code,
            OneTimePassword.is_used.is_(False),
            OneTimePassword.expires_at > datetime.now(UTC),
        )
    ).scalar_one_or_none()

    # Generic error on purpose: do not reveal whether the email exists.
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
    user = otp.user
    user.is_verified = True
    db.flush()

    user_name = f"{user.first_name} {user.last_name}".strip()
    send_account_activated_email_task.delay(
        to_email=user.email,
        user_name=user_name,
    )

    return MessageOut(message="Compte vérifié avec succès.")


@router.post("/resend-otp/", response_model=MessageOut)
def resend_otp(data: ResendOtpInput, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()

    # Always return success to prevent email enumeration.
    if user:
        try:
            otp = user_generate_otp(db, user=user)
        except AppError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": e.code, "message": e.message, "fields": {}},
            ) from e

        user_name = f"{user.first_name} {user.last_name}".strip()
        send_otp_email_task.delay(
            to_email=user.email,
            otp_code=otp.code,
            user_name=user_name,
        )

    return MessageOut(message="Nouveau code envoyé.")


@router.post("/forgot-password/", response_model=MessageOut)
def forgot_password(data: ForgotPasswordInput, db: Session = Depends(get_db)):
    """Send a password reset email if the account exists.

    Always returns success to prevent email enumeration.
    """
    user = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()

    if user and user.is_active:
        reset_token = create_password_reset_token(user.id)
        user_name = f"{user.first_name} {user.last_name}".strip()
        send_password_reset_email(
            to_email=user.email,
            reset_token=reset_token,
            user_name=user_name,
        )

    # Always return success to prevent email enumeration
    return MessageOut(
        message="Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."
    )


@router.post("/reset-password/", response_model=MessageOut)
def reset_password(data: ResetPasswordInput, db: Session = Depends(get_db)):
    """Reset a user's password using a valid reset token."""
    try:
        user_id = verify_password_reset_token(data.token)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "auth_val_004", "message": "Utilisateur non trouvé.", "fields": {}},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "auth_val_005", "message": "Ce compte est inactif.", "fields": {}},
        )

    user.set_password(data.new_password)
    db.flush()

    return MessageOut(message="Mot de passe réinitialisé avec succès.")


@router.post("/change-password/", response_model=MessageOut)
def change_password(
    data: ChangePasswordInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the current user's password after verifying the current password."""
    try:
        user_change_password(
            db,
            user=user,
            current_password=data.current_password,
            new_password=data.new_password,
        )
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    return MessageOut(message="Mot de passe changé avec succès.")


@router.post("/change-email/", response_model=MessageOut)
def change_email(
    data: ChangeEmailInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initiate email change — sends OTP to the new email address.

    The actual email change happens after verify-change-email.
    """
    # Verify current password
    if not user.check_password(data.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "auth_val_001",
                "message": "Le mot de passe est incorrect.",
                "fields": {},
            },
        )

    # Check if new email is already taken
    existing = db.execute(select(User).where(User.email == data.new_email)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "auth_val_008",
                "message": "Un utilisateur avec cet email existe déjà.",
                "fields": {},
            },
        )

    # Generate OTP for the new email, bound to that address
    otp = user_generate_otp(db, user=user, target_email=data.new_email)

    # Send OTP to the new email
    user_name = f"{user.first_name} {user.last_name}".strip()
    send_email_change_verification_email(
        to_email=data.new_email,
        otp_code=otp.code,
        user_name=user_name,
    )

    return MessageOut(message="Un code de vérification a été envoyé à la nouvelle adresse email.")


@router.post("/verify-change-email/", response_model=MessageOut)
def verify_change_email(
    data: ChangeEmailVerifyInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify the OTP sent to the new email and complete the email change."""
    # Find the OTP for this user, bound to the requested target email
    otp = db.execute(
        select(OneTimePassword).where(
            OneTimePassword.user_id == user.id,
            OneTimePassword.code == data.code,
            OneTimePassword.is_used.is_(False),
            OneTimePassword.expires_at > datetime.now(UTC),
            OneTimePassword.target_email == data.new_email,
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

    # Check if new email is still available
    existing = db.execute(select(User).where(User.email == data.new_email)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "auth_val_008",
                "message": "Un utilisateur avec cet email existe déjà.",
                "fields": {},
            },
        )

    # Mark OTP as used and update email
    otp.is_used = True
    user.email = data.new_email
    db.flush()

    return MessageOut(message="Adresse email changée avec succès.")


@router.post("/delete-account/", response_model=MessageOut)
def delete_account(
    data: DeleteAccountInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete the current user's account after verifying the password."""
    try:
        user_delete(db, user=user, password=data.password)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    return MessageOut(message="Compte supprimé avec succès.")
