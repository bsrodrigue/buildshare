# Implementation Plan - R2 Integrated APK Processing

The goal is to implement a high-performance, asynchronous APK processing pipeline using Cloudflare R2 and Celery, replacing the current blocking direct-upload pattern.

## Proposed Changes

### Configuration Layer

#### [MODIFY] [config/django/base.py](file:///home/badinirr/Workspace/sideprojects/build-share/backend/config/django/base.py)
- Add R2 Configuration settings:
    - `R2_ACCOUNT_ID`
    - `R2_ACCESS_KEY_ID`
    - `R2_SECRET_ACCESS_KEY`
    - `R2_BUCKET_NAME`
    - `R2_ENDPOINT_URL`

### Infrastructure Layer

#### [NEW] [core/services/storage.py](file:///home/badinirr/Workspace/sideprojects/build-share/backend/core/services/storage.py)
- Implement `R2StorageService`:
    - `get_upload_url(key: str, expires: int = 3600)`: Generates an S3 presigned POST/PUT URL.
    - `get_client()`: Returns a configured `boto3` client.
    - `download_file(key: str, local_path: str)`: Downloads for processing.

### API Layer (binaries app)

#### [NEW] [binaries/apis.py](file:///home/badinirr/Workspace/sideprojects/build-share/backend/binaries/apis.py) (Additions)
- `UploadIntentApi`: 
    - Generates a `TaskJob` (`BINARY_PROCESSING`).
    - Creates a unique R2 path: `uploads/{uuid}.apk`.
    - Stores the path in `job.input_data`.
    - Returns `job_id` and the R2 presigned URL.
- `ProcessAPKApi`:
    - Validates the `job_id`.
    - Triggers `process_apk_task.delay(job_id, title, description)`.

#### [MODIFY] [binaries/urls.py](file:///home/badinirr/Workspace/sideprojects/build-share/backend/binaries/urls.py)
- Register the new endpoints.

### Background Layer

#### [NEW] [binaries/tasks.py](file:///home/badinirr/Workspace/sideprojects/build-share/backend/binaries/tasks.py)
- `process_apk_task(job_id, title, description)`:
    - Wraps `TaskJob` in `TaskJobFlow`.
    - Downloads APK from R2 to a temporary file.
    - Uses `pyaxmlparser` to extract: `app_id`, `version_code`, `version_id`.
    - Checks if `Application` exists (by `app_id` and `project`); creates if missing.
    - Creates `Release` and `Artifact`.
    - Updates `TaskJob` status to `SUCCESS`.

## Verification Plan

### Automated Tests
- Mock `boto3` and `pyaxmlparser`.
- Test that the Celery task creates correctly normalized database records from a mock APK.

### Manual Verification
- Use an API client (e.g., Postman) to:
    1. Request an upload intent.
    2. PUT a sample APK to the provided R2 URL.
    3. Trigger processing and monitor the `TaskJob` in the Admin panel.
