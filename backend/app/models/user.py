from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

import bcrypt
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.notification import Notification
    from app.models.project import UserProjectProfile
    from app.models.task_job import TaskJob

from app.models.base import BaseModel


class User(BaseModel):
    __tablename__ = "users_user"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    first_name: Mapped[str] = mapped_column(String(150), default="", nullable=False)
    last_name: Mapped[str] = mapped_column(String(150), default="", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_staff: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_joined: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    profile: Mapped[UserProfile | None] = relationship(
        "UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    otps: Mapped[list[OneTimePassword]] = relationship(
        "OneTimePassword", back_populates="user", cascade="all, delete-orphan"
    )
    user_project_profiles: Mapped[list[UserProjectProfile]] = relationship(
        "UserProjectProfile", back_populates="user", cascade="all, delete-orphan"
    )
    jobs: Mapped[list[TaskJob]] = relationship(
        "TaskJob", back_populates="user", cascade="all, delete-orphan"
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        self.password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode(
            "utf-8"
        )

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), self.password.encode("utf-8"))

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"


class UserProfile(BaseModel):
    __tablename__ = "users_userprofile"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users_user.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    bio: Mapped[str] = mapped_column(Text, default="", nullable=False)

    user: Mapped[User] = relationship("User", back_populates="profile")

    def __repr__(self) -> str:
        return f"<UserProfile user_id={self.user_id}>"


class OneTimePassword(BaseModel):
    __tablename__ = "users_onetimepassword"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users_user.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    target_email: Mapped[str | None] = mapped_column(String(254), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="otps")

    __table_args__ = (UniqueConstraint("user_id", "code", name="unique_user_otp"),)

    def is_expired(self) -> bool:
        return datetime.now(UTC) > self.expires_at

    def __repr__(self) -> str:
        return f"<OTP code={self.code} user_id={self.user_id}>"
