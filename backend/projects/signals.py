from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from notifications.models import NotificationType
from notifications.services import notification_create
from users.models import User

from .models import ProjectInvitation, ProjectInvitationStatus


@receiver(post_save, sender=User)
def handle_pending_invitations(
    sender: type[User], instance: User, created: bool, **kwargs: Any
) -> None:
    """
    When a new user registers, check if they have any pending project invitations.
    If so, create notifications for them so they can discover and accept them.
    """
    del sender, kwargs
    if created:
        # Check for pending invitations sent to this email before the user registered
        invitations = ProjectInvitation.objects.filter(
            email=instance.email, status=ProjectInvitationStatus.PENDING
        ).select_related("project", "inviter")

        for invitation in invitations:
            notification_create(
                user=instance,
                type=NotificationType.PROJECT_INVITATION,
                title=f"Invitation au projet {invitation.project.title}",
                body=(
                    f"{invitation.inviter.email} vous a invité à rejoindre "
                    f"le projet {invitation.project.title}."
                ),
                payload={
                    "invitation_id": str(invitation.id),
                    "project_title": invitation.project.title,
                },
            )
