from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .selectors import project_list
from .serializers import ProjectInputSerializer, ProjectOutputSerializer
from .services import project_create


class ProjectApi(APIView):
    def get(self, request: Request) -> Response:
        projects = project_list(user=request.user)
        serializer = ProjectOutputSerializer(projects, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = ProjectInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = project_create(user=request.user, **serializer.validated_data)

        return Response(
            ProjectOutputSerializer(project, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
