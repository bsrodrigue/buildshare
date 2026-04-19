from django.apps import AppConfig


class BinariesConfig(AppConfig):
    name = "binaries"

    def ready(self) -> None:
        from core.api.constraint_registry import ConstraintRegistry  # noqa: PLC0415
        from core.errors import ErrorCode  # noqa: PLC0415

        from .constraints import (  # noqa: PLC0415
            UNIQUE_APP_PER_PROJECT,
            UNIQUE_ARTIFACT_ARCH_PER_RELEASE,
            UNIQUE_ARTIFACT_HASH_PER_RELEASE,
            UNIQUE_RELEASE_PER_APP,
        )

        # Register constraints for error mapping
        ConstraintRegistry.register(
            pattern="binaries_application.app_id",
            code=ErrorCode.APP_ALREADY_EXISTS,
            message="Une application avec cet ID existe déjà pour ce projet.",
            field="app_id",
        )

        ConstraintRegistry.register(
            pattern=UNIQUE_APP_PER_PROJECT,
            code=ErrorCode.APP_ALREADY_EXISTS,
            message="Une application avec cet ID existe déjà pour ce projet.",
            field="app_id",
        )

        ConstraintRegistry.register(
            pattern="binaries_release.version_code",
            code=ErrorCode.RELEASE_ALREADY_EXISTS,
            message="Une release avec ce code de version existe déjà pour cette application.",
            field="version_code",
        )

        ConstraintRegistry.register(
            pattern=UNIQUE_RELEASE_PER_APP,
            code=ErrorCode.RELEASE_ALREADY_EXISTS,
            message="Une release avec ce code de version existe déjà pour cette application.",
            field="version_code",
        )

        ConstraintRegistry.register(
            pattern=UNIQUE_ARTIFACT_HASH_PER_RELEASE,
            code=ErrorCode.ARTIFACT_ALREADY_EXISTS,
            message="Cet artefact existe déjà pour cette release.",
            field="file",
        )

        ConstraintRegistry.register(
            pattern=UNIQUE_ARTIFACT_ARCH_PER_RELEASE,
            code=ErrorCode.ARTIFACT_ALREADY_EXISTS,
            message="Une architecture identique existe déjà pour cette release.",
            field="architecture",
        )
