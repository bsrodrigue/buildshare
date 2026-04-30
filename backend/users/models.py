from __future__ import annotations

from datetime import datetime
from typing import Any

from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from django_stubs_ext.db.models import TypedModelMeta

from core.models import BaseModel


class UserManager(BaseUserManager["User"]):
    def create_user(self, email: str, password: str | None = None, **extra_fields: Any) -> User:
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self, email: str, password: str | None = None, **extra_fields: Any
    ) -> User:
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser, BaseModel):
    username = None  # type: ignore[assignment]
    email: models.EmailField[str, str] = models.EmailField("Adresse email", unique=True)
    is_verified: models.BooleanField[bool, bool] = models.BooleanField("Vérifié", default=False)

    objects: UserManager = UserManager()  # type: ignore[assignment, misc]

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta(AbstractUser.Meta, TypedModelMeta):
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self) -> str:
        return str(self.email)


class UserProfile(BaseModel):
    user: models.OneToOneField[User | int, User] = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name="Utilisateur",
    )
    bio: models.TextField[str, str] = models.TextField("Biographie", blank=True, default="")

    objects: models.Manager[UserProfile] = models.Manager()  # type: ignore[assignment]

    class Meta(TypedModelMeta):
        verbose_name = "Profil Utilisateur"
        verbose_name_plural = "Profils Utilisateurs"

    def __str__(self) -> str:
        return f"Profil de {self.user.email}"


class OneTimePassword(BaseModel):
    user: models.ForeignKey[User | int, User] = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="otps",
        verbose_name="Utilisateur",
    )
    code: models.CharField[str, str] = models.CharField("Code", max_length=10)
    is_used: models.BooleanField[bool, bool] = models.BooleanField("Utilisé", default=False)
    expires_at: models.DateTimeField[datetime, datetime] = models.DateTimeField("Expire le")

    objects: models.Manager[OneTimePassword] = models.Manager()  # type: ignore[assignment]

    class Meta(TypedModelMeta):
        verbose_name = "Code OTP"
        verbose_name_plural = "Codes OTP"
        ordering = ["-created_at"]

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def __str__(self) -> str:
        return f"OTP {self.code} pour {self.user.email}"
