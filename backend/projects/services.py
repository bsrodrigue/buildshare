from django.db import transaction

from core.exceptions import ApplicationError
from notifications.models import NotificationType
from notifications.services import notification_create
from users.models import User

from .models import Project, ProjectInvitation, ProjectInvitationStatus, UserProjectProfile


@transaction.atomic
def project_create(*, title: str, description: str = "", user: User) -> Project:
    project = Project(title=title, description=description)
    project.full_clean()
    project.save()

    UserProjectProfile.objects.create(
        user=user, project=project, role=UserProjectProfile.Role.ADMIN
    )

    return project


@transaction.atomic
def project_update(*, project: Project, title: str, description: str = "") -> Project:
    project.title = title
    project.description = description
    project.full_clean()
    project.save()

    return project


@transaction.atomic
def project_delete(*, project: Project) -> None:
    project.delete()


@transaction.atomic
def invitation_send(
    *, project: Project, inviter: User, email: str, role: str = UserProjectProfile.Role.MEMBER
) -> ProjectInvitation:
    # Check if user already in project
    if UserProjectProfile.objects.filter(project=project, user__email=email).exists():
        raise ApplicationError("L'utilisateur est déjà membre de ce projet.")

    # Check for pending invitation
    if ProjectInvitation.objects.filter(
        project=project, email=email, status=ProjectInvitationStatus.PENDING
    ).exists():
        raise ApplicationError("Une invitation est déjà en attente pour cet email.")

    invitation = ProjectInvitation(project=project, inviter=inviter, email=email, role=role)
    invitation.full_clean()
    invitation.save()

    # Trigger notification if user exists
    invited_user = User.objects.filter(email=email).first()
    if invited_user:
        notification_create(
            user=invited_user,
            type=NotificationType.PROJECT_INVITATION,
            title=f"Invitation au projet {project.title}",
            body=f"{inviter.email} vous a invité à rejoindre le projet {project.title}.",
            payload={"invitation_id": str(invitation.id), "project_title": project.title},
        )

    return invitation


@transaction.atomic
def invitation_accept(*, invitation: ProjectInvitation, user: User) -> UserProjectProfile:
    if invitation.email != user.email:
        raise ApplicationError("Cette invitation ne vous est pas destinée.")

    if invitation.status != ProjectInvitationStatus.PENDING:
        raise ApplicationError("Cette invitation n'est plus valide.")

    invitation.status = ProjectInvitationStatus.ACCEPTED
    invitation.save(update_fields=["status"])

    # Ensure uniqueness (UniqueConstraint will catch this but service should handle gracefully)
    profile, created = UserProjectProfile.objects.get_or_create(
        user=user, project=invitation.project, defaults={"role": invitation.role}
    )

    if not created:
        profile.role = invitation.role
        profile.save(update_fields=["role"])

    return profile


@transaction.atomic
def invitation_reject(*, invitation: ProjectInvitation, user: User) -> None:
    if invitation.email != user.email:
        raise ApplicationError("Cette invitation ne vous est pas destinée.")

    if invitation.status != ProjectInvitationStatus.PENDING:
        raise ApplicationError("Cette invitation n'est plus valide.")

    invitation.status = ProjectInvitationStatus.REJECTED
    invitation.save(update_fields=["status"])


@transaction.atomic
def project_membership_revoke(*, project: Project, user: User, actor: User) -> None:
    # Actor must be the user themselves or an ADMIN of the project
    is_self = user == actor
    is_admin = project.user_profiles.filter(user=actor, role=UserProjectProfile.Role.ADMIN).exists()

    if not (is_self or is_admin):
        raise ApplicationError("Vous n'avez pas les droits pour révoquer cette adhésion.")

    # Prevent project from having no admin if the last admin leaves
    if (
        is_self
        and project.user_profiles.filter(user=user, role=UserProjectProfile.Role.ADMIN).exists()
    ):
        # Check if there are other admins
        # (though constraint UNIQUE_PROJECT_ADMIN says there is only one)
        # So we prevent the only admin from leaving without handing over
        raise ApplicationError(
            "L'administrateur ne peut pas quitter le projet sans nommer un remplaçant."
        )

    UserProjectProfile.objects.filter(project=project, user=user).delete()
