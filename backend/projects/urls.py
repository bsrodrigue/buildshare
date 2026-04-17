from django.urls import path

from .apis import ProjectApi

urlpatterns = [
    path("", ProjectApi.as_view(), name="project-list-create"),
]
