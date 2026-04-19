# BuildShare Backend - Coding Practices & Guidelines

This document serves as the "Source of Truth" for backend coding standards using Django, DRF, and Viewflow.

## 1. Project Architecture

### 1.1 Modular App Structure

The backend is organized into modular Django apps (e.g., `binaries`, `projects`, `users`). Each app should follow this consistent structure:

- `models.py`: Data structure and DB-level constraints.
- `selectors.py`: **READ-ONLY** queries. Logic for fetching and filtering data.
- `services/`: **WRITE-ONLY** logic. Business actions (creating, updating, complex processing).
- `flows.py`: State machine logic using `viewflow.fsm`.
- `apis.py`: DRF ViewSets and APIViews.
- `serializers.py`: Data validation and transformation.
- `tasks.py`: Background Celery tasks.
- `tests_flow.py`: High-level business logic flow tests.

### 1.2 Separation of Concerns

- **Stateless Selectors**: Avoid putting complex query logic in Views or Models. Use `selectors.py`.
- **Stateless Services**: Business logic should be encapsulated in functions that represent "actions".
- **FSM for State**: All state transitions (e.g., File Processing Status) MUST be managed via `flows.py`.

---

## 2. Type Safety & Quality

### 2.1 The "Diamond Resistant" Mandate

- **Strict Typing**: All function signatures MUST have type hints for arguments and return types.
- **Enforcement**: Mypy is configured with `--disallow-untyped-defs` and `--disallow-any-generics`.
- **Primitive Obsession**: Avoid passing raw dicts. Prefer Pydantic models or typed DataClasses if complex data structures are needed outside of Serializers.

### 2.2 Serialization Contract

- **Input Validation**: Use Serializers to validate incoming request data.
- **Output Consistency**: Always use Serializers to format outgoing data. Ensure field names match the frontend expectations documented in `mobile/GEMINI.md`.

---

## 3. Database Integrity

### 3.1 Constraints-First Design

- **CheckConstraints**: Use them for business logic invariants (e.g., `finished_at >= started_at`).
- **UniqueConstraints**: Use them for idempotency (e.g., `user + type + idempotency_key`).
- **Standardized Naming**: All constraints must follow the PascalCase naming convention and be defined in `core/constraints/` (e.g., `UNIQUE_TASK_JOB_USER_TASK_IDEMPOTENCY`).

---

## 4. Error Handling & Reliability

### 4.1 "Zero 500s" for Predictable Failures

- **Standardized Format**: ALL errors must return the project's standard structure: `{ "code": "...", "message": "...", "fields": { "field": [{"message": "...", "code": "..."}] } }`.
- **Integrity Mapping**: Every `UniqueConstraint` or `CheckConstraint` added to a model MUST be registered in the `ConstraintRegistry` within the app's `ready()` method.
- **Graceful Fallbacks**: The `custom_exception_handler` MUST catch all `IntegrityError` exceptions and return a formatted 400 Bad Request if a specific mapping is missing, never a 500.

### 4.2 Background Task Reliability

- **Consumable Failures**: Background workers MUST NOT store raw tracebacks in the `error_message` field. Use the `get_error_message` utility to provide mapped, user-friendly strings.
- **Fail-Fast**: Validate expectations early in the task and transition to `FAILURE` with a specific error code.

---

## 5. Background Processing (Celery)

### 5.1 Robust Tasks

- **Idempotency**: All tasks should check if they've already been processed (e.g., by checking the `TaskJob` status).
- **Failure Recovery**: Always use `flow.fail(error_message=str(e))` in a global `try...except` block to ensure the database reflects the failure.
- **No Silent Crashes**: Tasks must propagate errors to the `TaskJob` model.

---

## 5. Development Standards

### 5.1 Linting & Formatting

- **Ruff**: Use Ruff for all linting and formatting. Line length is strictly limited to **100**.
- **Import Sorting**: Imports must be organized: Standard Library → Third-party → Core → Local App.

### 5.2 Logging

- Use the standard Python `logging` module.
- Prefetch loggers with `logger = logging.getLogger(__name__)`.
- **Avoid print()**: Use `logger.info`, `logger.error`, etc.

### 5.3 Post-Coding Verification

**NEVER** consider a backend task finished without running:

1. `uv run ruff check .`: Linting.
2. `uv run mypy .`: Type safety.
3. `python manage.py test`: Full test suite.
4. `uv run ruff format .`: Ensure clean formatting.

---

## 6. Diamond Quality Enforcement (Husky)

The project uses a unified Husky setup. Changes to the backend will trigger:

- **Pre-commit**: Ruff linting and formatting check.
- **Pre-push**: Full Mypy typecheck and Django unit tests.
