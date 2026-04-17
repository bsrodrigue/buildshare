from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    name = 'projects'

    def ready(self):
        from core.api.constraint_registry import ConstraintRegistry
        from core.errors import ErrorCode
        from .constraints import UNIQUE_PROJECT_ADMIN

        # Register constraints for error mapping
        ConstraintRegistry.register(
            pattern="projects_userprojectprofile.project_id",  # SQLite pattern
            code=ErrorCode.PROJECT_ONLY_ONE_ADMIN,
            message="Un projet ne peut avoir qu'un seul administrateur.",
            field="project_id"
        )
        
        # Pattern for standard unique index if needed
        ConstraintRegistry.register(
            pattern=UNIQUE_PROJECT_ADMIN,
            code=ErrorCode.PROJECT_ONLY_ONE_ADMIN,
            message="Un projet ne peut avoir qu'un seul administrateur.",
            field="role"
        )
