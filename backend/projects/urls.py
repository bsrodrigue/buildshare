from django.urls import path

from .apis import ProjectApi, ProjectDetailApi

urlpatterns = [
    path("", ProjectApi.as_view(), name="project-list-create"),
    path("<int:project_id>/", ProjectDetailApi.as_view(), name="project-detail"),
]
