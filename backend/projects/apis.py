from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Project
from .selectors import project_list
from .services import project_create


class ProjectApi(APIView):
    class OutputSerializer(serializers.ModelSerializer):
        role = serializers.SerializerMethodField()

        class Meta:
            model = Project
            fields = ("id", "title", "description", "created_at", "role")

        def get_role(self, obj):
            user = self.context["request"].user
            profile = obj.user_profiles.filter(user=user).first()
            return profile.role if profile else None

    class InputSerializer(serializers.Serializer):
        title = serializers.CharField(max_length=255)
        description = serializers.CharField(required=False, allow_blank=True, default="")

    def get(self, request):
        projects = project_list(user=request.user)
        serializer = self.OutputSerializer(projects, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = project_create(user=request.user, **serializer.validated_data)

        return Response(self.OutputSerializer(project, context={"request": request}).data, status=status.HTTP_201_CREATED)
