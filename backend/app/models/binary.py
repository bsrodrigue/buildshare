from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.project import Project

from app.models.base import BaseModel
from app.models.user import User


class Application(BaseModel):
    __tablename__ = "binaries_application"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects_project.id"), nullable=False)
    app_id: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    app_signature: Mapped[str | None] = mapped_column(String(64), nullable=True)

    project: Mapped[Project] = relationship("Project", back_populates="applications")
    releases: Mapped[list[Release]] = relationship(
        "Release", back_populates="application", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("project_id", "app_id", "app_signature", name="unique_app_per_project"),
    )

    def __repr__(self) -> str:
        return f"<Application id={self.id} app_id={self.app_id} title={self.title}>"


class ReleaseTag(BaseModel):
    __tablename__ = "binaries_releasetag"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects_project.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#6200EE", nullable=False)

    project: Mapped[Project] = relationship("Project", back_populates="release_tags")

    __table_args__ = (UniqueConstraint("project_id", "name", name="unique_tag_per_project"),)

    def __repr__(self) -> str:
        return f"<ReleaseTag id={self.id} name={self.name}>"


class Release(BaseModel):
    __tablename__ = "binaries_release"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("binaries_application.id"), nullable=False
    )
    version_code: Mapped[int] = mapped_column(nullable=False)
    version_id: Mapped[str] = mapped_column(String(50), nullable=False)
    release_notes: Mapped[str] = mapped_column(Text, default="", nullable=False)

    application: Mapped[Application] = relationship("Application", back_populates="releases")
    artifacts: Mapped[list[Artifact]] = relationship(
        "Artifact", back_populates="release", cascade="all, delete-orphan"
    )
    bugs: Mapped[list[BugReport]] = relationship(
        "BugReport", back_populates="release", cascade="all, delete-orphan"
    )
    tags: Mapped[list[ReleaseTag]] = relationship(
        "ReleaseTag", secondary="binaries_release_tags", backref="releases"
    )

    __table_args__ = (
        UniqueConstraint("application_id", "version_code", name="unique_release_per_app"),
    )

    def __repr__(self) -> str:
        return f"<Release id={self.id} version_code={self.version_code}>"


class ReleaseTagAssociation(BaseModel):
    __tablename__ = "binaries_release_tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    release_id: Mapped[int] = mapped_column(ForeignKey("binaries_release.id"), nullable=False)
    releasetag_id: Mapped[int] = mapped_column(ForeignKey("binaries_releasetag.id"), nullable=False)


class Artifact(BaseModel):
    __tablename__ = "binaries_artifact"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    release_id: Mapped[int] = mapped_column(ForeignKey("binaries_release.id"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    architecture: Mapped[str] = mapped_column(String(50), default="", nullable=False)
    hash: Mapped[str] = mapped_column(String(64), nullable=False)
    size: Mapped[int | None] = mapped_column(nullable=True)

    release: Mapped[Release] = relationship("Release", back_populates="artifacts")

    __table_args__ = (
        UniqueConstraint("release_id", "hash", name="unique_artifact_hash_per_release"),
        UniqueConstraint("release_id", "architecture", name="unique_artifact_arch_per_release"),
    )

    def __repr__(self) -> str:
        return f"<Artifact id={self.id} release_id={self.release_id} arch={self.architecture}>"


class BugReport(BaseModel):
    __tablename__ = "binaries_bugreport"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    release_id: Mapped[int] = mapped_column(ForeignKey("binaries_release.id"), nullable=False)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users_user.id"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT", nullable=False)

    release: Mapped[Release] = relationship("Release", back_populates="bugs")
    reporter: Mapped[User] = relationship("User", foreign_keys=[reporter_id])
    messages: Mapped[list[BugMessage]] = relationship(
        "BugMessage", back_populates="bug", cascade="all, delete-orphan"
    )

    __table_args__: tuple = ()

    def __repr__(self) -> str:
        return f"<BugReport id={self.id} status={self.status}>"


class BugMessage(BaseModel):
    __tablename__ = "binaries_bugmessage"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bug_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("binaries_bugreport.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users_user.id"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    bug: Mapped[BugReport] = relationship("BugReport", back_populates="messages")
    user: Mapped[User] = relationship("User", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return f"<BugMessage id={self.id} bug_id={self.bug_id}>"
