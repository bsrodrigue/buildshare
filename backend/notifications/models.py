from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from users.models import User

from django.conf import settings
from django.db import models
from django_stubs_ext.db.models import TypedModelMeta

from core.models import BaseModel

from .constraints import CHECK_NOTIFICATION_TYPE_VALID


class NotificationType(models.TextChoices):
    PROJECT_INVITATION = "PROJECT_INVITATION", "Invitation à un projet"
    SYSTEM_ALERT = "SYSTEM_ALERT", "Alerte système"


class Notification(BaseModel):
    id: models.UUIDField[uuid.UUID | str, uuid.UUID] = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    user: models.ForeignKey[User | int, User] = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="Utilisateur",
    )
    type: models.CharField[str, str] = models.CharField(
        "Type", max_length=50, choices=NotificationType.choices
    )
    title: models.CharField[str, str] = models.CharField("Titre", max_length=255)
    body: models.TextField[str, str] = models.TextField("Contenu", blank=True)
    payload: models.JSONField[dict[str, Any], dict[str, Any]] = models.JSONField(
        "Données", default=dict, blank=True
    )
    read_at: models.DateTimeField[datetime | str | None, datetime | None] = models.DateTimeField(
        "Lu le", null=True, blank=True
    )

    class Meta(TypedModelMeta):
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(type__in=NotificationType.values),
                name=CHECK_NOTIFICATION_TYPE_VALID,
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.type} - {self.title}"
