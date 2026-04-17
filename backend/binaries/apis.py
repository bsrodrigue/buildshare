from django.shortcuts import get_object_or_404
from rest_framework import exceptions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import Project

from .models import Application, Artifact, Release
from .services import application_create, artifact_create, release_create


class ApplicationApi(APIView):
    class OutputSerializer(serializers.ModelSerializer):
        project = serializers.IntegerField(source="project.id")

        class Meta:
            model = Application
            fields = ("id", "project", "app_id", "title", "description", "created_at")

    class InputSerializer(serializers.Serializer):
        project_id = serializers.IntegerField()
        app_id = serializers.CharField(max_length=255)
        title = serializers.CharField(max_length=255)
        description = serializers.CharField(required=False, allow_blank=True, default="")

    def get(self, request):
        project_id = request.query_params.get("project_id")
        if not project_id:
            raise exceptions.ValidationError({"project_id": "Ce champ est obligatoire."})

        project = get_object_or_404(Project, id=project_id, user_profiles__user=request.user)
        apps = Application.objects.filter(project=project)
        return Response(self.OutputSerializer(apps, many=True).data)

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = get_object_or_404(Project, id=serializer.validated_data.pop("project_id"))
        app = application_create(project=project, user=request.user, **serializer.validated_data)

        return Response(self.OutputSerializer(app).data, status=status.HTTP_201_CREATED)


class ArtifactUploadApi(APIView):
    class ArtifactOutputSerializer(serializers.ModelSerializer):
        release = serializers.IntegerField(source="release.id")

        class Meta:
            model = Artifact
            fields = ("id", "release", "file", "architecture", "hash", "created_at")

    class InputSerializer(serializers.Serializer):
        application_id = serializers.IntegerField()
        version_code = serializers.IntegerField()
        version_id = serializers.CharField(max_length=50)
        release_notes = serializers.CharField(required=False, allow_blank=True, default="")
        file = serializers.FileField()
        architecture = serializers.CharField(required=False, allow_blank=True, default="")

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        app = get_object_or_404(Application, id=serializer.validated_data.pop("application_id"))

        # Explicit Admin check at the boundary
        from .services import _check_is_project_admin
        _check_is_project_admin(user=request.user, project=app.project)

        version_code = serializer.validated_data.pop("version_code")

        try:
            release = Release.objects.get(application=app, version_code=version_code)
        except Release.DoesNotExist:
            release = release_create(
                application=app,
                version_code=version_code,
                version_id=serializer.validated_data.pop("version_id"),
                release_notes=serializer.validated_data.pop("release_notes"),
                user=request.user
            )

        artifact = artifact_create(
            release=release,
            file=serializer.validated_data.pop("file"),
            architecture=serializer.validated_data.pop("architecture"),
            user=request.user
        )

        return Response(self.ArtifactOutputSerializer(artifact).data, status=status.HTTP_201_CREATED)
