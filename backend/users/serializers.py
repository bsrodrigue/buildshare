from typing import Any

from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer[User]):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "is_verified", "created_at")


class RegisterInputSerializer(serializers.Serializer[dict[str, Any]]):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, default="")
    last_name = serializers.CharField(required=False, default="")


class VerifyOtpInputSerializer(serializers.Serializer[dict[str, Any]]):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=10)
