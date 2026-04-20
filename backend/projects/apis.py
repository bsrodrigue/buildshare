from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User

from .selectors import project_get, project_list
from .serializers import ProjectInputSerializer, ProjectOutputSerializer
from .services import project_create, project_delete, project_update


class ProjectApi(APIView):
    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        projects = project_list(user=request.user)
        serializer = ProjectOutputSerializer(projects, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        serializer = ProjectInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = project_create(user=request.user, **serializer.validated_data)

        return Response(
            ProjectOutputSerializer(project, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProjectDetailApi(APIView):
    def get(self, request: Request, project_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        project = project_get(user=request.user, project_id=project_id)
        serializer = ProjectOutputSerializer(project, context={"request": request})
        return Response(serializer.data)

    def put(self, request: Request, project_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        project = project_get(user=request.user, project_id=project_id)

        serializer = ProjectInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = project_update(project=project, **serializer.validated_data)

        return Response(ProjectOutputSerializer(project, context={"request": request}).data)

    def delete(self, request: Request, project_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        project = project_get(user=request.user, project_id=project_id)

        project_delete(project=project)

        return Response(status=status.HTTP_204_NO_CONTENT)
