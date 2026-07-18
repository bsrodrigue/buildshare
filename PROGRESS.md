# Progress Log

## 2026-07-11 — Upload flow redesign

### Goal
Make the APK upload flow interactive: validate metadata against DB first, then let the client resolve conflicts before final processing.

### Key changes
- **`Application` model**: add `tag` column (nullable) to distinguish sibling apps with same `app_id` but different signatures
- **`Artifact` model**: remove `unique_artifact_arch_per_release` constraint — each `(release, arch)` becomes a history lane with multiple artifacts
- **New endpoint `POST /api/binaries/analyze-apk/{job_id}/`**: synchronously downloads APK, parses metadata, checks DB, returns analysis + conflicts
- **Updated `POST /api/binaries/process-apk/`**: accepts resolution choices from client, delegates to Celery
- **Updated Celery task**: handles app resolution (create/sibling/override), allows multiple artifacts per arch per release

### Resolution decisions
| Decision point | Options |
|---|---|
| `app_id` new but user was uploading to existing app | `create_new_app` |
| `app_id` exists, `signature` new | `create_sibling` (with tag) or `override` existing app |
| `signature` matches existing app | proceed automatically |
| `version_code` new | create release |
| `version_code` exists, `architecture` new | create artifact |
| `version_code` exists, `arch` exists, `hash` new | create artifact (new build in same arch lane) |
| `version_code` exists, `arch` exists, `hash` same | reject (no changes) |

### Files changed
- [ ] `app/models/binary.py` — add tag, drop arch constraint
- [ ] `app/schemas/binary.py` — add tag, analysis response, process input
- [ ] `app/api/binaries.py` — add analyze endpoint, update process endpoint
- [ ] `app/tasks/binary_processing.py` — handle resolution branches
- [ ] `app/tests/test_binaries.py` — new tests for analyze + resolution flow

### Status
- [x] PROGRESS.md created
- [ ] Model changes
- [ ] Schema changes
- [ ] API endpoints
- [ ] Celery task
- [ ] Tests
