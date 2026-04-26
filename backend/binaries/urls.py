from django.urls import path

from .apis import (
    ApplicationApi,
    ApplicationDetailApi,
    ArtifactDownloadApi,
    ArtifactUploadApi,
    BugMessageApi,
    BugReportApi,
    BugReportDetailApi,
    BugReportTransitionApi,
    ProcessAPKApi,
    ReleaseApi,
    ReleaseDetailApi,
    ReleaseTagApi,
    ReleaseTagDetailApi,
    TaskJobApi,
    UploadIntentApi,
)

urlpatterns = [
    path("applications/", ApplicationApi.as_view(), name="application-list-create"),
    path(
        "applications/<int:application_id>/",
        ApplicationDetailApi.as_view(),
        name="application-detail",
    ),
    path("artifacts/upload/", ArtifactUploadApi.as_view(), name="artifact-upload"),
    path(
        "artifacts/<int:artifact_id>/download/",
        ArtifactDownloadApi.as_view(),
        name="artifact-download",
    ),
    path("upload-intent/", UploadIntentApi.as_view(), name="upload-intent"),
    path("process-apk/", ProcessAPKApi.as_view(), name="process-apk"),
    path("jobs/", TaskJobApi.as_view(), name="task-job-list"),
    path("releases/", ReleaseApi.as_view(), name="release-list"),
    path("releases/<int:release_id>/", ReleaseDetailApi.as_view(), name="release-detail"),
    path("releases/<int:release_id>/bugs/", BugReportApi.as_view(), name="release-bug-list"),
    path("bugs/<uuid:bug_id>/", BugReportDetailApi.as_view(), name="bug-detail"),
    path(
        "bugs/<uuid:bug_id>/transitions/<str:transition>/",
        BugReportTransitionApi.as_view(),
        name="bug-transition",
    ),
    path("bugs/<uuid:bug_id>/messages/", BugMessageApi.as_view(), name="bug-message-list-create"),
    path(
        "projects/<int:project_id>/tags/",
        ReleaseTagApi.as_view(),
        name="release-tag-list-create",
    ),
    path("tags/<int:tag_id>/", ReleaseTagDetailApi.as_view(), name="release-tag-detail"),
]
