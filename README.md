# BuildShare — Internal Android Build Distribution Platform for Engineering Teams

A full-stack system that lets development teams upload APK binaries, organize them by project, and distribute versioned releases to testers through a dedicated mobile client.

---

## 1. Project Title + One-Line Summary

**BuildShare** — Internal Android Build Distribution Platform for Engineering Teams.

A full-stack system that lets development teams upload APK binaries, organize them by project, and distribute versioned releases to testers through a dedicated mobile client.

---

## 2. Problem Statement

Android build distribution is typically ad-hoc. Teams share APKs through Slack, Google Drive, or email. This creates several operational problems:

- **No single source of truth.** Testers hunt through threads for the latest build. Developers lose track of which version was shipped to whom.
- **No version history.** A regression appears in production, but the team no longer has the previous build. Reproducing the exact artifact is impossible.
- **No access control.** Anyone with a link can download internal builds. There is no audit trail of who accessed what.
- **Manual metadata extraction.** Package names, version codes, and target architectures are verified by hand. This is error-prone and scales poorly.
- **Large file uploads block the web server.** Uploading a 100MB APK synchronously ties up a Django worker for minutes, degrading API responsiveness.

BuildShare exists to replace this chaos with a structured, auditable, and scalable pipeline.

---

## 3. Solution Overview

BuildShare centralizes Android build distribution into a single platform with three core properties:

- **Project-centric organization.** Every binary belongs to a project. Access is governed by explicit membership roles.
- **Asynchronous processing.** APK uploads are decoupled from the request-response cycle. A background worker parses metadata, computes hashes, extracts architectures, and creates versioned releases without blocking the API.
- **Observable pipeline state.** Every upload creates a `TaskJob` that tracks its lifecycle from pending through processing to completion or failure. Users poll or stream status updates rather than waiting on a socket.
- **Multi-platform access.** A React Native mobile client lets testers browse projects, view release histories, and download artifacts directly to their device.

---

## 4. System Architecture

The system splits cleanly into two runtimes: a Django REST backend and a React Native mobile client.

### Backend Services

| Service                              | Responsibility                                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Django API**                       | HTTP interface. Handles auth, project management, application CRUD, release queries, and task-job status. Delegates all mutation logic to service layers.     |
| **Celery Worker**                    | Background task runner. Executes APK download, metadata extraction, artifact creation, and storage operations.                                                |
| **Redis**                            | Task broker and result backend for Celery.                                                                                                                    |
| **PostgreSQL** (prod) / SQLite (dev) | Relational store for users, projects, applications, releases, artifacts, and task jobs.                                                                       |
| **Cloudflare R2**                    | Object storage for raw uploads and final artifacts. Presigned URLs allow direct client-to-R2 uploads, bypassing the Django server entirely for the data path. |

### Mobile Client

| Layer                  | Responsibility                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Expo Router**        | File-based routing for auth, project dashboard, application detail, and activity screens.                                         |
| **React Query**        | Server-state synchronization. Caches project lists, release feeds, and job statuses. Invalidates on mutations.                    |
| **Zustand**            | Client-state for authentication session and global UI flags.                                                                      |
| **HTTP Client (`ky`)** | Request/response interceptors for JWT injection, platform header stamping, structured error parsing, and automatic logout on 401. |

### Why This Shape

The API server is kept stateless with respect to uploads. By issuing presigned R2 URLs, the Django process never buffers binary data. This keeps memory usage flat and response times fast regardless of APK size. Celery workers handle the CPU-bound parsing and I/O-bound storage operations on a separate pool, isolating latency from the user-facing API.

---

## 5. Core Processing Pipeline

The APK upload lifecycle is a seven-step pipeline designed to survive crashes and be observable end-to-end.

1. **Upload Intent.** The mobile client calls `POST /api/binaries/upload-intent/`. The API creates a `TaskJob` in `PENDING` state and returns a presigned PUT URL for Cloudflare R2.
2. **Direct Upload.** The client uploads the raw APK directly to R2 using the presigned URL. The Django server is not on this data path.
3. **Processing Trigger.** Once the upload finishes, the client calls `POST /api/binaries/process-apk/`. This enqueues a Celery task keyed to the `TaskJob` ID.
4. **Background Download.** The Celery worker downloads the APK from R2 into a temporary file on the worker filesystem.
5. **Metadata Extraction.** The worker parses the APK with `pyaxmlparser` to extract the package name, version code, version name, and target architecture by inspecting the `lib/` directory. It computes a SHA-256 hash over the entire file.
6. **Atomic Persistence.** Inside a database transaction, the worker creates or resolves the `Application`, creates or resolves the `Release` (keyed by version code), and stores the `Artifact` with its hash and architecture. Duplicate-hash and duplicate-architecture constraints are enforced at the database level.
7. **Job Finalization.** The worker transitions the `TaskJob` to `SUCCESS` (or `FAILURE` if any step throws). The mobile client polls `GET /api/jobs/` to surface the result.

