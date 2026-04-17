from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterInputSerializer, UserSerializer
from .services import user_create


class RegisterApi(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_create(**serializer.validated_data)

        return Response(status=status.HTTP_201_CREATED)


class MeApi(APIView):
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
