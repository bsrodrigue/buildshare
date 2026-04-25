from typing import Any

from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.exceptions import ApplicationError
from users.models import User

from .models import Notification
from .serializers import NotificationSerializer
from .services import notification_bulk_mark_as_read, notification_mark_as_read


class NotificationViewSet(viewsets.ReadOnlyModelViewSet[Notification]):
    serializer_class = NotificationSerializer
    queryset = Notification.objects.none()

    def get_queryset(self) -> models.QuerySet[Notification]:
        user = self.request.user
        assert isinstance(user, User)
        return Notification.objects.filter(user=user)

    @action(detail=True, methods=["post"])
    def mark_as_read(self, request: Any, pk: Any = None) -> Response:  # noqa: ARG002
        notification = self.get_object()
        notification_mark_as_read(notification=notification)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def bulk_mark_as_read(self, request: Any) -> Response:
        notification_ids = request.data.get("notification_ids", [])
        if not isinstance(notification_ids, list):
            raise ApplicationError("ids must be a list")

        count = notification_bulk_mark_as_read(user=request.user, notification_ids=notification_ids)
        return Response({"count": count}, status=status.HTTP_200_OK)
