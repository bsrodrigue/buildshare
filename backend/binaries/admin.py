from django.contrib import admin

from .models import Application, Artifact, BugMessage, BugReport, Release


class ArtifactInline(admin.TabularInline[Artifact, Release]):
    model = Artifact
    extra = 1


class BugMessageInline(admin.TabularInline[BugMessage, BugReport]):
    model = BugMessage
    extra = 1


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin[Application]):
    list_display = ("title", "app_id", "project", "created_at")
    list_filter = ("project",)
    search_fields = ("title", "app_id", "description")
    autocomplete_fields = ["project"]


@admin.register(Release)
class ReleaseAdmin(admin.ModelAdmin[Release]):
    list_display = ("application", "version_id", "version_code", "created_at")
    list_filter = ("application__project", "application")
    search_fields = ("application__title", "version_id", "release_notes")
    inlines = [ArtifactInline]
    autocomplete_fields = ["application"]


@admin.register(Artifact)
class ArtifactAdmin(admin.ModelAdmin[Artifact]):
    list_display = ("release", "architecture", "hash", "created_at")
    list_filter = ("architecture", "release__application")
    search_fields = ("release__application__title", "hash")
    autocomplete_fields = ["release"]


@admin.register(BugReport)
class BugReportAdmin(admin.ModelAdmin[BugReport]):
    list_display = ("id", "release", "reporter", "status", "created_at")
    list_filter = ("status", "release__application")
    search_fields = ("description", "reporter__email")
    inlines = [BugMessageInline]
    autocomplete_fields = ["release", "reporter"]
