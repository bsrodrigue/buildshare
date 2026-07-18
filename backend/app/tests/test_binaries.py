from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.models.project import Project


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
    def _create_job(self, client, auth_headers, project):
        resp = client.post(
            "/api/binaries/upload-intent/",
            headers=auth_headers,
            json={"project_id": project.id, "idempotency_key": "analyze-test"},
        )
        return resp.json()

    @patch("app.api.binaries.AndroidBinaryDownloader")
    @patch("app.api.binaries.AndroidBinaryService")
    def test_analyze_apk_new_app(
        self, mock_service, mock_downloader, client, auth_headers, project
    ):
        mock_downloader.return_value.download.return_value = Path("/tmp/fake.apk")
        mock_service.return_value.parse_metadata.return_value.package_name = "com.new.app"
        mock_service.return_value.parse_metadata.return_value.version_code = 1
        mock_service.return_value.parse_metadata.return_value.version_name = "1.0"
        mock_service.return_value.parse_metadata.return_value.architecture = "arm64-v8a"
        mock_service.return_value.parse_metadata.return_value.file_hash = "abc"
        mock_service.return_value.parse_metadata.return_value.signature_hash = "sig1"
        mock_service.return_value.parse_metadata.return_value.is_debuggable = False
        mock_service.return_value.parse_metadata.return_value.file_size = 1000

        job = self._create_job(client, auth_headers, project)
        resp = client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["package_name"] == "com.new.app"
        assert data["app_id_exists"] is False
        assert data["version_code_exists"] is False
        assert data["decisions_needed"] == []

    @patch("app.api.binaries.AndroidBinaryDownloader")
    @patch("app.api.binaries.AndroidBinaryService")
    def test_analyze_apk_sibling_conflict(
        self, mock_service, mock_downloader, client, auth_headers, project
    ):
        mock_downloader.return_value.download.return_value = Path("/tmp/fake.apk")
        mock_service.return_value.parse_metadata.return_value.package_name = "com.example.app"
        mock_service.return_value.parse_metadata.return_value.version_code = 1
        mock_service.return_value.parse_metadata.return_value.version_name = "1.0"
        mock_service.return_value.parse_metadata.return_value.architecture = "arm64-v8a"
        mock_service.return_value.parse_metadata.return_value.file_hash = "def"
        mock_service.return_value.parse_metadata.return_value.signature_hash = "different-sig"
        mock_service.return_value.parse_metadata.return_value.is_debuggable = True
        mock_service.return_value.parse_metadata.return_value.file_size = 2000

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

        job = self._create_job(client, auth_headers, project)
        resp = client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["app_id_exists"] is True
        assert data["signature_matches"] is False
        assert len(data["sibling_apps"]) == 1
        assert "app_conflict_signature" in data["decisions_needed"]

    @patch("app.api.binaries.AndroidBinaryDownloader")
    @patch("app.api.binaries.AndroidBinaryService")
    def test_analyze_apk_duplicate(
        self, mock_service, mock_downloader, client, auth_headers, project
    ):
        mock_downloader.return_value.download.return_value = Path("/tmp/fake.apk")
        mock_service.return_value.parse_metadata.return_value.package_name = "com.example.app"
        mock_service.return_value.parse_metadata.return_value.version_code = 1
        mock_service.return_value.parse_metadata.return_value.version_name = "1.0"
        mock_service.return_value.parse_metadata.return_value.architecture = "arm64-v8a"
        mock_service.return_value.parse_metadata.return_value.file_hash = "abc"
        mock_service.return_value.parse_metadata.return_value.signature_hash = "sig1"
        mock_service.return_value.parse_metadata.return_value.is_debuggable = False
        mock_service.return_value.parse_metadata.return_value.file_size = 1000

        _app_id(client, auth_headers, project)

        job = self._create_job(client, auth_headers, project)
        resp = client.post(f"/api/binaries/analyze-apk/{job['job_id']}/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        # Without a matching app (existing app has no sig), signature_matches should be False
        assert data["app_id_exists"] is True

    def test_analyze_apk_not_found(self, client, auth_headers):
        resp = client.post(
            "/api/binaries/analyze-apk/00000000-0000-0000-0000-000000000000/",
            headers=auth_headers,
        )
        assert resp.status_code == 404


class TestProcessAPK:
    def _create_job(self, client, auth_headers, project):
        resp = client.post(
            "/api/binaries/upload-intent/",
            headers=auth_headers,
            json={"project_id": project.id, "idempotency_key": "process-test"},
        )
        return resp.json()

    @patch("app.api.binaries.process_apk_task.delay")
    def test_process_apk_with_resolution(self, mock_delay, client, auth_headers, project):
        job = self._create_job(client, auth_headers, project)
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

    @patch("app.api.binaries.process_apk_task.delay")
    def test_process_apk_without_resolution(self, mock_delay, client, auth_headers, project):
        job = self._create_job(client, auth_headers, project)
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
