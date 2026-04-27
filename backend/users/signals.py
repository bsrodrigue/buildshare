from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User, UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender: type[User], instance: User, created: bool, **kwargs: Any) -> None:
    del sender, kwargs
    if created:
        UserProfile.objects.get_or_create(user=instance)
