from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer[Notification]):
    class Meta:
        model = Notification
        fields = ("id", "type", "title", "body", "payload", "read_at", "created_at")
        read_only_fields = fields
