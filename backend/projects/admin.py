from django.contrib import admin

from .models import Project, UserProjectProfile


class UserProjectProfileInline(admin.TabularInline[UserProjectProfile, Project]):
    model = UserProjectProfile
    extra = 1
    autocomplete_fields = ["user"]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin[Project]):
    list_display = ("title", "get_member_count", "created_at")
    search_fields = ("title", "description")
    inlines = [UserProjectProfileInline]

    @admin.display(description="Nombre de membres")
    def get_member_count(self, obj: Project) -> int:
        return int(obj.user_profiles.count())


@admin.register(UserProjectProfile)
class UserProjectProfileAdmin(admin.ModelAdmin[UserProjectProfile]):
    list_display = ("user", "project", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__email", "project__title")
    autocomplete_fields = ["user", "project"]
