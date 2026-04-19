# BuildShare

A full-stack Android app distribution platform for teams. Upload APKs, organize by project, and share releases with testers.

---

## Overview

**BuildShare** allows development teams to:

- Create projects and invite team members
- Upload Android APK/AAB binaries
- Automatic APK analysis (extracts package name, version, architecture)
- Track releases with version history
- Download artifacts directly from the mobile app
- Background task processing with progress tracking

---

## Architecture

### Backend (`/backend/`)

| Component    | Technology                        |
| ------------ | --------------------------------- |
| Framework    | Django 6.0 + DRF + SimpleJWT      |
| Language     | Python 3.14 (strict typing)       |
| Database     | SQLite (dev) / PostgreSQL (prod)  |
| Async Tasks  | Celery + Redis                    |
| File Storage | Cloudflare R2                     |
| API Docs     | OpenAPI/Swagger (drf-spectacular) |

**Domain Modules:**

- `users/` - Email-based authentication
- `projects/` - Projects with ADMIN/MEMBER RBAC
- `binaries/` - Applications, Releases, Artifacts
- `core/` - TaskJob flow, R2 storage, base models

**Key Features:**

- Async APK processing pipeline (upload → analyze → store)
- Strict RBAC: only ADMINs can upload binaries
- Standardized error responses with French localization
- JWT authentication with refresh tokens

### Mobile (`/mobile/`)

| Component | Technology                            |
| --------- | ------------------------------------- |
| Framework | React Native 0.81 + Expo SDK 54       |
| Router    | Expo Router 6 (file-based)            |
| State     | Zustand (auth) + React Query (server) |
| Forms     | React Hook Form + Zod                 |
| HTTP      | `ky` with custom error handling       |
| UI        | React Native Paper + Custom theme     |
| I18n      | react-i18next (FR/EN)                 |

**Screens (11 total):**

- Auth: Login, Register
- Main: Dashboard (projects), Project Detail (apps), App Detail (releases)
- Actions: Upload APK, Activity (task tracking)

---

## Quick Start

### Prerequisites

- Python 3.14 + `uv` package manager
- Node.js 18+ + npm
- Redis (for Celery tasks)
- Cloudflare R2 credentials (optional, falls back to local storage)

### Backend

```bash
cd backend
uv sync                          # Install dependencies
uv run python manage.py migrate  # Run migrations
uv run python manage.py runserver  # Start dev server

# In another terminal - start Celery worker
uv run celery -A config worker -l info
```

### Mobile

```bash
cd mobile
npm install
npm start        # Start Expo dev server
npm run android  # Run on Android device
npm run ios      # Run on iOS simulator
```

---

## Environment Variables

### Backend (`.env`)

```
DJANGO_SECRET_KEY=your-secret
DJANGO_DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
REDIS_URL=redis://localhost:6379/0

# R2 Storage (optional)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=buildshare
```

### Mobile (`.env`)

```
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

---

## API Endpoints

```
POST /api/auth/register/           # Register new user
POST /api/auth/login/            # JWT login
GET  /api/auth/me/               # Current user profile

GET  /api/projects/              # List user's projects
POST /api/projects/              # Create project (becomes ADMIN)

GET  /api/binaries/applications/?project_id=1   # List apps
POST /api/binaries/applications/                # Create app (ADMIN only)
POST /api/binaries/artifacts/upload/            # Upload APK (ADMIN only)

GET  /api/binaries/releases/?application_id=1 # List releases
GET  /api/jobs/?project_id=1                  # Background task status
```

---

## Development

### Quality Checks

**Backend:**

```bash
uv run ruff check .              # Linting
uv run mypy .                    # Type checking
```

**Mobile:**

```bash
npm run lint                     # ESLint
npm run typecheck                # TypeScript
```

### Project Structure

```
build-share/
├── backend/
│   ├── config/              # Django settings, URL routing
│   ├── core/                # Base models, TaskJob flow, storage
│   ├── users/               # User model, auth
│   ├── projects/            # Project model, RBAC
│   ├── binaries/            # App, Release, Artifact models
│   └── manage.py
├── mobile/
│   ├── app/                 # Expo Router screens
│   ├── modules/             # Domain modules (auth, binaries, projects)
│   ├── libs/                # HTTP client, utilities
│   └── package.json
└── README.md
```

---

## License

MIT
