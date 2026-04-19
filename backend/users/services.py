from .models import User


def user_create(*, email: str, password: str, first_name: str = "", last_name: str = "") -> User:
    return User.objects.create_user(
        email=email, password=password, first_name=first_name, last_name=last_name
    )  # type: ignore[no-any-return]
