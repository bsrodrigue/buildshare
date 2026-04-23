import pytest

from notifications.models import Notification, NotificationType
from notifications.services import (
    notification_bulk_mark_as_read,
    notification_create,
    notification_mark_as_read,
)
from users.models import User


@pytest.mark.django_db
class TestNotificationServices:
    @pytest.fixture
    def user(self):
        return User.objects.create_user(email="notif@example.com", password="password")

    def test_notification_create(self, user):
        notif = notification_create(
            user=user, type=NotificationType.SYSTEM_ALERT, title="Hello", body="World"
        )

        assert notif.user == user
        assert notif.type == NotificationType.SYSTEM_ALERT
        assert notif.read_at is None

    def test_notification_mark_as_read(self, user):
        notif = notification_create(user=user, type=NotificationType.SYSTEM_ALERT, title="T")

        updated = notification_mark_as_read(notification=notif)

        assert updated.read_at is not None

    def test_notification_bulk_mark_as_read(self, user):
        notif1 = notification_create(user=user, type=NotificationType.SYSTEM_ALERT, title="1")
        notif2 = notification_create(user=user, type=NotificationType.SYSTEM_ALERT, title="2")

        count = notification_bulk_mark_as_read(
            user=user, notification_ids=[str(notif1.id), str(notif2.id)]
        )

        assert count == 2
        assert Notification.objects.filter(user=user, read_at__isnull=False).count() == 2
