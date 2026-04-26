from django.utils import timezone
from rest_framework import serializers

from .models import Notification, NotificationType


class NotificationSerializer(serializers.ModelSerializer[Notification]):
    is_actionable = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            "id",
            "type",
            "title",
            "body",
            "payload",
            "read_at",
            "created_at",
            "is_actionable",
        )
        read_only_fields = fields

    def get_is_actionable(self, obj: Notification) -> bool:
        if obj.type == NotificationType.PROJECT_INVITATION:
            invitation_id = obj.payload.get("invitation_id")
            if not invitation_id:
                return False

            from projects.models import ProjectInvitation, ProjectInvitationStatus  # noqa: PLC0415

            invitation = ProjectInvitation.objects.filter(id=invitation_id).first()

            # Not actionable if handled or missing
            if not invitation or invitation.status != ProjectInvitationStatus.PENDING:
                return False

            # Not actionable if older than 7 days
            days_limit = 7
            if (timezone.now() - invitation.created_at).days > days_limit:
                return False

        return True
