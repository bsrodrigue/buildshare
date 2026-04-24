from django.db import transaction

from .models import User, UserProfile


def user_create(*, email: str, password: str, first_name: str = "", last_name: str = "") -> User:
    with transaction.atomic():
        user = User.objects.create_user(
            email=email, password=password, first_name=first_name, last_name=last_name
        )
        UserProfile.objects.create(user=user)
        return user
