from __future__ import annotations

from fastapi.testclient import TestClient

from app.services.auth import create_access_token, create_refresh_token


class TestRegister:
    def test_register_success(self, client: TestClient, register_data: dict):
        response = client.post("/api/auth/register/", json=register_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["first_name"] == "Test"
        assert "id" in data
        assert data["is_verified"] is False

    def test_register_duplicate_email(self, client: TestClient, register_data: dict):
        client.post("/api/auth/register/", json=register_data)
        response = client.post("/api/auth/register/", json=register_data)
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "auth_val_004"

    def test_register_invalid_email(self, client: TestClient):
        response = client.post(
            "/api/auth/register/",
            json={"email": "not-an-email", "password": "TestPass123!"},
        )
        assert response.status_code == 422


class TestLogin:
    def test_login_success(self, client: TestClient, test_user):
        response = client.post(
            "/api/auth/login/",
            json={"email": "existing@example.com", "password": "Password123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access" in data
        assert "refresh" in data

    def test_login_wrong_password(self, client: TestClient, test_user):
        response = client.post(
            "/api/auth/login/",
            json={"email": "existing@example.com", "password": "wrong"},
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        response = client.post(
            "/api/auth/login/",
            json={"email": "nobody@example.com", "password": "Password123!"},
        )
        assert response.status_code == 401


class TestMe:
    def test_me_success(self, client: TestClient, auth_headers: dict):
        response = client.get("/api/auth/me/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == "existing@example.com"

    def test_me_no_token(self, client: TestClient):
        response = client.get("/api/auth/me/")
        assert response.status_code == 401

    def test_me_invalid_token(self, client: TestClient):
        response = client.get("/api/auth/me/", headers={"Authorization": "Bearer invalid"})
        assert response.status_code == 401


class TestRefresh:
    def test_refresh_success(self, client: TestClient, test_user):
        token = create_refresh_token(test_user.id)
        response = client.post("/api/auth/token/refresh/", json={"refresh": token})
        assert response.status_code == 200
        assert "access" in response.json()

    def test_refresh_with_access_token(self, client: TestClient, test_user):
        token = create_access_token(test_user.id)
        response = client.post("/api/auth/token/refresh/", json={"refresh": token})
        assert response.status_code == 401

    def test_refresh_invalid_token(self, client: TestClient):
        response = client.post("/api/auth/token/refresh/", json={"refresh": "garbage"})
        assert response.status_code == 401


class TestVerifyOtp:
    def test_verify_otp_success(self, client: TestClient, register_data: dict):
        client.post("/api/auth/register/", json=register_data)
        response = client.post(
            "/api/auth/verify-otp/",
            json={"email": "test@example.com", "code": "123456"},
        )
        assert response.status_code == 200

    def test_verify_otp_wrong_code(self, client: TestClient, register_data: dict):
        client.post("/api/auth/register/", json=register_data)
        response = client.post(
            "/api/auth/verify-otp/",
            json={"email": "test@example.com", "code": "000000"},
        )
        assert response.status_code == 400

    def test_verify_otp_nonexistent_user(self, client: TestClient):
        response = client.post(
            "/api/auth/verify-otp/",
            json={"email": "nobody@example.com", "code": "123456"},
        )
        assert response.status_code == 404
