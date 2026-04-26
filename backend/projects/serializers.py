from typing import Any

from rest_framework import serializers

from .models import Project, ProjectInvitation, UserProjectProfile


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


class ProjectInvitationInputSerializer(serializers.Serializer[dict[str, Any]]):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=UserProjectProfile.Role.choices, default=UserProjectProfile.Role.MEMBER
    )


class ProjectMemberSerializer(serializers.ModelSerializer[UserProjectProfile]):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = UserProjectProfile
        fields = ("user_id", "email", "first_name", "last_name", "role", "created_at")


class ProjectInvitationOutputSerializer(serializers.ModelSerializer[ProjectInvitation]):
    inviter = serializers.StringRelatedField[Any]()
    project_title = serializers.CharField(source="project.title", read_only=True)

    class Meta:
        model = ProjectInvitation
        fields = (
            "id",
            "project",
            "project_title",
            "email",
            "role",
            "inviter",
            "status",
            "created_at",
        )
