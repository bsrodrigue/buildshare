from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.errors import AppErrorRoute
from app.database import get_db
from app.dependencies import get_current_user
from app.models.project import Project
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
from app.services.auth import get_user_by_id

router = APIRouter(prefix="/api/projects", tags=["projects"], route_class=AppErrorRoute)


def _project_out(db: Session, user: User, project: Project) -> ProjectOut:
    return ProjectOut(
        id=project.id,
        title=project.title,
        description=project.description,
        created_at=project.created_at,
        role=project_service.get_user_role_in_project(db, user, project),
    )


def _invitation_out(inv, inviter_email: str) -> ProjectInvitationOut:
    return ProjectInvitationOut(
        id=inv.id,
        project=inv.project_id,
        project_title=inv.project.title if inv.project else "",
        email=inv.email,
        role=inv.role,
        inviter=inviter_email,
        status=inv.status,
        created_at=inv.created_at,
    )


@router.get("/", response_model=list[ProjectOut])
def list_projects(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [_project_out(db, user, p) for p in project_service.project_list(db, user=user)]


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = project_service.project_create(
        db, title=data.title, description=data.description, user=user
    )
    return _project_out(db, user, project)


@router.get("/{project_id}/", response_model=ProjectOut)
def get_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = project_service.project_get(db, user=user, project_id=project_id)
    return _project_out(db, user, project)


@router.put("/{project_id}/", response_model=ProjectOut)
def update_project(
    project_id: int,
    data: ProjectInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = project_service.project_get(db, user=user, project_id=project_id)
    project = project_service.project_update(
        db, project=project, title=data.title, description=data.description, user=user
    )
    return _project_out(db, user, project)


@router.delete("/{project_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = project_service.project_get(db, user=user, project_id=project_id)
    project_service.project_delete(db, project=project, user=user)


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
    project = project_service.project_get(db, user=user, project_id=project_id)
    project_service.check_is_project_admin(db, user=user, project=project)
    invitation = project_service.invitation_send(
        db, project=project, inviter=user, email=data.email, role=data.role
    )
    return _invitation_out(invitation, user.email)


@router.get("/invitations/me/", response_model=list[ProjectInvitationOut])
def list_my_invitations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [
        _invitation_out(inv, inv.inviter.email if inv.inviter else "")
        for inv in project_service.invitation_list_pending(db, user=user)
    ]


@router.post("/invitations/{invitation_id}/{action}/", response_model=StatusOut)
def handle_invitation(
    invitation_id: UUID,
    action: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = project_service.invitation_respond(
        db, user=user, invitation_id=invitation_id, action=action
    )
    return StatusOut(status=result)


@router.get("/{project_id}/members/", response_model=list[ProjectMemberOut])
def list_members(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [
        ProjectMemberOut(
            user_id=p.user_id,
            email=p.user.email if p.user else "",
            first_name=p.user.first_name if p.user else "",
            last_name=p.user.last_name if p.user else "",
            role=p.role,
            created_at=p.created_at,
        )
        for p in project_service.project_member_list(db, user=user, project_id=project_id)
    ]


@router.delete("/{project_id}/members/{user_id}/", status_code=status.HTTP_204_NO_CONTENT)
def revoke_membership(
    project_id: int,
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = project_service.project_get(db, user=user, project_id=project_id)
    target_user = get_user_by_id(db, user_id)
    project_service.project_membership_revoke(db, project=project, user=target_user, actor=user)
