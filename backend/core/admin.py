from django.contrib import admin

from .models import TaskJob


@admin.register(TaskJob)
class TaskJobAdmin(admin.ModelAdmin[TaskJob]):
    list_display = ("id", "type", "status", "user", "idempotency_key", "created_at")
    list_filter = ("status", "type", "created_at")
    search_fields = ("id", "user__email", "idempotency_key", "error_message")
    readonly_fields = ("id", "created_at", "updated_at", "started_at", "finished_at")

    fieldsets = (
        (None, {"fields": ("id", "user", "type", "status", "idempotency_key")}),
        ("Données", {"fields": ("input_data", "output_data", "error_message")}),
        (
            "Dates",
            {"fields": ("created_at", "updated_at", "started_at", "finished_at", "expires_at")},
        ),
    )

    def has_add_permission(self, _request: object) -> bool:
        return False  # Jobs should be created via code, not admin UI