---

## 6. Technology Choices and Rationale

### Django 6 + Django REST Framework

Chosen for its mature ORM, robust migration system, and deep ecosystem. DRF's `APIView` pattern maps cleanly to the HackSoft styleguide's service/selector/API separation. The alternative would have been FastAPI, but Django's built-in admin, authentication hooks, and database constraint support reduce boilerplate for a domain-heavy application.

### Celery + Redis

Celery provides distributed task queues with explicit retry semantics and result backends. Redis is used as both broker and backend because it is low-latency and operationally simple for a single-tenant deployment. An alternative would be RQ, but Celery's task routing, chains, and monitoring ecosystem are more mature.

### PostgreSQL

SQLite is used locally for zero-config development, but production targets PostgreSQL. Postgres supports the check constraints and unique constraints used for job-state validation and release deduplication without application-level locking.

### Cloudflare R2

R2 offers S3-compatible object storage with zero egress fees. This makes it cheaper than AWS S3 for a build-distribution use case where testers download artifacts repeatedly. The boto3 client generates presigned PUT URLs, so the Django server does not proxy bytes.

### React Native + Expo

Expo abstracts Android/iOS build tooling and over-the-air updates. React Native was chosen over Flutter because the team already operates in a TypeScript/React ecosystem. The mobile app is a thin client: all heavy lifting (parsing, hashing, storage) happens on the backend.

### Zod + TypeScript (Mobile)

Zod schemas validate API responses at runtime. This is paired with `ky`'s `throwHttpErrors: false` pattern to guarantee the client can always parse structured error bodies before they are consumed. Type safety is preserved end-to-end.

---

## 7. Security and Access Control

### JWT Authentication

The backend uses `djangorestframework-simplejwt` for stateless authentication. Access tokens expire after 60 minutes; refresh tokens last 24 hours. The mobile client stores the access token in `expo-secure-store` (encrypted OS keychain) and injects it via a `ky` `beforeRequest` hook. On 401 responses, the client clears the session and redirects to the login screen.

### Role-Based Access Control

Every project has a `UserProjectProfile` linking a user to a role:

- **ADMIN:** Can upload binaries, create applications, edit metadata, and manage project membership. A database constraint enforces exactly one ADMIN per project.
- **MEMBER:** Read-only access to applications and releases within the project.

All mutation services (`application_create`, `artifact_create`, `release_create`) explicitly assert `is_admin` before executing. This is defense in depth: even if an API view were misconfigured, the service layer would reject the call.

### Permission Boundaries

- Users can only query projects where they have a `UserProjectProfile`.
- Releases and artifacts are filtered through their parent application, which is filtered through its parent project, which is filtered through the requesting user's membership.
- Presigned R2 URLs are generated server-side and expire in one hour. There is no public bucket listing.

---

## 8. Background Task System

### Why Async Processing Is Required

APK parsing is CPU-intensive and file I/O is blocking. Synchronous handling would:

- Hold a Django worker process for the duration of the upload plus parse time.
- Risk request timeouts on large binaries.
- Prevent the user from navigating the app while waiting.

### How Celery Workers Process Jobs

A `TaskJob` record is created before the task is enqueued. The Celery task receives the job ID, not the binary itself, keeping the broker message small. The worker uses `django-viewflow`'s FSM (`TaskJobFlow`) to transition states:

- `PENDING` -> `STARTED` when the worker picks up the job.
- `STARTED` -> `SUCCESS` when the artifact is persisted.
- `STARTED` -> `FAILURE` when an exception is caught, with the error message persisted.

### Job State Tracking

The `TaskJob` model carries database-level check constraints:

- `started_at` must be >= `created_at`.
- `finished_at` must be >= `started_at`.
- `status = FAILURE` implies `error_message` is non-empty.

These constraints prevent invalid state transitions even if application code contains a bug.

### Failure Handling

Exceptions in the Celery task trigger the FSM `fail()` transition, which persists the error message, timestamps the finish, and re-raises so Celery can apply retry policy if configured. The mobile client surfaces the error message from the job record.

---

## 9. Data Model Overview

### User

Custom `AbstractUser` subclass with email as the unique identifier. No username field. Managed by a custom `UserManager`.

### Project

A logical container for applications. Users join projects through `UserProjectProfile`, which stores the role.

### UserProjectProfile

The RBAC join table between `User` and `Project`. Enforces a unique `ADMIN` per project at the database level, preventing orphaned projects.

### Application

Represents an Android app within a project. Keyed by `app_id` (package name). Scoped uniquely per project.

### Release

