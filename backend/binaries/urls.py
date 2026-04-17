from django.urls import path

from .apis import ApplicationApi, ArtifactUploadApi

urlpatterns = [
    path("applications/", ApplicationApi.as_view(), name="application-list-create"),
    path("artifacts/upload/", ArtifactUploadApi.as_view(), name="artifact-upload"),
]
