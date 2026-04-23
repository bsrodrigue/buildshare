import pytest
from rest_framework import status
from rest_framework.test import APIClient

from notifications.models import Notification, NotificationType
from users.models import User


@pytest.mark.django_db
class TestNotificationAPI:
    @pytest.fixture
    def client(self):
        return APIClient()

    @pytest.fixture
    def user(self):
        return User.objects.create_user(email="notif_api@example.com", password="password")

    def test_list_notifications(self, client, user):
        Notification.objects.create(user=user, type=NotificationType.SYSTEM_ALERT, title="N1")

        client.force_authenticate(user=user)
        response = client.get("/api/notifications/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_mark_as_read_api(self, client, user):
        notif = Notification.objects.create(
            user=user, type=NotificationType.SYSTEM_ALERT, title="N1"
        )

        client.force_authenticate(user=user)
        url = f"/api/notifications/{notif.id}/mark_as_read/"
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        notif.refresh_from_db()
        assert notif.read_at is not None

    def test_bulk_mark_as_read_api(self, client, user):
        n1 = Notification.objects.create(user=user, type=NotificationType.SYSTEM_ALERT, title="1")
        n2 = Notification.objects.create(user=user, type=NotificationType.SYSTEM_ALERT, title="2")

        client.force_authenticate(user=user)
        url = "/api/notifications/bulk_mark_as_read/"
        response = client.post(url, {"notification_ids": [str(n1.id), str(n2.id)]}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2
        assert Notification.objects.filter(user=user, read_at__isnull=False).count() == 2
