import pytest
from django.db import transaction
from django.db.utils import IntegrityError

from notifications.models import Notification
from projects.models import Project, ProjectInvitation
from users.models import User


@pytest.mark.django_db
class TestDatabaseConstraints:
    @pytest.fixture
    def user(self):
        return User.objects.create_user(email="test@example.com", password="password")

    @pytest.fixture
    def project(self, user):
        return Project.objects.create(title="Test")

    def test_notification_type_constraint(self, user):
        with pytest.raises(IntegrityError), transaction.atomic():
            Notification.objects.create(user=user, type="INVALID_TYPE", title="Title", body="Body")

    def test_project_invitation_status_constraint(self, user, project):
        with pytest.raises(IntegrityError), transaction.atomic():
            ProjectInvitation.objects.create(
                project=project, inviter=user, email="target@example.com", status="INVALID_STATUS"
            )

    def test_project_invitation_role_constraint(self, user, project):
        with pytest.raises(IntegrityError), transaction.atomic():
            ProjectInvitation.objects.create(
                project=project, inviter=user, email="target@example.com", role="INVALID_ROLE"
            )
