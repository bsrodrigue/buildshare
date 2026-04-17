from django.contrib import admin
from .models import Project, UserProjectProfile


class UserProjectProfileInline(admin.TabularInline):
    model = UserProjectProfile
    extra = 1
    autocomplete_fields = ["user"]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "get_member_count", "created_at")
    search_fields = ("title", "description")
    inlines = [UserProjectProfileInline]

    def get_member_count(self, obj):
        return obj.user_profiles.count()
    get_member_count.short_description = "Nombre de membres"


@admin.register(UserProjectProfile)
class UserProjectProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "project", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__email", "project__title")
    autocomplete_fields = ["user", "project"]
