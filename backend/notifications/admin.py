from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin[Notification]):
    list_display = ("user", "type", "title", "read_at", "created_at")
    list_filter = ("type", "read_at", "created_at")
    search_fields = ("user__email", "title", "body")
    ordering = ("-created_at",)
    readonly_fields = ("id", "created_at", "updated_at")
