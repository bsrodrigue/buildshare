from typing import Any

from rest_framework import serializers

from .models import Project


class ProjectOutputSerializer(serializers.ModelSerializer[Project]):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ("id", "title", "description", "created_at", "role")

    def get_role(self, obj: Project) -> str | None:
        user = self.context["request"].user
        profile = obj.user_profiles.filter(user=user).first()
        return profile.role if profile else None


class ProjectInputSerializer(serializers.Serializer[dict[str, Any]]):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
