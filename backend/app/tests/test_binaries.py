from __future__ import annotations

import uuid
from io import BytesIO
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.libs.flows import TaskJobFlow
from app.models.binary import Application, Artifact, Release
from app.models.project import Project
from app.models.task_job import TaskJob
from app.services.storage import LocalStorageBackend
from app.tests.fakes import FakeAPKDownloader, FakeAPKParser, make_apk_parser
from libs.android import get_apk_downloader, get_apk_parser


def _override_apk_deps(
    app: FastAPI,
    *,
    parser: FakeAPKParser | None = None,
    downloader: FakeAPKDownloader | None = None,
):
    parser = parser or make_apk_parser()
    downloader = downloader or FakeAPKDownloader()
    app.dependency_overrides[get_apk_parser] = lambda: parser
    app.dependency_overrides[get_apk_downloader] = lambda: downloader
    return parser, downloader


def _app_id(client, auth_headers, project):
    resp = client.post(
        "/api/binaries/applications/",
        headers=auth_headers,
        json={
            "project_id": project.id,
            "title": "My App",
            "app_id": "com.example.app",
        },
    )
    return resp.json()["id"]


def _create_job(client, auth_headers, project, idempotency_key="test-job"):
    resp = client.post(
        "/api/binaries/upload-intent/",
        headers=auth_headers,
        json={"project_id": project.id, "idempotency_key": idempotency_key},
    )
    return resp.json()


def _create_app_with_signature(
    client, auth_headers, project, app_id="com.example.app", signature="sig1", title="Test App"
):
    resp = client.post(
        "/api/binaries/applications/",
        headers=auth_headers,
        json={
            "project_id": project.id,
            "title": title,
            "app_id": app_id,
            "app_signature": signature,
        },
    )
    return resp.json()


