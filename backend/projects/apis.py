from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.errors import ErrorCode
from core.exceptions import ApplicationError
from users.models import User

from .models import ProjectInvitation, ProjectInvitationStatus
from .selectors import project_get, project_list
from .serializers import (
    ProjectInputSerializer,
    ProjectInvitationInputSerializer,
    ProjectInvitationOutputSerializer,
    ProjectMemberSerializer,
    ProjectOutputSerializer,
)
from .services import (
    invitation_accept,
    invitation_reject,
    invitation_send,
    project_create,
    project_delete,
    project_membership_revoke,
    project_update,
)


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


class ProjectInvitationApi(APIView):
    def post(self, request: Request, project_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        project = project_get(user=request.user, project_id=project_id)

        # Ensure user is ADMIN
        if not project.user_profiles.filter(user=request.user, role="ADMIN").exists():
            raise ApplicationError("Seuls les administrateurs peuvent envoyer des invitations.")

        serializer = ProjectInvitationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invitation = invitation_send(
            project=project, inviter=request.user, **serializer.validated_data
        )

        return Response(
            ProjectInvitationOutputSerializer(invitation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProjectInvitationListApi(APIView):
    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        invitations = ProjectInvitation.objects.filter(
            email=request.user.email, status=ProjectInvitationStatus.PENDING
        ).select_related("project", "inviter")
        serializer = ProjectInvitationOutputSerializer(invitations, many=True)
        return Response(serializer.data)


class ProjectInvitationActionApi(APIView):
    def post(self, request: Request, invitation_id: str, action: str) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        # UUID search
        invitation = ProjectInvitation.objects.filter(id=invitation_id).first()
        if not invitation:
            raise ApplicationError("Invitation non trouvée.", code=ErrorCode.RESOURCE_NOT_FOUND)

        if action == "accept":
            invitation_accept(invitation=invitation, user=request.user)
            return Response({"status": "accepted"})
        if action == "reject":
            invitation_reject(invitation=invitation, user=request.user)
            return Response({"status": "rejected"})

        raise ApplicationError("Action non valide.")


class ProjectMembershipApi(APIView):
    def delete(self, request: Request, project_id: int, user_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        project = project_get(user=request.user, project_id=project_id)

        target_user = User.objects.filter(id=user_id).first()
        if not target_user:
            raise ApplicationError("Utilisateur non trouvé.", code=ErrorCode.RESOURCE_NOT_FOUND)

        project_membership_revoke(project=project, user=target_user, actor=request.user)

        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectMemberListApi(APIView):
    def get(self, request: Request, project_id: int) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        project = project_get(user=request.user, project_id=project_id)

        members = project.user_profiles.all().select_related("user")
        serializer = ProjectMemberSerializer(members, many=True)
        return Response(serializer.data)
