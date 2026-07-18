from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.libs.errors import AppError
from app.models.project import Project, ProjectInvitation, UserProjectProfile
from app.models.user import User
from app.schemas.project import (
    ProjectInput,
    ProjectInvitationInput,
    ProjectInvitationOut,
    ProjectMemberOut,
    ProjectOut,
    StatusOut,
)
from app.services import project as project_service

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/", response_model=list[ProjectOut])
def list_projects(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projects = project_service.project_list(db, user=user)
    result = []
    for p in projects:
        role = project_service.get_user_role_in_project(db, user, p)
        result.append(
            ProjectOut(
                id=p.id,
                title=p.title,
                description=p.description,
                created_at=p.created_at,
                role=role,
            )
        )
    return result


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = project_service.project_create(
        db, title=data.title, description=data.description, user=user
    )
    return ProjectOut(
        id=project.id,
        title=project.title,
        description=project.description,
        created_at=project.created_at,
        role="ADMIN",
    )


@router.get("/{project_id}/", response_model=ProjectOut)
def get_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.project_get(db, user=user, project_id=project_id)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    role = project_service.get_user_role_in_project(db, user, project)
    return ProjectOut(
        id=project.id,
        title=project.title,
        description=project.description,
        created_at=project.created_at,
        role=role,
    )


@router.put("/{project_id}/", response_model=ProjectOut)
def update_project(
    project_id: int,
    data: ProjectInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.project_get(db, user=user, project_id=project_id)
        project = project_service.project_update(
            db, project=project, title=data.title, description=data.description, user=user
        )
    except AppError as e:
        code = (
            status.HTTP_404_NOT_FOUND if "NOT_FOUND" in str(e.code) else status.HTTP_403_FORBIDDEN
        )
        raise HTTPException(
            status_code=code,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    return ProjectOut(
        id=project.id,
        title=project.title,
        description=project.description,
        created_at=project.created_at,
    )


@router.delete("/{project_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.project_get(db, user=user, project_id=project_id)
        project_service.project_delete(db, project=project, user=user)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e


@router.post(
    "/{project_id}/invitations/",
    response_model=ProjectInvitationOut,
    status_code=status.HTTP_201_CREATED,
)
def send_invitation(
    project_id: int,
    data: ProjectInvitationInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.project_get(db, user=user, project_id=project_id)
        project_service.check_is_project_admin(db, user=user, project=project)
        invitation = project_service.invitation_send(
            db, project=project, inviter=user, email=data.email, role=data.role
        )
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    return ProjectInvitationOut(
        id=invitation.id,
        project=invitation.project_id,
        project_title=project.title,
        email=invitation.email,
        role=invitation.role,
        inviter=user.email,
        status=invitation.status,
        created_at=invitation.created_at,
    )


@router.get("/invitations/me/", response_model=list[ProjectInvitationOut])
def list_my_invitations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(ProjectInvitation).where(
        ProjectInvitation.email == user.email,
        ProjectInvitation.status == "PENDING",
    )
    invitations = list(db.execute(stmt).scalars().all())
    result = []
    for inv in invitations:
        project = db.get(Project, inv.project_id)
        result.append(
            ProjectInvitationOut(
                id=inv.id,
                project=inv.project_id,
                project_title=project.title if project else "",
                email=inv.email,
                role=inv.role,
                inviter=inv.inviter.email if inv.inviter else "",
                status=inv.status,
                created_at=inv.created_at,
            )
        )
    return result


@router.post("/invitations/{invitation_id}/{action}/", response_model=StatusOut)
def handle_invitation(
    invitation_id: UUID,
    action: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invitation = db.execute(
        select(ProjectInvitation).where(ProjectInvitation.id == invitation_id)
    ).scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "gen_val_003",
                "message": "Invitation non trouvée.",
                "fields": {},
            },
        )

    try:
        if action == "accept":
            project_service.invitation_accept(db, invitation=invitation, user=user)
            return StatusOut(status="accepted")
        if action == "reject":
            project_service.invitation_reject(db, invitation=invitation, user=user)
            return StatusOut(status="rejected")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "gen_val_001",
                "message": "Action non valide.",
                "fields": {},
            },
        )
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e


@router.get("/{project_id}/members/", response_model=list[ProjectMemberOut])
def list_members(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.project_get(db, user=user, project_id=project_id)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e

    stmt = select(UserProjectProfile).where(UserProjectProfile.project_id == project.id)
    profiles = list(db.execute(stmt).scalars().all())

    result = []
    for p in profiles:
        member_user = db.get(User, p.user_id)
        result.append(
            ProjectMemberOut(
                user_id=p.user_id,
                email=member_user.email if member_user else "",
                first_name=member_user.first_name if member_user else "",
                last_name=member_user.last_name if member_user else "",
                role=p.role,
                created_at=p.created_at,
            )
        )
    return result


@router.delete("/{project_id}/members/{user_id}/", status_code=status.HTTP_204_NO_CONTENT)
def revoke_membership(
    project_id: int,
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        project = project_service.project_get(db, user=user, project_id=project_id)
        target_user = db.get(User, user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "gen_val_003",
                    "message": "Utilisateur non trouvé.",
                    "fields": {},
                },
            )
        project_service.project_membership_revoke(db, project=project, user=target_user, actor=user)
    except AppError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message, "fields": {}},
        ) from e
