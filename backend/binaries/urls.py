from django.urls import path

from .apis import ApplicationApi, ArtifactUploadApi, ProcessAPKApi, TaskJobApi, UploadIntentApi

urlpatterns = [
    path("applications/", ApplicationApi.as_view(), name="application-list-create"),
    path("artifacts/upload/", ArtifactUploadApi.as_view(), name="artifact-upload"),
    path("upload-intent/", UploadIntentApi.as_view(), name="upload-intent"),
    path("process-apk/", ProcessAPKApi.as_view(), name="process-apk"),
    path("jobs/", TaskJobApi.as_view(), name="task-job-list"),
]
