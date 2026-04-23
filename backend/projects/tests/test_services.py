import pytest

from notifications.models import Notification, NotificationType
from projects.models import ProjectInvitationStatus, UserProjectProfile
from projects.services import (
    invitation_accept,
    invitation_reject,
    invitation_send,
    project_create,
    project_membership_revoke,
)
from users.models import User


@pytest.mark.django_db
class TestProjectMembershipFlow:
    @pytest.fixture
    def admin_user(self):
        return User.objects.create_user(email="admin@example.com", password="password")

    @pytest.fixture
    def target_user(self):
        return User.objects.create_user(email="user@example.com", password="password")

    @pytest.fixture
    def project(self, admin_user):
        return project_create(title="Test Project", user=admin_user)

    def test_invitation_send_success(self, project, admin_user, target_user):
        invitation = invitation_send(
            project=project,
            inviter=admin_user,
            email=target_user.email,
            role=UserProjectProfile.Role.MEMBER,
        )

        assert invitation.status == ProjectInvitationStatus.PENDING
        assert invitation.email == target_user.email
        assert invitation.role == UserProjectProfile.Role.MEMBER

        # Check notification
        notif = Notification.objects.filter(user=target_user).first()
        assert notif is not None
        assert notif.type == NotificationType.PROJECT_INVITATION
        assert notif.payload["invitation_id"] == str(invitation.id)

    def test_invitation_send_duplicate_fails(self, project, admin_user, target_user):
        invitation_send(project=project, inviter=admin_user, email=target_user.email)

        with pytest.raises(ValueError, match="Une invitation est déjà en attente"):
            invitation_send(project=project, inviter=admin_user, email=target_user.email)

    def test_invitation_accept_success(self, project, admin_user, target_user):
        invitation = invitation_send(project=project, inviter=admin_user, email=target_user.email)

        profile = invitation_accept(invitation=invitation, user=target_user)

        assert profile.user == target_user
        assert profile.project == project
        assert profile.role == UserProjectProfile.Role.MEMBER

        invitation.refresh_from_db()
        assert invitation.status == ProjectInvitationStatus.ACCEPTED

    def test_invitation_reject_success(self, project, admin_user, target_user):
        invitation = invitation_send(project=project, inviter=admin_user, email=target_user.email)

        invitation_reject(invitation=invitation, user=target_user)

        invitation.refresh_from_db()
        assert invitation.status == ProjectInvitationStatus.REJECTED

    def test_membership_revoke_self(self, project, admin_user):
        # Admin can't leave if only one admin (as per service logic)
        with pytest.raises(ValueError, match="L'administrateur ne peut pas quitter le projet"):
            project_membership_revoke(project=project, user=admin_user, actor=admin_user)

        # Add another user and make them admin (though app constraint UNIQUE_PROJECT_ADMIN might exist)
        # Wait, let's check UNIQUE_PROJECT_ADMIN.

    def test_membership_revoke_by_admin(self, project, admin_user, target_user):
        # Setup: Target user accepts invitation
        invitation = invitation_send(project=project, inviter=admin_user, email=target_user.email)
        invitation_accept(invitation=invitation, user=target_user)

        assert UserProjectProfile.objects.filter(project=project, user=target_user).exists()

        # Admin revokes membership
        project_membership_revoke(project=project, user=target_user, actor=admin_user)

        assert not UserProjectProfile.objects.filter(project=project, user=target_user).exists()

    def test_membership_revoke_unauthorized(self, project, admin_user, target_user):
        another_user = User.objects.create_user(email="other@example.com", password="password")

        with pytest.raises(ValueError, match="Vous n'avez pas les droits"):
            project_membership_revoke(project=project, user=admin_user, actor=another_user)
