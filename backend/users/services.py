from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import OneTimePassword, User


def user_create(*, email: str, password: str, first_name: str = "", last_name: str = "") -> User:
    with transaction.atomic():
        user = User.objects.create_user(
            email=email, password=password, first_name=first_name, last_name=last_name
        )

        # Generate initial OTP (hardcoded for now as requested)
        OneTimePassword.objects.create(
            user=user, code="123456", expires_at=timezone.now() + timedelta(minutes=15)
        )

        return user


def user_generate_otp(*, user: User) -> OneTimePassword:
    """
    Generates a new OTP for a user. Inactivates previous ones.
    """
    with transaction.atomic():
        # Invalidate existing unused OTPs
        OneTimePassword.objects.filter(user=user, is_used=False).update(is_used=True)

        return OneTimePassword.objects.create(
            user=user, code="123456", expires_at=timezone.now() + timedelta(minutes=15)
        )
