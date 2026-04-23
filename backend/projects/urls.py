from django.urls import path

from .apis import (
    ProjectApi,
    ProjectDetailApi,
    ProjectInvitationActionApi,
    ProjectInvitationApi,
    ProjectMemberListApi,
    ProjectMembershipApi,
)

urlpatterns = [
    path("", ProjectApi.as_view(), name="project-list-create"),
    path("<int:project_id>/", ProjectDetailApi.as_view(), name="project-detail"),
    path(
        "<int:project_id>/invitations/",
        ProjectInvitationApi.as_view(),
        name="project-invitation-send",
    ),
    path("<int:project_id>/members/", ProjectMemberListApi.as_view(), name="project-members-list"),
    path(
        "<int:project_id>/members/<int:user_id>/",
        ProjectMembershipApi.as_view(),
        name="project-membership-revoke",
    ),
    path(
        "invitations/<uuid:invitation_id>/<str:action>/",
        ProjectInvitationActionApi.as_view(),
        name="project-invitation-action",
    ),
]
