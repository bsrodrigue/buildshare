import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from .constraints import (
    CHECK_TASK_JOB_ERROR_ON_FAILURE,
    CHECK_TASK_JOB_FINISHED_AFTER_STARTED,
    CHECK_TASK_JOB_STARTED_AFTER_CREATED,
    UNIQUE_TASK_JOB_USER_TASK_IDEMPOTENCY,
)


class TaskJobStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    STARTED = "STARTED", "En cours"
    SUCCESS = "SUCCESS", "Réussite"
    FAILURE = "FAILURE", "Échec"
    CANCELLED = "CANCELLED", "Annulé"


class TaskJobType(models.TextChoices):
    BINARY_PROCESSING = "BINARY_PROCESSING", "Traitement de binaire"


class BaseModel(models.Model):
    created_at = models.DateTimeField(db_index=True, default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TaskJob(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="jobs",
        verbose_name="Utilisateur",
    )
    type = models.CharField("Type de tâche", max_length=50, choices=TaskJobType.choices)
    status = models.CharField(
        "Statut",
        max_length=50,
        choices=TaskJobStatus.choices,
        default=TaskJobStatus.PENDING,
    )

    input_data = models.JSONField("Données d'entrée", default=dict, blank=True)
    output_data = models.JSONField("Données de sortie", default=dict, blank=True)

    error_message = models.TextField("Message d'erreur", blank=True, default="")

    idempotency_key = models.CharField(
        "Clé d'idempotence",
        max_length=255,
        null=True,
        blank=True,
    )

    started_at = models.DateTimeField("Démarré le", null=True, blank=True)
    finished_at = models.DateTimeField("Terminé le", null=True, blank=True)
    expires_at = models.DateTimeField("Expire le", null=True, blank=True)

    class Meta:
        verbose_name = "Tâche de traitement"
        verbose_name_plural = "Tâches de traitement"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(started_at__isnull=True)
                | models.Q(started_at__gte=models.F("created_at")),
                name=CHECK_TASK_JOB_STARTED_AFTER_CREATED,
            ),
            models.CheckConstraint(
                condition=models.Q(finished_at__isnull=True)
                | models.Q(finished_at__gte=models.F("started_at")),
                name=CHECK_TASK_JOB_FINISHED_AFTER_STARTED,
            ),
            models.CheckConstraint(
                condition=~models.Q(status=TaskJobStatus.FAILURE) | ~models.Q(error_message=""),
                name=CHECK_TASK_JOB_ERROR_ON_FAILURE,
            ),
            models.UniqueConstraint(
                fields=["user", "type", "idempotency_key"],
                name=UNIQUE_TASK_JOB_USER_TASK_IDEMPOTENCY,
                condition=models.Q(idempotency_key__isnull=False),
            ),
        ]

    def __str__(self):
        return f"{self.type} - {self.status} ({self.id})"
