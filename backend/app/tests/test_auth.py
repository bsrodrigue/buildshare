from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models.user import OneTimePassword
from app.services.auth import create_access_token, create_password_reset_token, create_refresh_token


def _get_latest_otp(db_session, user_id: int) -> str:
    """Get the latest unused OTP code for a user."""
    otp = db_session.execute(
        select(OneTimePassword).where(
            OneTimePassword.user_id == user_id,
            OneTimePassword.is_used == False,  # noqa: E712
        )
    ).scalar_one_or_none()
    return otp.code if otp else ""


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
        assert response.json()["detail"]["code"] == "auth_val_008"

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
    def test_verify_otp_success(self, client: TestClient, register_data: dict, db_session):
        response = client.post("/api/auth/register/", json=register_data)
        user_id = response.json()["id"]
        otp_code = _get_latest_otp(db_session, user_id)

        response = client.post(
            "/api/auth/verify-otp/",
            json={"email": "test@example.com", "code": otp_code},
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


class TestForgotPassword:
    def test_forgot_password_existing_user(self, client: TestClient, test_user):
        response = client.post(
            "/api/auth/forgot-password/",
            json={"email": "existing@example.com"},
        )
        assert response.status_code == 200
        assert "message" in response.json()

    def test_forgot_password_nonexistent_user(self, client: TestClient):
        # Should still return success to prevent email enumeration
        response = client.post(
            "/api/auth/forgot-password/",
            json={"email": "nobody@example.com"},
        )
        assert response.status_code == 200

    def test_forgot_password_invalid_email(self, client: TestClient):
        response = client.post(
            "/api/auth/forgot-password/",
            json={"email": "not-an-email"},
        )
        assert response.status_code == 422


class TestResetPassword:
    def test_reset_password_success(self, client: TestClient, test_user):
        token = create_password_reset_token(test_user.id)
        response = client.post(
            "/api/auth/reset-password/",
            json={"token": token, "new_password": "NewPass123!"},
        )
        assert response.status_code == 200

        # Verify can login with new password
        login_response = client.post(
            "/api/auth/login/",
            json={"email": "existing@example.com", "password": "NewPass123!"},
        )
        assert login_response.status_code == 200

    def test_reset_password_invalid_token(self, client: TestClient):
        response = client.post(
            "/api/auth/reset-password/",
            json={"token": "invalid-token", "new_password": "NewPass123!"},
        )
        assert response.status_code == 400

    def test_reset_password_wrong_token_type(self, client: TestClient, test_user):
        # Use an access token instead of a reset token
        token = create_access_token(test_user.id)
        response = client.post(
            "/api/auth/reset-password/",
            json={"token": token, "new_password": "NewPass123!"},
        )
        assert response.status_code == 400


class TestChangePassword:
    def test_change_password_success(self, client: TestClient, auth_headers: dict):
        response = client.post(
            "/api/auth/change-password/",
            json={"current_password": "Password123!", "new_password": "NewPass123!"},
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Verify can login with new password
        login_response = client.post(
            "/api/auth/login/",
            json={"email": "existing@example.com", "password": "NewPass123!"},
        )
        assert login_response.status_code == 200

    def test_change_password_wrong_current(self, client: TestClient, auth_headers: dict):
        response = client.post(
            "/api/auth/change-password/",
            json={"current_password": "wrong", "new_password": "NewPass123!"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_change_password_no_auth(self, client: TestClient):
        response = client.post(
            "/api/auth/change-password/",
            json={"current_password": "Password123!", "new_password": "NewPass123!"},
        )
        assert response.status_code == 401


class TestChangeEmail:
    def test_change_email_initiate(self, client: TestClient, auth_headers: dict):
        response = client.post(
            "/api/auth/change-email/",
            json={"new_email": "new@example.com", "password": "Password123!"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_change_email_wrong_password(self, client: TestClient, auth_headers: dict):
        response = client.post(
            "/api/auth/change-email/",
            json={"new_email": "new@example.com", "password": "wrong"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_change_email_already_taken(self, client: TestClient, auth_headers: dict, test_user):
        response = client.post(
            "/api/auth/change-email/",
            json={"new_email": "existing@example.com", "password": "Password123!"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_change_email_verify(
        self, client: TestClient, auth_headers: dict, test_user, db_session
    ):
        # Initiate change
        client.post(
            "/api/auth/change-email/",
            json={"new_email": "new@example.com", "password": "Password123!"},
            headers=auth_headers,
        )

        # Get the OTP code
        otp_code = _get_latest_otp(db_session, test_user.id)

        # Verify the change
        response = client.post(
            "/api/auth/verify-change-email/",
            json={"new_email": "new@example.com", "code": otp_code},
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Verify email was changed
        me_response = client.get("/api/auth/me/", headers=auth_headers)
        assert me_response.json()["email"] == "new@example.com"


class TestDeleteAccount:
    def test_delete_account_success(self, client: TestClient, auth_headers: dict, test_user):
        response = client.post(
            "/api/auth/delete-account/",
            json={"password": "Password123!"},
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Verify can't login anymore
        login_response = client.post(
            "/api/auth/login/",
            json={"email": "existing@example.com", "password": "Password123!"},
        )
        assert login_response.status_code == 401

    def test_delete_account_wrong_password(self, client: TestClient, auth_headers: dict):
        response = client.post(
            "/api/auth/delete-account/",
            json={"password": "wrong"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_delete_account_no_auth(self, client: TestClient):
        response = client.post(
            "/api/auth/delete-account/",
            json={"password": "Password123!"},
        )
        assert response.status_code == 401
