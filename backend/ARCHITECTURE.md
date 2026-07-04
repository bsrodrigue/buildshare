# BuildShare Architecture & Roadmap

## Product Vision

Open-source, self-hosted alternative to TestFlight for Android app distribution.

## Core Principles

- **Zero-config first run**: `docker compose up` gives a working instance (PostgreSQL, RabbitMQ, Celery, FastAPI).
- **Minimal external deps**: S3-compatible storage required; R2 is one option, not a requirement.
- **No phone-home, no telemetry**.
- **Clean self-host docs**: env vars, reverse proxy, backups.

## Client Access Model

- **Mobile client (Expo/React Native)**: Points to a backend URL configured by scanning a **QR code**.
- **Static QR page**: The server serves a minimal static page at `/qr` (or similar) displaying a QR code encoding the server's base URL + an API token. Mobile app scans this to configure itself.
- **CLI client (future)**: Python CLI to upload and manage APKs, also authenticated via token.

## Storage Strategy

Storage backends MUST be swappable via configuration — no hard dependency on any single provider.

### Interface

```
StorageBackend
├── upload(fileobj, key) -> str       # Returns public URL or object identifier
├── download(key) -> BinaryIO
├── delete(key)
├── presigned_url(key, expires_in) -> str | None  # None if not supported
└── list(prefix) -> list[str]
```

### Implementations

1. **S3-compatible** (R2, MinIO, AWS S3, DigitalOcean Spaces)
   - Uses boto3, configured via `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
   - Dev default: MinIO via docker-compose

2. **Local filesystem** (dev / single-server)
   - Stores under `STORAGE_LOCAL_PATH` (default: `./data/storage/`)
   - `presigned_url` returns `None`; files served directly by the web server (or via a static route)

3. **(Future) SFTP / WebDAV / GCS**

### Configuration

```env
STORAGE_BACKEND=s3                  # s3 | local
S3_ENDPOINT_URL=https://...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=buildshare
STORAGE_LOCAL_PATH=./data/storage
```

## Tech Stack

| Layer            | Choice                           | Rationale                              |
| ---------------- | -------------------------------- | -------------------------------------- |
| Web framework    | FastAPI                          | Modern, typed, auto-docs, DI           |
| ORM              | SQLAlchemy 2.0 sync              | Pragmatic simplicity for current scale |
| Validation       | Pydantic v2                      | Part of FastAPI, no extra dep          |
| Auth             | JWT (python-jose)                | Stateless, light, auditable            |
| Background tasks | Celery + RabbitMQ                | Reliable delivery at scale             |
| DB               | PostgreSQL (prod) / SQLite (dev) | Standard choice, well-supported        |

## URL Structure

```
/api/auth/...          # Register, login, refresh, OTP
/api/projects/...      # Project CRUD, invitations, members
/api/binaries/...      # Applications, releases, artifacts, upload, jobs
/api/notifications/... # List, mark read
```

## Future Roadmap

- [ ] Storage backend abstraction (S3 / local filesystem)
- [ ] QR code static page for mobile client configuration
- [ ] Python CLI client for APK upload and management
- [ ] Docker Compose stack for one-command self-host
- [ ] PostgreSQL migration (Alembic)
- [ ] Release management UI enhancements