class TestApplications:
    def test_list_empty(self, client: TestClient, auth_headers: dict, project: Project):
        response = client.get(
            f"/api/binaries/applications/?project_id={project.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_create_application(self, client: TestClient, auth_headers: dict, project: Project):
        response = client.post(
            "/api/binaries/applications/",
            headers=auth_headers,
            json={
                "project_id": project.id,
                "title": "My App",
                "app_id": "com.example.app",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "My App"
        assert data["app_id"] == "com.example.app"

    def test_create_application_not_admin(
        self, client: TestClient, other_auth_headers: dict, project: Project
    ):
        response = client.post(
            "/api/binaries/applications/",
            headers=other_auth_headers,
            json={
                "project_id": project.id,
                "title": "Hacked App",
                "app_id": "com.hacked.app",
            },
        )
        assert response.status_code == 400

    def test_get_application(self, client: TestClient, auth_headers: dict, project: Project):
        app_id = _app_id(client, auth_headers, project)
        response = client.get(f"/api/binaries/applications/{app_id}/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["title"] == "My App"

    def test_update_application(self, client: TestClient, auth_headers: dict, project: Project):
        app_id = _app_id(client, auth_headers, project)
        response = client.put(
            f"/api/binaries/applications/{app_id}/",
            headers=auth_headers,
            json={
                "project_id": project.id,
                "title": "Updated App",
                "app_id": "com.example.app",
            },
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated App"

    def test_delete_application(self, client: TestClient, auth_headers: dict, project: Project):
        app_id = _app_id(client, auth_headers, project)
        response = client.delete(f"/api/binaries/applications/{app_id}/", headers=auth_headers)
        assert response.status_code == 204


class TestUploadIntent:
    def test_upload_intent_success(self, client: TestClient, auth_headers: dict, project: Project):
        response = client.post(
            "/api/binaries/upload-intent/",
            headers=auth_headers,
            json={"project_id": project.id, "idempotency_key": "key-1"},
        )
        assert response.status_code == 201
        data = response.json()
        assert "job_id" in data

    def test_upload_intent_idempotent(
        self, client: TestClient, auth_headers: dict, project: Project
    ):
        first = client.post(
            "/api/binaries/upload-intent/",
            headers=auth_headers,
            json={"project_id": project.id, "idempotency_key": "key-1"},
        )
        second = client.post(
            "/api/binaries/upload-intent/",
            headers=auth_headers,
            json={"project_id": project.id, "idempotency_key": "key-1"},
        )
        assert first.json()["job_id"] == second.json()["job_id"]

    def test_upload_intent_not_admin(
        self, client: TestClient, other_auth_headers: dict, project: Project
    ):
        response = client.post(
            "/api/binaries/upload-intent/",
            headers=other_auth_headers,
            json={"project_id": project.id},
        )
        assert response.status_code == 403

    def test_upload_intent_project_not_found(self, client: TestClient, auth_headers: dict):
        response = client.post(
            "/api/binaries/upload-intent/",
            headers=auth_headers,
            json={"project_id": 99999},
        )
        assert response.status_code == 404


class TestJobs:
    def test_list_jobs(self, client: TestClient, auth_headers: dict, project: Project):
        client.post(
            "/api/binaries/upload-intent/",
            headers=auth_headers,
            json={"project_id": project.id, "idempotency_key": "key-1"},
        )
        response = client.get("/api/binaries/jobs/", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) >= 1


class TestArtifactDownload:
    def test_download_not_found(self, client: TestClient, auth_headers: dict):
        response = client.get("/api/binaries/artifacts/download/999/", headers=auth_headers)
        assert response.status_code == 404


class TestAnalyzeAPK:
    def test_analyze_apk_new_app(self, app: FastAPI, client, auth_headers, project):
        parser = make_apk_parser(
            package_name="com.new.app",
            version_code=1,
            version_name="1.0",
            architecture="arm64-v8a",
            file_hash="abc",
            signature_hash="sig1",
            is_debuggable=False,
            file_size=1000,
        )
        _override_apk_deps(app, parser=parser)

        job = _create_job(client, auth_headers, project, "analyze-test")
        resp = client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["package_name"] == "com.new.app"
        assert data["app_id_exists"] is False
        assert data["version_code_exists"] is False
        assert data["decisions_needed"] == []

    def test_analyze_apk_invalid_uuid(self, client, auth_headers):
        resp = client.post(
            "/api/binaries/analyze-apk/not-a-uuid/",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_analyze_apk_not_found(self, client, auth_headers):
        resp = client.post(
            "/api/binaries/analyze-apk/00000000-0000-0000-0000-000000000000/",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_analyze_apk_incomplete_data(
        self, app: FastAPI, client, auth_headers, project, db_session: Session
    ):
        _override_apk_deps(app, parser=make_apk_parser())
        job_data = _create_job(client, auth_headers, project, "analyze-incomplete")

        job = db_session.get(TaskJob, uuid.UUID(job_data["job_id"]))
        job.input_data = {}
        db_session.flush()

        resp = client.post(
            f"/api/binaries/analyze-apk/{job_data['job_id']}/",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_analyze_apk_project_not_found(
        self, app: FastAPI, client, auth_headers, project, db_session: Session
    ):
        parser = make_apk_parser(package_name="com.new.app")
        _override_apk_deps(app, parser=parser)

        job_data = _create_job(client, auth_headers, project, "analyze-no-project")
        job = db_session.get(TaskJob, uuid.UUID(job_data["job_id"]))
        job.input_data = {"project_id": 99999, "r2_path": "uploads/test.apk"}
        db_session.flush()

        resp = client.post(
            f"/api/binaries/analyze-apk/{job_data['job_id']}/",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_analyze_apk_not_admin(
        self, app: FastAPI, client, other_auth_headers, other_user, project, db_session: Session
    ):
        _override_apk_deps(app)

        job = TaskJob(
            user_id=other_user.id,
            type="BINARY_PROCESSING",
            input_data={"project_id": project.id, "r2_path": "uploads/test.apk"},
        )
        db_session.add(job)
        db_session.flush()

        resp = client.post(
            f"/api/binaries/analyze-apk/{job.id}/",
            headers=other_auth_headers,
        )
        assert resp.status_code == 403

    def test_analyze_apk_sibling_conflict(self, app: FastAPI, client, auth_headers, project):
        parser = make_apk_parser(
            package_name="com.example.app",
            version_code=1,
            architecture="arm64-v8a",
            file_hash="def",
            signature_hash="different-sig",
            is_debuggable=True,
            file_size=2000,
        )
        _override_apk_deps(app, parser=parser)

        client.post(
            "/api/binaries/applications/",
            headers=auth_headers,
            json={
                "project_id": project.id,
                "title": "Sibling App",
                "app_id": "com.example.app",
                "app_signature": "existing-sig",
            },
        )

        job = _create_job(client, auth_headers, project, "analyze-sibling")
        resp = client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["app_id_exists"] is True
        assert data["signature_matches"] is False
        assert len(data["sibling_apps"]) == 1
        assert "app_conflict_signature" in data["decisions_needed"]

    def test_analyze_apk_matching_signature(self, app: FastAPI, client, auth_headers, project):
        parser = make_apk_parser(
            package_name="com.example.app",
            version_code=1,
            architecture="arm64-v8a",
            file_hash="abc",
            signature_hash="match-sig",
            file_size=1000,
        )
        _override_apk_deps(app, parser=parser)
        _create_app_with_signature(client, auth_headers, project, signature="match-sig")

        job = _create_job(client, auth_headers, project, "analyze-match-sig")
        resp = client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["app_id_exists"] is True
        assert data["signature_matches"] is True
        assert data["existing_app"] is not None
        assert data["version_code_exists"] is False
        assert data["decisions_needed"] == []

    def test_analyze_apk_version_exists_diff_arch(
        self, app: FastAPI, client, auth_headers, project, db_session: Session
    ):
        parser = make_apk_parser(
            package_name="com.example.app",
            version_code=1,
            architecture="x86_64",
            file_hash="abc",
            signature_hash="match-sig",
        )
        _override_apk_deps(app, parser=parser)
        app_data = _create_app_with_signature(client, auth_headers, project, signature="match-sig")

        release = Release(
            application_id=app_data["id"],
            version_code=1,
            version_id="1.0",
        )
        db_session.add(release)
        db_session.flush()
        art = Artifact(release_id=release.id, architecture="arm64-v8a", hash="old-hash")
        db_session.add(art)
        db_session.flush()

        job = _create_job(client, auth_headers, project, "analyze-ver-diff-arch")
        resp = client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["version_code_exists"] is True
        assert data["architecture_exists"] is False
        assert data["hash_exists"] is False

    def test_analyze_apk_arch_exists_diff_hash(
        self, app: FastAPI, client, auth_headers, project, db_session: Session
    ):
        parser = make_apk_parser(
            package_name="com.example.app",
            version_code=1,
            architecture="x86_64",
            file_hash="new-hash",
            signature_hash="match-sig",
        )
        _override_apk_deps(app, parser=parser)
        app_data = _create_app_with_signature(client, auth_headers, project, signature="match-sig")

        release = Release(
            application_id=app_data["id"],
            version_code=1,
            version_id="1.0",
        )
        db_session.add(release)
        db_session.flush()
        art = Artifact(release_id=release.id, architecture="x86_64", hash="old-hash")
        db_session.add(art)
        db_session.flush()

        job = _create_job(client, auth_headers, project, "analyze-arch-diff-hash")
        resp = client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["version_code_exists"] is True
        assert data["architecture_exists"] is True
        assert data["hash_exists"] is False

    def test_analyze_apk_duplicate_hash(
        self, app: FastAPI, client, auth_headers, project, db_session: Session
    ):
        parser = make_apk_parser(
            package_name="com.example.app",
            version_code=1,
            architecture="arm64-v8a",
            file_hash="dup-hash",
            signature_hash="match-sig",
        )
        _override_apk_deps(app, parser=parser)
        app_data = _create_app_with_signature(client, auth_headers, project, signature="match-sig")

        release = Release(
            application_id=app_data["id"],
            version_code=1,
            version_id="1.0",
        )
        db_session.add(release)
        db_session.flush()
        art = Artifact(release_id=release.id, architecture="arm64-v8a", hash="dup-hash")
        db_session.add(art)
        db_session.flush()

        job = _create_job(client, auth_headers, project, "analyze-dup-hash")
        resp = client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["version_code_exists"] is True
        assert data["hash_exists"] is True
        assert "artifact_duplicate" in data["decisions_needed"]

    def test_analyze_apk_existing_app_no_signature(
        self, app: FastAPI, client, auth_headers, project
    ):
        parser = make_apk_parser(
            package_name="com.example.app",
            version_code=1,
            architecture="arm64-v8a",
            file_hash="abc",
            signature_hash="sig1",
            file_size=1000,
        )
        _override_apk_deps(app, parser=parser)
        _app_id(client, auth_headers, project)

        job = _create_job(client, auth_headers, project, "analyze-no-sig")
        resp = client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["app_id_exists"] is True
        assert data["signature_matches"] is False
        assert data["existing_app"] is None
        assert data["sibling_apps"] == []

    def test_analyze_apk_parser_error(self, app: FastAPI, client, auth_headers, project):
        parser = FakeAPKParser(parse_raises=ValueError("bad apk"))
        _override_apk_deps(app, parser=parser)

        job = _create_job(client, auth_headers, project, "analyze-parser-err")
        with pytest.raises(ValueError, match="bad apk"):
            client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)

    def test_analyze_apk_downloader_error(self, app: FastAPI, client, auth_headers, project):
        class FailingDownloader:
            def download(self, storage, key):
                raise RuntimeError("storage down")

        _override_apk_deps(app, downloader=FailingDownloader())  # type: ignore

        job = _create_job(client, auth_headers, project, "analyze-dl-err")
        with pytest.raises(RuntimeError, match="storage down"):
            client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)


class TestProcessAPK:
    def test_process_apk_with_resolution(self, app, client, auth_headers, project):
        job = _create_job(client, auth_headers, project, "process-with-res")
        with patch("app.api.binaries.process_apk_task.delay") as mock_delay:
            resp = client.post(
                "/api/binaries/process-apk/",
                headers=auth_headers,
                json={
                    "job_id": job["job_id"],
                    "resolution": {
                        "action": "create_sibling",
                        "tag": "debug",
                    },
                },
            )
            assert resp.status_code == 202
            mock_delay.assert_called_once()
            _, kwargs = mock_delay.call_args
            assert kwargs["resolution"]["action"] == "create_sibling"
            assert kwargs["resolution"]["tag"] == "debug"

    def test_process_apk_without_resolution(self, app, client, auth_headers, project):
        job = _create_job(client, auth_headers, project, "process-without-res")
        with patch("app.api.binaries.process_apk_task.delay") as mock_delay:
            resp = client.post(
                "/api/binaries/process-apk/",
                headers=auth_headers,
                json={"job_id": job["job_id"]},
            )
            assert resp.status_code == 202
            mock_delay.assert_called_once()
            _, kwargs = mock_delay.call_args
            assert kwargs["resolution"] == {}

    def test_process_apk_not_found(self, client, auth_headers):
        resp = client.post(
            "/api/binaries/process-apk/",
            headers=auth_headers,
            json={"job_id": "00000000-0000-0000-0000-000000000000"},
        )
        assert resp.status_code == 404

    def test_process_apk_not_admin(
        self, app, client, other_auth_headers, other_user, project, db_session: Session
    ):
        job = TaskJob(
            user_id=other_user.id,
            type="BINARY_PROCESSING",
            input_data={"project_id": project.id, "r2_path": "uploads/test.apk"},
        )
        db_session.add(job)
        db_session.flush()

        with patch("app.api.binaries.process_apk_task.delay"):
            resp = client.post(
                "/api/binaries/process-apk/",
                headers=other_auth_headers,
                json={"job_id": str(job.id)},
            )
            assert resp.status_code == 403


class TestUploadAPKDirect:
    def test_upload_invalid_uuid(self, client, auth_headers):
        resp = client.post(
            "/api/binaries/upload/not-a-uuid/",
            headers=auth_headers,
            files={"file": ("test.apk", b"content")},
        )
        assert resp.status_code == 400

    def test_upload_job_not_found(self, client, auth_headers):
        resp = client.post(
            "/api/binaries/upload/00000000-0000-0000-0000-000000000000/",
            headers=auth_headers,
            files={"file": ("test.apk", b"content")},
        )
        assert resp.status_code == 404

    def test_upload_success(self, client, auth_headers, project):
        job = _create_job(client, auth_headers, project, "upload-success")
        resp = client.post(
            f"/api/binaries/upload/{job['job_id']}/",
            headers=auth_headers,
            files={"file": ("test.apk", b"fake-apk-content")},
        )
        assert resp.status_code == 204


class TestServeAppIcon:
    def test_serve_icon_app_not_found(self, client):
        resp = client.get("/api/binaries/applications/99999/icon/")
        assert resp.status_code == 404

    def test_serve_icon_no_icon_key(self, client, auth_headers, project):
        app_data = _create_app_with_signature(client, auth_headers, project)
        resp = client.get(f"/api/binaries/applications/{app_data['id']}/icon/")
        assert resp.status_code == 404

    def test_serve_icon_success(self, client, auth_headers, project, db_session: Session):
        app_data = _create_app_with_signature(client, auth_headers, project)
        app = db_session.get(Application, app_data["id"])
        app.icon_key = "icons/test/icon.png"
        db_session.flush()

        storage = LocalStorageBackend()
        storage.upload(BytesIO(b"png-bytes"), "icons/test/icon.png")

        resp = client.get(f"/api/binaries/applications/{app_data['id']}/icon/")
        assert resp.status_code == 200
        assert resp.content == b"png-bytes"


class TestCancelJob:
    def test_cancel_invalid_uuid(self, client, auth_headers):
        resp = client.post(
            "/api/binaries/jobs/not-a-uuid/cancel/",
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_cancel_not_found(self, client, auth_headers):
        resp = client.post(
            "/api/binaries/jobs/00000000-0000-0000-0000-000000000000/cancel/",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_cancel_success(self, client, auth_headers, project):
        job = _create_job(client, auth_headers, project, "cancel-success")
        resp = client.post(
            f"/api/binaries/jobs/{job['job_id']}/cancel/",
            headers=auth_headers,
        )
        assert resp.status_code == 204

    def test_cancel_already_finished(self, client, auth_headers, project, db_session: Session):
        job = _create_job(client, auth_headers, project, "cancel-finished")

        db_job = db_session.get(TaskJob, uuid.UUID(job["job_id"]))
        flow = TaskJobFlow(db_job)
        flow.start()
        flow.finish()
        db_session.flush()

        resp = client.post(
            f"/api/binaries/jobs/{job['job_id']}/cancel/",
            headers=auth_headers,
        )
        assert resp.status_code == 400
