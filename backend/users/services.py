from django.db import transaction

from .models import User


def user_create(*, email: str, password: str, first_name: str = "", last_name: str = "") -> User:
    with transaction.atomic():
        return User.objects.create_user(
            email=email, password=password, first_name=first_name, last_name=last_name
        )
