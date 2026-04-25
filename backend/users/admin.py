from django.contrib import admin

from .models import User, UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = "Profil"


@admin.register(User)
class UserAdmin(admin.ModelAdmin[User]):
    list_display = ("email", "first_name", "last_name", "is_staff", "is_active", "created_at")
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-created_at",)
    inlines = (UserProfileInline,)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin[UserProfile]):
    list_display = ("user", "created_at", "updated_at")
    search_fields = ("user__email", "user__first_name", "user__last_name")
