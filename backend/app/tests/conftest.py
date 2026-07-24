from __future__ import annotations

from collections.abc import Generator
from unittest import mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.dependencies import get_storage
from app.main import app as _app
from app.models.project import Project, UserProjectProfile
from app.models.user import User, UserProfile
from app.services.auth import create_access_token
from app.services.storage import LocalStorageBackend

TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture(autouse=True)
def setup_db() -> Generator:
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(autouse=True)
def mock_celery_tasks() -> Generator:
    with (
        mock.patch("app.services.email.email_service.send_email", return_value=True),
        mock.patch("app.tasks.email.send_otp_email_task.delay", return_value=None),
        mock.patch("app.tasks.email.send_account_activated_email_task.delay", return_value=None),
    ):
        yield


@pytest.fixture
def db_session() -> Generator:
    session = TestSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@pytest.fixture
def app(db_session: Session) -> Generator:
    _app.dependency_overrides[get_db] = lambda: db_session
    _app.dependency_overrides[get_storage] = LocalStorageBackend

    # Disable rate limiting in tests by removing the middleware
    _app.user_middleware = [
        m for m in _app.user_middleware if m.cls.__name__ != "RateLimitMiddleware"
    ]

    yield _app
    _app.dependency_overrides.clear()


@pytest.fixture
def client(app: FastAPI) -> Generator:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def register_data() -> dict[str, str]:
    return {
        "email": "test@example.com",
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "User",
    }


@pytest.fixture
def test_user(db_session: Session) -> User:
    user = User(
        email="existing@example.com",
        first_name="Existing",
        last_name="User",
        is_verified=True,
    )
    user.set_password("Password123!")
    db_session.add(user)
    db_session.flush()

    profile = UserProfile(user_id=user.id)
    db_session.add(profile)
    db_session.flush()

    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_user(db_session: Session) -> User:
    user = User(
        email="other@example.com",
        first_name="Other",
        last_name="User",
        is_verified=True,
    )
    user.set_password("Password123!")
    db_session.add(user)
    db_session.flush()

    profile = UserProfile(user_id=user.id)
    db_session.add(profile)
    db_session.flush()

    db_session.refresh(user)
    return user


@pytest.fixture
def other_auth_headers(other_user: User) -> dict[str, str]:
    token = create_access_token(other_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def project(db_session: Session, test_user: User) -> Project:
    project = Project(title="Test Project", description="A test project")
    db_session.add(project)
    db_session.flush()

    profile = UserProjectProfile(
        user_id=test_user.id,
        project_id=project.id,
        role=UserProjectProfile.Role.ADMIN,
    )
    db_session.add(profile)
    db_session.flush()

    db_session.refresh(project)
    return project
