from rest_framework import serializers

from core.models import TaskJob

from .models import Application, Artifact, Release


class ApplicationOutputSerializer(serializers.ModelSerializer):
    project = serializers.IntegerField(source="project.id")

    class Meta:
        model = Application
        fields = ("id", "project", "app_id", "title", "description", "created_at")


class ApplicationInputSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    app_id = serializers.CharField(max_length=255)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class ArtifactOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artifact
        fields = ("id", "file", "architecture", "hash", "created_at")


class ReleaseOutputSerializer(serializers.ModelSerializer):
    artifacts = ArtifactOutputSerializer(many=True, read_only=True)

    class Meta:
        model = Release
        fields = (
            "id",
            "version_code",
            "version_id",
            "release_notes",
            "created_at",
            "artifacts",
        )


class ArtifactInputSerializer(serializers.Serializer):
    application_id = serializers.IntegerField()
    version_code = serializers.IntegerField()
    version_id = serializers.CharField(max_length=50)
    release_notes = serializers.CharField(required=False, allow_blank=True, default="")
    file = serializers.FileField()
    architecture = serializers.CharField(required=False, allow_blank=True, default="")


class UploadIntentInputSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    idempotency_key = serializers.CharField(max_length=255, required=False)


class UploadIntentOutputSerializer(serializers.Serializer):
    job_id = serializers.UUIDField()
    upload_url = serializers.URLField()


class ProcessAPKInputSerializer(serializers.Serializer):
    job_id = serializers.UUIDField()
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class TaskJobOutputSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

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
            "started_at",
            "finished_at",
            "created_at",
        )
