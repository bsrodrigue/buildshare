from django.http import FileResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from rest_framework import exceptions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import TaskJob, TaskJobType
from core.services.storage import R2StorageService
from projects.models import Project
from users.models import User

from .models import Application, Artifact, BugReport, Release, ReleaseTag
from .selectors import application_get, application_list, bug_list, bug_message_list
from .serializers import (
    ApplicationInputSerializer,
    ApplicationOutputSerializer,
    ArtifactInputSerializer,
    ArtifactOutputSerializer,
    BugMessageInputSerializer,
    BugMessageOutputSerializer,
    BugReportInputSerializer,
    BugReportOutputSerializer,
    ProcessAPKInputSerializer,
    ReleaseOutputSerializer,
    ReleaseTagSerializer,
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
    bug_create,
    bug_message_create,
    bug_transition,
    release_create,
    release_tag_create,
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
        return Response(
            ApplicationOutputSerializer(apps, many=True, context={"request": request}).data
        )

    def post(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        serializer = ApplicationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = get_object_or_404(Project, id=serializer.validated_data.pop("project_id"))
        app = application_create(project=project, user=request.user, **serializer.validated_data)

        return Response(
            ApplicationOutputSerializer(app, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ApplicationDetailApi(APIView):
    def get(self, request: Request, application_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        app = application_get(user=request.user, application_id=application_id)
        return Response(ApplicationOutputSerializer(app, context={"request": request}).data)

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

        return Response(ApplicationOutputSerializer(app, context={"request": request}).data)

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

        # Validate that the user is an ADMIN of the project
        project = get_object_or_404(Project, id=project_id)
        _check_is_project_admin(user=request.user, project=project)

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

        # Double check permission on the project associated with the job
        project_id = job.input_data.get("project_id")
        if project_id:
            project = get_object_or_404(Project, id=project_id)
            _check_is_project_admin(user=request.user, project=project)

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


class ReleaseDetailApi(APIView):
    def get(self, request: Request, release_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        release = get_object_or_404(
            Release, id=release_id, application__project__user_profiles__user=request.user
        )
        return Response(ReleaseOutputSerializer(release, context={"request": request}).data)

    def patch(self, request: Request, release_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        release = get_object_or_404(
            Release, id=release_id, application__project__user_profiles__user=request.user
        )
        _check_is_project_admin(user=request.user, project=release.application.project)

        tag_ids = request.data.get("tag_ids")
        if tag_ids is not None:
            # Validate tags belong to the project
            tags = ReleaseTag.objects.filter(id__in=tag_ids, project=release.application.project)
            release.tags.set(tags)

        return Response(ReleaseOutputSerializer(release, context={"request": request}).data)


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
            .prefetch_related("artifacts", "tags")
            .order_by("-version_code")
        )

        return Response(ReleaseOutputSerializer(releases, many=True).data)


class ReleaseTagApi(APIView):
    def get(self, request: Request, project_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        project = get_object_or_404(Project, id=project_id, user_profiles__user=request.user)
        tags = project.release_tags.all()
        return Response(ReleaseTagSerializer(tags, many=True).data)

    def post(self, request: Request, project_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        project = get_object_or_404(Project, id=project_id)
        _check_is_project_admin(user=request.user, project=project)

        serializer = ReleaseTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tag = release_tag_create(project=project, **serializer.validated_data)
        return Response(ReleaseTagSerializer(tag).data, status=status.HTTP_201_CREATED)


class ReleaseTagDetailApi(APIView):
    def delete(self, request: Request, tag_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        tag = get_object_or_404(ReleaseTag, id=tag_id)
        _check_is_project_admin(user=request.user, project=tag.project)
        tag.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BugReportApi(APIView):
    def get(self, request: Request, release_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        release = get_object_or_404(
            Release, id=release_id, application__project__user_profiles__user=request.user
        )
        bugs = bug_list(release=release)
        return Response(BugReportOutputSerializer(bugs, many=True).data)

    def post(self, request: Request, release_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        release = get_object_or_404(
            Release, id=release_id, application__project__user_profiles__user=request.user
        )

        serializer = BugReportInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bug = bug_create(user=request.user, release=release, **serializer.validated_data)

        return Response(BugReportOutputSerializer(bug).data, status=status.HTTP_201_CREATED)


class BugReportDetailApi(APIView):
    def get(self, request: Request, bug_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        bug = get_object_or_404(
            BugReport, id=bug_id, release__application__project__user_profiles__user=request.user
        )
        return Response(BugReportOutputSerializer(bug).data)

    def patch(self, request: Request, bug_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        bug = get_object_or_404(
            BugReport, id=bug_id, release__application__project__user_profiles__user=request.user
        )

        serializer = BugReportInputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if "description" in serializer.validated_data:
            bug.description = serializer.validated_data["description"]

        bug.full_clean()
        bug.save()

        return Response(BugReportOutputSerializer(bug).data)


class BugReportTransitionApi(APIView):
    def post(self, request: Request, bug_id: int, transition: str) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        bug = get_object_or_404(
            BugReport, id=bug_id, release__application__project__user_profiles__user=request.user
        )

        bug = bug_transition(bug=bug, transition_name=transition, user=request.user)

        return Response(BugReportOutputSerializer(bug).data)


class BugMessageApi(APIView):
    def get(self, request: Request, bug_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        bug = get_object_or_404(
            BugReport, id=bug_id, release__application__project__user_profiles__user=request.user
        )
        messages = bug_message_list(bug=bug)
        return Response(BugMessageOutputSerializer(messages, many=True).data)

    def post(self, request: Request, bug_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        bug = get_object_or_404(
            BugReport, id=bug_id, release__application__project__user_profiles__user=request.user
        )

        serializer = BugMessageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = bug_message_create(user=request.user, bug=bug, **serializer.validated_data)

        return Response(BugMessageOutputSerializer(message).data, status=status.HTTP_201_CREATED)


class ArtifactDownloadApi(APIView):
    def get(self, request: Request, artifact_id: int) -> FileResponse | HttpResponseRedirect:
        assert isinstance(request.user, User)  # noqa: S101
        artifact = get_object_or_404(Artifact, id=artifact_id)

        # Validate that the user has access to the project
        from projects.permissions import check_is_project_member  # noqa: PLC0415

        check_is_project_member(user=request.user, project=artifact.release.application.project)

        # For now, we serve locally using FileResponse
        # In the future, we could redirect to a presigned R2 URL

        return FileResponse(artifact.file.open("rb"), as_attachment=True)