A versioned snapshot of an application. Keyed by `version_code` (the integer Android uses for upgrade ordering). Uniquely constrained per application.

### Artifact

The actual binary file. Linked to a release. Stores SHA-256 hash, target architecture, and file path. Uniquely constrained by `(release, hash)` and `(release, architecture)` to prevent duplicate uploads.

### TaskJob

An idempotent, observable unit of background work. Carries `input_data` (R2 path, project ID) and `output_data` (parsed metadata, created entity IDs). Supports idempotency keys so repeated client requests do not spawn duplicate jobs.

---

## 10. API Design Principles

### REST Structure

Resources are nested by domain: `/api/projects/`, `/api/binaries/applications/`, `/api/binaries/releases/`, `/api/jobs/`. Each endpoint uses explicit HTTP verbs. `GET` requests use query parameters for filtering; `POST` requests use request bodies.

### Versioning

The API is versioned by URL prefix (`/api/`). When a breaking change is required, a new prefix (`/api/v2/`) will be introduced. The existing prefix remains stable.

### Consistent Error Responses

All errors return a unified envelope:

```json
{
  "code": "auth_val_003",
  "message": "Insufficient permissions.",
  "fields": {
    "project_id": [
      { "message": "You are not an admin.", "code": "auth_val_003" }
    ]
  }
}
```

This structure is generated by a centralized exception handler that maps:

- Django `IntegrityError` -> mapped constraint violations.
- `ApplicationError` (custom domain exceptions) -> structured responses with domain codes.
- DRF `ValidationError` -> field-level arrays.
- DRF `NotFound` / `PermissionDenied` -> top-level messages.

### Validation Logic

Input validation happens in serializers. Business-rule validation (e.g., "only admins can upload") happens in service layers. Database validation (uniqueness, referential integrity) is declared as model constraints so it is enforced even if a future admin script bypasses the service layer.

---

## 11. Mobile Client Role

The mobile client is a first-class interface, not a thin wrapper around a web view. Its responsibilities:

- **Authentication lifecycle.** Secure token storage, automatic refresh, and logout on token expiration.
- **Server-state caching.** React Query caches project lists and release feeds, reducing redundant API calls and enabling offline browsing of previously loaded data.
- **Structured error handling.** The `HTTPClient` class parses every non-2xx response through Zod schemas. Network errors, validation errors, and auth errors each have distinct user-facing behavior.
- **File selection and upload triggering.** The client uses Expo's document picker to select an APK, requests a presigned URL, uploads directly to R2, and then triggers backend processing.

The mobile client does not parse APK metadata or compute hashes. It delegates all heavy work to the backend to keep the client lightweight and the logic centralized.

---

## 12. Local Development Setup

### Requirements

- Python 3.14
- `uv` package manager
- Node.js 18+ and npm
- Redis (for Celery broker)
- Android Studio or Xcode (for mobile simulators)

### Backend

```bash
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver

# In a second terminal:
uv run celery -A config worker -l info
```

### Mobile

```bash
cd mobile
npm install
npm start        # Starts Metro bundler
npm run android  # Or ios
```

### Environment

Copy `.env.example` to `.env` in both `/backend` and `/mobile` and fill in:

- `DJANGO_SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `EXPO_PUBLIC_API_URL=http://localhost:8000/api`

---

## 13. Example Usage Flow

1. **Register and create a project.**
   `POST /api/auth/register/` -> `POST /api/projects/`. The creator is automatically the ADMIN.

2. **Upload an APK.**
   `POST /api/binaries/upload-intent/` returns a presigned R2 URL. The client PUTs the APK to that URL, then calls `POST /api/binaries/process-apk/`. A `TaskJob` is created and enqueued.

3. **Wait for processing.**
   `GET /api/jobs/?project_id=1` returns the job status. When it transitions to `SUCCESS`, the `output_data` contains the created `application_id`, `release_id`, and `artifact_id`.

4. **Download the build.**
   The tester opens the mobile app, navigates to the project, selects the application, and downloads the latest release artifact directly from R2.

---

## 14. Future Improvements

- **Chunked / resumable uploads.** For APKs larger than 100MB, support multipart upload to R2 with client-side progress reporting.
- **Presigned download URLs.** Instead of proxying artifacts through the API, issue time-limited presigned GET URLs for direct tester-to-R2 downloads.
- **CI integration.** A CLI tool and webhook endpoint so CI pipelines (GitHub Actions, GitLab CI) can push builds automatically without manual upload.
- **Monitoring and alerting.** Integrate Celery flower or a Prometheus exporter to track queue depth, task failure rates, and worker latency.
- **Rate limiting and abuse prevention.** Apply per-user upload quotas and IP-based rate limits on the upload-intent endpoint.
- **Delta updates.** Store and serve binary patches between consecutive releases to reduce bandwidth for testers on slow connections.
