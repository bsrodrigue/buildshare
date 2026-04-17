from django.apps import AppConfig


class BinariesConfig(AppConfig):
    name = 'binaries'

    def ready(self):
        from core.api.constraint_registry import ConstraintRegistry
        from core.errors import ErrorCode
        from .constraints import UNIQUE_APP_PER_PROJECT, UNIQUE_RELEASE_PER_APP

        # Register constraints for error mapping
        ConstraintRegistry.register(
            pattern="binaries_application.app_id",
            code=ErrorCode.APP_ALREADY_EXISTS,
            message="Une application avec cet ID existe déjà pour ce projet.",
            field="app_id"
        )
        
        ConstraintRegistry.register(
            pattern=UNIQUE_APP_PER_PROJECT,
            code=ErrorCode.APP_ALREADY_EXISTS,
            message="Une application avec cet ID existe déjà pour ce projet.",
            field="app_id"
        )

        ConstraintRegistry.register(
            pattern="binaries_release.version_code",
            code=ErrorCode.RELEASE_ALREADY_EXISTS,
            message="Une release avec ce code de version existe déjà pour cette application.",
            field="version_code"
        )
        
        ConstraintRegistry.register(
            pattern=UNIQUE_RELEASE_PER_APP,
            code=ErrorCode.RELEASE_ALREADY_EXISTS,
            message="Une release avec ce code de version existe déjà pour cette application.",
            field="version_code"
        )
