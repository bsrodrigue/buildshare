from typing import Any

from django.urls import reverse
from rest_framework import serializers

from core.models import TaskJob
from users.serializers import UserSerializer

from .models import Application, Artifact, BugMessage, BugReport, Release, ReleaseTag


class ApplicationOutputSerializer(serializers.ModelSerializer[Application]):
    project = serializers.IntegerField(source="project.id")
    project_role = serializers.SerializerMethodField()
    latest_release = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = (
            "id",
            "project",
            "project_role",
            "app_id",
            "title",
            "description",
            "created_at",
            "latest_release",
        )

    def get_project_role(self, obj: Application) -> str | None:
        user = self.context["request"].user
        profile = obj.project.user_profiles.filter(user=user).first()
        return profile.role if profile else None

    def get_latest_release(self, obj: Application) -> Any | None:
        latest = obj.releases.order_by("-version_code").first()
        if not latest:
            return None
        return {
            "id": latest.id,
            "version_id": latest.version_id,
            "created_at": latest.created_at,
        }


class ApplicationInputSerializer(serializers.Serializer[dict[str, Any]]):
    project_id = serializers.IntegerField()
    app_id = serializers.CharField(max_length=255)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class ArtifactOutputSerializer(serializers.ModelSerializer[Artifact]):
    file_size_display = serializers.CharField(read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Artifact
        fields = (
            "id",
            "file",
            "architecture",
            "hash",
            "size",
            "file_size_display",
            "download_url",
            "created_at",
        )

    def get_download_url(self, obj: Artifact) -> str:
        request = self.context.get("request")
        path = reverse("api:artifact-download", kwargs={"artifact_id": obj.id})
        if request:
            return str(request.build_absolute_uri(path))
        return path


class BugMessageInputSerializer(serializers.Serializer[dict[str, Any]]):
    text = serializers.CharField(max_length=2000)


class BugMessageOutputSerializer(serializers.ModelSerializer[BugMessage]):
    user = UserSerializer(read_only=True)

    class Meta:
        model = BugMessage
        fields = ("id", "user", "text", "created_at")


class BugReportOutputSerializer(serializers.ModelSerializer[BugReport]):
    reporter = UserSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    messages_count = serializers.SerializerMethodField()

    class Meta:
        model = BugReport
        fields = (
            "id",
            "release",
            "reporter",
            "description",
            "status",
            "status_display",
            "messages_count",
            "created_at",
        )

    def get_messages_count(self, obj: BugReport) -> int:
        return obj.messages.count()


class BugReportInputSerializer(serializers.Serializer[dict[str, Any]]):
    description = serializers.CharField()


class ReleaseTagSerializer(serializers.ModelSerializer[ReleaseTag]):
    class Meta:
        model = ReleaseTag
        fields = ("id", "name", "color")


class ReleaseOutputSerializer(serializers.ModelSerializer[Release]):
    artifacts = ArtifactOutputSerializer(many=True, read_only=True)
    bugs_count = serializers.SerializerMethodField()
    open_bugs_count = serializers.SerializerMethodField()
    tags = ReleaseTagSerializer(many=True, read_only=True)

    class Meta:
        model = Release
        fields = (
            "id",
            "version_code",
            "version_id",
            "release_notes",
            "created_at",
            "artifacts",
            "bugs_count",
            "open_bugs_count",
            "application",
            "tags",
        )

    def get_bugs_count(self, obj: Release) -> int:
        return obj.bugs.count()

    def get_open_bugs_count(self, obj: Release) -> int:
        return obj.bugs.filter(status__in=["OPENED", "REOPENED"]).count()


class ArtifactInputSerializer(serializers.Serializer[dict[str, Any]]):
    application_id = serializers.IntegerField()
    version_code = serializers.IntegerField()
    version_id = serializers.CharField(max_length=50)
    release_notes = serializers.CharField(required=False, allow_blank=True, default="")
    file = serializers.FileField()
    architecture = serializers.CharField(required=False, allow_blank=True, default="")


class UploadIntentInputSerializer(serializers.Serializer[dict[str, Any]]):
    project_id = serializers.IntegerField()
    idempotency_key = serializers.CharField(max_length=255, required=False)


class UploadIntentOutputSerializer(serializers.Serializer[dict[str, Any]]):
    job_id = serializers.UUIDField()
    upload_url = serializers.URLField()


class ProcessAPKInputSerializer(serializers.Serializer[dict[str, Any]]):
    job_id = serializers.UUIDField()
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class TaskJobOutputSerializer(serializers.ModelSerializer[TaskJob]):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    app_title = serializers.SerializerMethodField()

    class Meta:
        model = TaskJob
        fields = (
            "id",
            "type",
            "status",
            "status_display",
            "error_message",
            "input_data",
            "output_data",
            "app_title",
            "started_at",
            "finished_at",
            "created_at",
        )

    def get_app_title(self, obj: TaskJob) -> str:
        return obj.output_data.get("application_title") or obj.input_data.get("title") or ""
