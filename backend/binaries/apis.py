from django.shortcuts import get_object_or_404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import TaskJob, TaskJobType
from core.services.storage import R2StorageService
from projects.models import Project

from .models import Application, Release
from .selectors import application_list
from .serializers import (
    ApplicationInputSerializer,
    ArtifactInputSerializer,
    ArtifactOutputSerializer,
    ProcessAPKInputSerializer,
    UploadIntentInputSerializer,
    UploadIntentOutputSerializer,
)
from .services import application_create, artifact_create, release_create


class ApplicationApi(APIView):
    def get(self, request):
        project_id = request.query_params.get("project_id")
        if not project_id:
            raise exceptions.ValidationError({"project_id": "Ce champ est obligatoire."})

        project = get_object_or_404(Project, id=project_id, user_profiles__user=request.user)
        apps = application_list(project=project)
        return Response(ApplicationOutputSerializer(apps, many=True).data)

    def post(self, request):
        serializer = ApplicationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = get_object_or_404(Project, id=serializer.validated_data.pop("project_id"))
        app = application_create(project=project, user=request.user, **serializer.validated_data)

        return Response(ApplicationOutputSerializer(app).data, status=status.HTTP_201_CREATED)


class ArtifactUploadApi(APIView):
    def post(self, request):
        serializer = ArtifactInputSerializer(data=request.data)
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

        return Response(ArtifactOutputSerializer(artifact).data, status=status.HTTP_201_CREATED)


class UploadIntentApi(APIView):
    def post(self, request):
        serializer = UploadIntentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_id = serializer.validated_data["project_id"]
        # Validate that the user has access to this project
        get_object_or_404(Project, id=project_id, user_profiles__user=request.user)

        job = TaskJob.objects.create(
            user=request.user,
            type=TaskJobType.BINARY_PROCESSING,
        )

        storage_service = R2StorageService()
        key = f"uploads/{job.id}.apk"
        upload_url = storage_service.get_upload_url(key)

        job.input_data = {"r2_path": key, "project_id": project_id}
        job.save()

        return Response(
            UploadIntentOutputSerializer({"job_id": job.id, "upload_url": upload_url}).data,
            status=status.HTTP_201_CREATED,
        )


class ProcessAPKApi(APIView):
    def post(self, request):
        serializer = ProcessAPKInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        job = get_object_or_404(
            TaskJob,
            id=serializer.validated_data["job_id"],
            user=request.user,
            type=TaskJobType.BINARY_PROCESSING,
        )

        from .tasks import process_apk_task

        process_apk_task.delay(
            job_id=str(job.id),
            title=serializer.validated_data.get("title"),
            description=serializer.validated_data.get("description"),
        )

        return Response({"message": "Tâche démarrée"}, status=status.HTTP_202_ACCEPTED)
