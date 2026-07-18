# BuildShare Backend - Coding Practices & Guidelines

This document serves as the "Source of Truth" for backend coding standards using **FastAPI**, **SQLAlchemy 2.0**, and **Pydantic v2**.

## 1. Project Architecture

### 1.1 Modular Structure

The backend is organized into domain modules under `app/`. Each domain follows:

- `app/models/<domain>.py`: SQLAlchemy model definitions (zero business logic).
- `app/schemas/<domain>.py`: Pydantic v2 schemas for request/response validation.
- `app/services/<domain>.py`: **WRITE-ONLY** business logic (creating, updating, complex processing).
- `app/api/<domain>.py`: FastAPI APIRouter with endpoint definitions.
- `app/libs/flows.py`: FSM state machine logic (TaskJobFlow, BugReportFlow).

### 1.2 Separation of Concerns

- **API Layer**: Only handles HTTP concerns (parsing request, status codes, response formatting). Delegates all logic to services.
- **Services**: Stateless functions that perform business actions. No HTTP knowledge.
- **Models**: Pure data mapping. No business logic, no HTTP.
- **Schemas**: Input validation and output serialization. Use Pydantic v2 `BaseModel`.

---

## 2. Type Safety & Quality

- **Strict Typing**: All function signatures MUST have type hints for arguments and return types.
- **Mypy**: Configured with `--disallow-untyped-defs`. Run via `uv run mypy .`.
- **Ruff**: All linting and formatting. Line length strictly **100**. Run via `uv run ruff check .` / `uv run ruff format .`.

---

## 3. Database Integrity

### 3.1 Constraints

- UniqueConstraints and CheckConstraints are defined in SQLAlchemy models but **NOT enforced at the DB level** (SQLite compatibility). Enforcement happens in service layer via explicit checks.
- Idempotency is handled via `UniqueConstraint` on `(user_id, task_type, idempotency_key)` in the `task_jobs` table.

---

## 4. Error Handling

### 4.1 Standardized Error Format

ALL errors must return the project's standard structure:

```json
{
  "code": "ERROR_CODE",
  "message": "Message en français",
  "fields": {}
}
```

### 4.2 Raising Errors

Always use `AppError` from `app.libs.errors` with an `ErrorCode` enum:

```python
raise AppError(ErrorCode.PROJECT_NOT_FOUND)
```

The global exception handler in `main.py` catches `AppError` and formats it correctly.

---

## 5. Background Processing (Celery)

### 5.1 Robust Tasks

- **Idempotency**: Tasks check `TaskJob` status before processing.
- **Failure Recovery**: Always use `try...except` and call `flow.fail(error_message=str(e))`.
- **No Silent Crashes**: Tasks must propagate errors to the `TaskJob` model.

### 5.2 Celery Configuration

Celery app is defined in `app/tasks/celery_app.py` — standalone, no Django dependency. Tasks use their own SQLAlchemy engine for DB access.

---

## 6. Dependencies & Injection

- Use FastAPI `Depends()` for DB sessions, current user, and other shared dependencies.
- Define shared dependencies in `app/dependencies.py`.
- DB session: `Session = Depends(get_db)` — auto-commits on success, rolls back on error.

---

## 7. Post-Coding Verification

**NEVER** consider a backend task finished without running:

1. `uv run ruff check .` — Linting.
2. `uv run mypy .` — Type safety.
3. `uv run ruff format .` — Clean formatting.
4. Start the server (`uv run uvicorn app.main:app --reload`) and verify the endpoint works.

---

## 8. Key Conventions

- **Table names**: Match original Django names (e.g., `users_user`, `projects_project`).
- **URL patterns**: Trailing slashes on all endpoints (e.g., `/api/auth/register/`).
- **Error codes**: Defined in `AppError` enum in `app/libs/errors.py`.
- **Filenames**: Use snake_case for Python files, PascalCase for models/schemas classes.
- **No migrations**: Dev uses `create_all()` on startup; production uses Alembic (in `app/alembic/`).
