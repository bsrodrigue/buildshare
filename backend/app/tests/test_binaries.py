from __future__ import annotations

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
