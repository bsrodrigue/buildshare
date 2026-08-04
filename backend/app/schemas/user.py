from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    first_name: str = ""
    last_name: str = ""


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access: str
    refresh: str


class RefreshInput(BaseModel):
    refresh: str


class RefreshOut(BaseModel):
    access: str


class VerifyOtpInput(BaseModel):
    email: EmailStr
    code: str


class ResendOtpInput(BaseModel):
    email: EmailStr


class MessageOut(BaseModel):
    message: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    email: EmailStr
    code: str
    new_password: str


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str


class ChangeEmailInput(BaseModel):
    new_email: EmailStr
    password: str


class ChangeEmailVerifyInput(BaseModel):
    new_email: EmailStr
    code: str


class DeleteAccountInput(BaseModel):
    password: str
