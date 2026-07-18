from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.libs.errors import AppError, ErrorCode
from app.models.notification import Notification
from app.models.project import Project, ProjectInvitation, UserProjectProfile
from app.models.user import User


def project_list(db: Session, *, user: User) -> list[Project]:
    stmt = (
        select(Project)
        .join(UserProjectProfile)
        .where(UserProjectProfile.user_id == user.id)
        .distinct()
    )
    return list(db.execute(stmt).scalars().all())


def project_get(db: Session, *, user: User, project_id: int) -> Project:
    stmt = (
        select(Project)
        .join(UserProjectProfile)
        .where(Project.id == project_id, UserProjectProfile.user_id == user.id)
    )
    project = db.execute(stmt).scalar_one_or_none()
    if not project:
        raise AppError("Projet non trouvé.", ErrorCode.PROJECT_NOT_FOUND)
    return project


def project_create(db: Session, *, title: str, description: str, user: User) -> Project:
    project = Project(title=title, description=description)
    db.add(project)
    db.flush()

    profile = UserProjectProfile(
        user_id=user.id, project_id=project.id, role=UserProjectProfile.Role.ADMIN
    )
    db.add(profile)
    db.flush()

    return project


def project_update(
    db: Session, *, project: Project, title: str, description: str, user: User
) -> Project:
    check_is_project_admin(db, user=user, project=project)

    project.title = title
    project.description = description
    db.flush()

    return project


def project_delete(db: Session, *, project: Project, user: User) -> None:
    check_is_project_admin(db, user=user, project=project)
    db.delete(project)
    db.flush()


def invitation_send(
    db: Session, *, project: Project, inviter: User, email: str, role: str
) -> ProjectInvitation:
    existing_member = db.execute(
        select(UserProjectProfile)
        .join(User)
        .where(
            UserProjectProfile.project_id == project.id,
            User.email == email,
        )
    ).scalar_one_or_none()
    if existing_member:
        raise AppError("L'utilisateur est déjà membre de ce projet.")

    existing_invitation = db.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.project_id == project.id,
            ProjectInvitation.email == email,
            ProjectInvitation.status == "PENDING",
        )
    ).scalar_one_or_none()
    if existing_invitation:
        raise AppError("Une invitation est déjà en attente pour cet email.")

    invitation = ProjectInvitation(
        project_id=project.id,
        inviter_id=inviter.id,
        email=email,
        role=role,
    )
    db.add(invitation)
    db.flush()

    invited_user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if invited_user:
        notification = Notification(
            user_id=invited_user.id,
            type="PROJECT_INVITATION",
            title=f"Invitation au projet {project.title}",
            body=f"{inviter.email} vous a invité à rejoindre le projet {project.title}.",
            payload={"invitation_id": str(invitation.id), "project_title": project.title},
        )
        db.add(notification)
        db.flush()

    return invitation


def invitation_accept(
    db: Session, *, invitation: ProjectInvitation, user: User
) -> UserProjectProfile:
    if invitation.email != user.email:
        raise AppError("Cette invitation ne vous est pas destinée.")
    if invitation.status != "PENDING":
        raise AppError("Cette invitation n'est plus valide.")

    invitation.status = "ACCEPTED"
    db.flush()

    existing_profile = db.execute(
        select(UserProjectProfile).where(
            UserProjectProfile.user_id == user.id,
            UserProjectProfile.project_id == invitation.project_id,
        )
    ).scalar_one_or_none()

    if existing_profile:
        existing_profile.role = invitation.role
        db.flush()
        return existing_profile

    profile = UserProjectProfile(
        user_id=user.id,
        project_id=invitation.project_id,
        role=invitation.role,
    )
    db.add(profile)
    db.flush()

    return profile


def invitation_reject(db: Session, *, invitation: ProjectInvitation, user: User) -> None:
    if invitation.email != user.email:
        raise AppError("Cette invitation ne vous est pas destinée.")
    if invitation.status != "PENDING":
        raise AppError("Cette invitation n'est plus valide.")

    invitation.status = "REJECTED"
    db.flush()


def project_membership_revoke(db: Session, *, project: Project, user: User, actor: User) -> None:
    is_self = user.id == actor.id
    is_admin = (
        db.execute(
            select(UserProjectProfile).where(
                UserProjectProfile.project_id == project.id,
                UserProjectProfile.user_id == actor.id,
                UserProjectProfile.role == UserProjectProfile.Role.ADMIN,
            )
        ).scalar_one_or_none()
        is not None
    )

    if not (is_self or is_admin):
        raise AppError("Vous n'avez pas les droits pour révoquer cette adhésion.")

    if is_self:
        profile = db.execute(
            select(UserProjectProfile).where(
                UserProjectProfile.project_id == project.id,
                UserProjectProfile.user_id == user.id,
                UserProjectProfile.role == UserProjectProfile.Role.ADMIN,
            )
        ).scalar_one_or_none()
        if profile:
            raise AppError(
                "L'administrateur ne peut pas quitter le projet sans nommer un remplaçant."
            )

    profile = db.execute(
        select(UserProjectProfile).where(
            UserProjectProfile.project_id == project.id,
            UserProjectProfile.user_id == user.id,
        )
    ).scalar_one_or_none()
    if profile:
        db.delete(profile)
        db.flush()


def get_user_role_in_project(db: Session, user: User, project: Project) -> str | None:
    profile = db.execute(
        select(UserProjectProfile).where(
            UserProjectProfile.user_id == user.id,
            UserProjectProfile.project_id == project.id,
        )
    ).scalar_one_or_none()
    return profile.role if profile else None


def is_project_admin(db: Session, *, user: User, project: Project) -> bool:
    return (
        db.execute(
            select(UserProjectProfile).where(
                UserProjectProfile.user_id == user.id,
                UserProjectProfile.project_id == project.id,
                UserProjectProfile.role == UserProjectProfile.Role.ADMIN,
            )
        ).scalar_one_or_none()
        is not None
    )


def check_is_project_admin(db: Session, *, user: User, project: Project) -> None:
    if not is_project_admin(db, user=user, project=project):
        raise AppError(
            "Seuls les administrateurs peuvent effectuer cette action.",
            ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        )


def is_project_member(db: Session, *, user: User, project: Project) -> bool:
    return (
        db.execute(
            select(UserProjectProfile).where(
                UserProjectProfile.user_id == user.id,
                UserProjectProfile.project_id == project.id,
            )
        ).scalar_one_or_none()
        is not None
    )


def check_is_project_member(db: Session, *, user: User, project: Project) -> None:
    if not is_project_member(db, user=user, project=project):
        raise AppError(
            "Vous n'êtes pas membre de ce projet.",
            ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        )
