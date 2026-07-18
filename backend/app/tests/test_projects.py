from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User, UserProfile
from app.services.auth import create_access_token


class TestListProjects:
    def test_list_empty(self, client: TestClient, auth_headers: dict):
        response = client.get("/api/projects/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_list_with_project(self, client: TestClient, auth_headers: dict, project: Project):
        response = client.get("/api/projects/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Test Project"


class TestCreateProject:
    def test_create_success(self, client: TestClient, auth_headers: dict):
        response = client.post(
            "/api/projects/",
            headers=auth_headers,
            json={"title": "New Project", "description": "A new project"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Project"
        assert "id" in data

    def test_create_unauthenticated(self, client: TestClient):
        response = client.post("/api/projects/", json={"title": "New Project"})
        assert response.status_code == 401


class TestGetProject:
    def test_get_success(self, client: TestClient, auth_headers: dict, project: Project):
        response = client.get(f"/api/projects/{project.id}/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["title"] == "Test Project"

    def test_get_not_found(self, client: TestClient, auth_headers: dict):
        response = client.get("/api/projects/999/", headers=auth_headers)
        assert response.status_code == 404

    def test_get_not_member(self, client: TestClient, other_auth_headers: dict, project: Project):
        response = client.get(f"/api/projects/{project.id}/", headers=other_auth_headers)
        assert response.status_code == 404


class TestUpdateProject:
    def test_update_success(self, client: TestClient, auth_headers: dict, project: Project):
        response = client.put(
            f"/api/projects/{project.id}/",
            headers=auth_headers,
            json={"title": "Updated Name", "description": "Updated desc"},
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Name"

    def test_update_not_admin(self, client: TestClient, other_auth_headers: dict, project: Project):
        response = client.put(
            f"/api/projects/{project.id}/",
            headers=other_auth_headers,
            json={"title": "Hacked Name"},
        )
        assert response.status_code == 403


class TestDeleteProject:
    def test_delete_success(self, client: TestClient, auth_headers: dict, project: Project):
        response = client.delete(f"/api/projects/{project.id}/", headers=auth_headers)
        assert response.status_code == 204

    def test_delete_not_found(self, client: TestClient, auth_headers: dict):
        response = client.delete("/api/projects/999/", headers=auth_headers)
        assert response.status_code == 403


class TestInvitations:
    def test_send_invitation(self, client: TestClient, auth_headers: dict, project: Project):
        response = client.post(
            f"/api/projects/{project.id}/invitations/",
            headers=auth_headers,
            json={"email": "invitee@example.com"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "invitee@example.com"

    def test_accept_invitation(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers: dict,
        project: Project,
    ):
        invite_email = "invitee@example.com"
        invite_resp = client.post(
            f"/api/projects/{project.id}/invitations/",
            headers=auth_headers,
            json={"email": invite_email},
        )
        invite_id = invite_resp.json()["id"]

        invitee = User(
            email=invite_email,
            first_name="Invitee",
            last_name="User",
            is_verified=True,
        )
        invitee.set_password("Password123!")
        db_session.add(invitee)
        db_session.flush()
        db_session.add(UserProfile(user_id=invitee.id))
        db_session.flush()

        token = create_access_token(invitee.id)
        headers = {"Authorization": f"Bearer {token}"}

        response = client.post(
            f"/api/projects/invitations/{invite_id}/accept/",
            headers=headers,
        )
        assert response.status_code == 200

    def test_reject_invitation(
        self,
        client: TestClient,
        db_session: Session,
        auth_headers: dict,
        project: Project,
    ):
        reject_email = "rejector@example.com"
        invite_resp = client.post(
            f"/api/projects/{project.id}/invitations/",
            headers=auth_headers,
            json={"email": reject_email},
        )
        invite_id = invite_resp.json()["id"]

        rejector = User(
            email=reject_email,
            first_name="Rejector",
            last_name="User",
            is_verified=True,
        )
        rejector.set_password("Password123!")
        db_session.add(rejector)
        db_session.flush()
        db_session.add(UserProfile(user_id=rejector.id))
        db_session.flush()

        token = create_access_token(rejector.id)
        headers = {"Authorization": f"Bearer {token}"}

        response = client.post(
            f"/api/projects/invitations/{invite_id}/reject/",
            headers=headers,
        )
        assert response.status_code == 200


class TestMembers:
    def test_list_members(self, client: TestClient, auth_headers: dict, project: Project):
        response = client.get(f"/api/projects/{project.id}/members/", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) >= 1

    def test_remove_member_not_found(
        self, client: TestClient, auth_headers: dict, project: Project
    ):
        response = client.delete(f"/api/projects/{project.id}/members/999/", headers=auth_headers)
        assert response.status_code == 404
