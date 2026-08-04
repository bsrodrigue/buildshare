from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models.user import OneTimePassword
from app.services.auth import create_access_token, create_refresh_token


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

    def test_register_duplicate_email_unverified(self, client: TestClient, register_data: dict):
        """Re-registering with the same email while unverified should succeed (returns existing user)."""
        resp1 = client.post("/api/auth/register/", json=register_data)
        assert resp1.status_code == 201
        resp2 = client.post("/api/auth/register/", json=register_data)
        assert resp2.status_code == 201
        assert resp2.json()["email"] == register_data["email"]

    def test_register_duplicate_email_verified(
        self, client: TestClient, register_data: dict, test_user
    ):
        """Re-registering with a verified email should fail."""
        data = {**register_data, "email": test_user.email}
        response = client.post("/api/auth/register/", json=data)
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


class TestInactiveUser:
    def test_me_inactive_user(self, client, test_user, db_session):
        test_user.is_active = False
        db_session.flush()
        token = create_access_token(test_user.id)
        response = client.get("/api/auth/me/", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401

    def test_refresh_inactive_user(self, client, test_user, db_session):
        test_user.is_active = False
        db_session.flush()
        token = create_refresh_token(test_user.id)
        response = client.post("/api/auth/token/refresh/", json={"refresh": token})
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
        # Generic error: must not reveal whether the email exists
        response = client.post(
            "/api/auth/verify-otp/",
            json={"email": "nobody@example.com", "code": "123456"},
        )
        assert response.status_code == 400

    def test_resend_otp_nonexistent_user(self, client: TestClient):
        # Always succeeds to prevent email enumeration
        response = client.post("/api/auth/resend-otp/", json={"email": "nobody@example.com"})
        assert response.status_code == 200


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
    def test_reset_password_success(self, client: TestClient, test_user, db_session):
        response = client.post(
            "/api/auth/forgot-password/",
            json={"email": "existing@example.com"},
        )
        assert response.status_code == 200

        code = _get_latest_otp(db_session, test_user.id)
        response = client.post(
            "/api/auth/reset-password/",
            json={
                "email": "existing@example.com",
                "code": code,
                "new_password": "NewPass123!",
            },
        )
        assert response.status_code == 200

        # Verify can login with new password
        login_response = client.post(
            "/api/auth/login/",
            json={"email": "existing@example.com", "password": "NewPass123!"},
        )
        assert login_response.status_code == 200

    def test_reset_password_invalid_code(self, client: TestClient):
        response = client.post(
            "/api/auth/reset-password/",
            json={
                "email": "existing@example.com",
                "code": "000000",
                "new_password": "NewPass123!",
            },
        )
        assert response.status_code == 400

    def test_reset_password_used_code(self, client: TestClient, test_user, db_session):
        client.post(
            "/api/auth/forgot-password/",
            json={"email": "existing@example.com"},
        )
        code = _get_latest_otp(db_session, test_user.id)
        payload = {
            "email": "existing@example.com",
            "code": code,
            "new_password": "NewPass123!",
        }

        first = client.post("/api/auth/reset-password/", json=payload)
        assert first.status_code == 200

        second = client.post("/api/auth/reset-password/", json=payload)
        assert second.status_code == 400

    def test_reset_password_expired_code(self, client: TestClient, test_user, db_session):
        client.post(
            "/api/auth/forgot-password/",
            json={"email": "existing@example.com"},
        )
        otp = db_session.execute(
            select(OneTimePassword).where(OneTimePassword.user_id == test_user.id)
        ).scalar_one()
        otp.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db_session.commit()

        response = client.post(
            "/api/auth/reset-password/",
            json={
                "email": "existing@example.com",
                "code": otp.code,
                "new_password": "NewPass123!",
            },
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
        assert response.json()["detail"]["code"] == "auth_val_013"

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

    def test_change_email_verify_wrong_target(
        self, client: TestClient, auth_headers: dict, test_user, db_session
    ):
        # OTP sent to new@example.com must not validate for another address
        client.post(
            "/api/auth/change-email/",
            json={"new_email": "new@example.com", "password": "Password123!"},
            headers=auth_headers,
        )
        otp_code = _get_latest_otp(db_session, test_user.id)

        response = client.post(
            "/api/auth/verify-change-email/",
            json={"new_email": "other@example.com", "code": otp_code},
            headers=auth_headers,
        )
        assert response.status_code == 400
        me_response = client.get("/api/auth/me/", headers=auth_headers)
        assert me_response.json()["email"] == "existing@example.com"


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
