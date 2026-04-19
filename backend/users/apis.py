from rest_framework import permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import RegisterInputSerializer, UserSerializer
from .services import user_create


class RegisterApi(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request) -> Response:
        serializer = RegisterInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = user_create(**serializer.validated_data)

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class MeApi(APIView):
    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)  # noqa: S101
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
