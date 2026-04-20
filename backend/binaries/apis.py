from django.shortcuts import get_object_or_404
from rest_framework import exceptions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import TaskJob, TaskJobType
from core.services.storage import R2StorageService
from projects.models import Project
from users.models import User

from .models import Application, Release
from .selectors import application_get, application_list
from .serializers import (
    ApplicationInputSerializer,
    ApplicationOutputSerializer,
    ArtifactInputSerializer,
    ArtifactOutputSerializer,
    ProcessAPKInputSerializer,
    ReleaseOutputSerializer,
    TaskJobOutputSerializer,
    UploadIntentInputSerializer,
    UploadIntentOutputSerializer,
)
from .services import (
    _check_is_project_admin,
    application_create,
    application_delete,
    application_update,
    artifact_create,
    release_create,
)
from .tasks import process_apk_task


class ApplicationApi(APIView):
    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        project_id = request.query_params.get("project_id")
        if not project_id:
            raise exceptions.ValidationError({"project_id": "Ce champ est obligatoire."})

        project = get_object_or_404(Project, id=project_id, user_profiles__user=request.user)
        apps = application_list(project=project)
        return Response(ApplicationOutputSerializer(apps, many=True).data)

    def post(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        serializer = ApplicationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = get_object_or_404(Project, id=serializer.validated_data.pop("project_id"))
        app = application_create(project=project, user=request.user, **serializer.validated_data)

        return Response(ApplicationOutputSerializer(app).data, status=status.HTTP_201_CREATED)


class ApplicationDetailApi(APIView):
    def get(self, request: Request, application_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        app = application_get(user=request.user, application_id=application_id)
        return Response(ApplicationOutputSerializer(app).data)

    def put(self, request: Request, application_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        app = application_get(user=request.user, application_id=application_id)

        # We reuse ApplicationInputSerializer but we don't need project_id/app_id from user input
        # since they are already known and shouldn't be changed.
        serializer = ApplicationInputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        app = application_update(
            application=app,
            user=request.user,
            title=serializer.validated_data.get("title", app.title),
            description=serializer.validated_data.get("description", app.description),
        )

        return Response(ApplicationOutputSerializer(app).data)

    def delete(self, request: Request, application_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        app = application_get(user=request.user, application_id=application_id)

        application_delete(application=app, user=request.user)

        return Response(status=status.HTTP_204_NO_CONTENT)


class ArtifactUploadApi(APIView):
    def post(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        serializer = ArtifactInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        app = get_object_or_404(Application, id=serializer.validated_data.pop("application_id"))

        # Explicit Admin check at the boundary
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
                user=request.user,
            )

        artifact = artifact_create(
            release=release,
            file=serializer.validated_data.pop("file"),
            architecture=serializer.validated_data.pop("architecture"),
            user=request.user,
        )

        return Response(ArtifactOutputSerializer(artifact).data, status=status.HTTP_201_CREATED)


class UploadIntentApi(APIView):
    def post(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        serializer = UploadIntentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_id = serializer.validated_data["project_id"]
        idempotency_key = serializer.validated_data.get("idempotency_key")

        # Validate that the user has access to this project
        get_object_or_404(Project, id=project_id, user_profiles__user=request.user)

        # Idempotency check: reuse existing job if same key is provided
        job = None
        if idempotency_key:
            job = TaskJob.objects.filter(
                user=request.user,
                type=TaskJobType.BINARY_PROCESSING,
                idempotency_key=idempotency_key,
            ).first()

        if not job:
            job = TaskJob.objects.create(
                user=request.user,
                type=TaskJobType.BINARY_PROCESSING,
                idempotency_key=idempotency_key,
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
    def post(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        serializer = ProcessAPKInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        job = get_object_or_404(
            TaskJob,
            id=serializer.validated_data["job_id"],
            user=request.user,
            type=TaskJobType.BINARY_PROCESSING,
        )

        process_apk_task.delay(
            job_id=str(job.id),
            title=serializer.validated_data.get("title"),
            description=serializer.validated_data.get("description"),
        )

        return Response({"message": "Tâche démarrée"}, status=status.HTTP_202_ACCEPTED)


class TaskJobApi(APIView):
    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        project_id = request.query_params.get("project_id")
        jobs = TaskJob.objects.filter(user=request.user)

        if project_id:
            # Filter jobs that were started for this project
            jobs = jobs.filter(input_data__project_id=int(project_id))

        return Response(TaskJobOutputSerializer(jobs, many=True).data)


class ReleaseApi(APIView):
    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        application_id = request.query_params.get("application_id")
        if not application_id:
            raise exceptions.ValidationError({"application_id": "Ce champ est obligatoire."})

        # Validate that the user has access to the project containing this application
        application = get_object_or_404(
            Application, id=application_id, project__user_profiles__user=request.user
        )

        releases = (
            Release.objects.filter(application=application)
            .prefetch_related("artifacts")
            .order_by("-version_code")
        )

        return Response(ReleaseOutputSerializer(releases, many=True).data)
