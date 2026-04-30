from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import OneTimePassword, User
from .serializers import RegisterInputSerializer, UserSerializer, VerifyOtpInputSerializer
from .services import user_create, user_generate_otp


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


class VerifyOtpApi(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request) -> Response:
        serializer = VerifyOtpInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        user = get_object_or_404(User, email=email)

        otp = OneTimePassword.objects.filter(
            user=user, code=code, is_used=False, expires_at__gt=timezone.now()
        ).first()

        if not otp:
            return Response(
                {"message": "Code invalide ou expiré."}, status=status.HTTP_400_BAD_REQUEST
            )

        otp.is_used = True
        otp.save()

        user.is_verified = True
        user.save()

        return Response({"message": "Compte vérifié avec succès."}, status=status.HTTP_200_OK)


class ResendOtpApi(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request: Request) -> Response:
        email = request.data.get("email")
        if not email:
            return Response({"message": "L'email est requis."}, status=status.HTTP_400_BAD_REQUEST)

        user = get_object_or_404(User, email=email)
        user_generate_otp(user=user)

        return Response({"message": "Nouveau code envoyé."}, status=status.HTTP_200_OK)
