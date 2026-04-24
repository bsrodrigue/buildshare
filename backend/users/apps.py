from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = "users"

    def ready(self) -> None:
        import users.signals  # noqa: F401, PLC0415
