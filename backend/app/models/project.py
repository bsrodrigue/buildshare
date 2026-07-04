from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.binary import Application, ReleaseTag
    from app.models.user import User

from app.models.base import BaseModel


class Project(BaseModel):
    __tablename__ = "projects_project"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    user_profiles: Mapped[list[UserProjectProfile]] = relationship(
        "UserProjectProfile", back_populates="project", cascade="all, delete-orphan"
    )
    applications: Mapped[list[Application]] = relationship(
        "Application", back_populates="project", cascade="all, delete-orphan"
    )
    release_tags: Mapped[list[ReleaseTag]] = relationship(
        "ReleaseTag", back_populates="project", cascade="all, delete-orphan"
    )
    invitations: Mapped[list[ProjectInvitation]] = relationship(
        "ProjectInvitation", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Project id={self.id} title={self.title}>"


class UserProjectProfile(BaseModel):
    __tablename__ = "projects_userprojectprofile"

    class Role:
        ADMIN = "ADMIN"
        MEMBER = "MEMBER"

        CHOICES = [ADMIN, MEMBER]

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users_user.id"), nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects_project.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default=Role.MEMBER, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="user_project_profiles")
    project: Mapped[Project] = relationship("Project", back_populates="user_profiles")

    __table_args__ = (UniqueConstraint("user_id", "project_id", name="unique_user_project"),)

    def __repr__(self) -> str:
        parts = f"user_id={self.user_id} project_id={self.project_id} role={self.role}"
        return f"<UserProjectProfile {parts}>"


class ProjectInvitation(BaseModel):
    __tablename__ = "projects_projectinvitation"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects_project.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), default=UserProjectProfile.Role.MEMBER, nullable=False
    )
    inviter_id: Mapped[int] = mapped_column(ForeignKey("users_user.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)

    project: Mapped[Project] = relationship("Project", back_populates="invitations")
    inviter: Mapped[User] = relationship("User", foreign_keys=[inviter_id])

    __table_args__: tuple = ()

    def __repr__(self) -> str:
        return f"<ProjectInvitation id={self.id} email={self.email} status={self.status}>"
