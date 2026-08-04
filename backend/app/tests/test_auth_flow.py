from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models.binary import Application, BugMessage, BugReport, Release
from app.models.notification import Notification
from app.models.project import Project, UserProjectProfile
from app.models.user import OneTimePassword, User


def _get_latest_otp(db_session, user_id: int) -> str:
    """Get the latest unused OTP code for a user."""
    otp = db_session.execute(
        select(OneTimePassword).where(
            OneTimePassword.user_id == user_id,
            OneTimePassword.is_used == False,  # noqa: E712
        )
    ).scalar_one_or_none()
    return otp.code if otp else ""


class TestFullAccountLifecycle:
    """End-to-end walk through the entire auth lifecycle of a single account.

    register -> verify -> login -> refresh -> change password -> reset password
    -> change email -> delete account -> re-register.
    """

    def test_complete_account_lifecycle(self, client: TestClient, register_data: dict, db_session):
        email = register_data["email"]
        original_password = register_data["password"]

        # 1. Register -> unverified account
        register_response = client.post("/api/auth/register/", json=register_data)
        assert register_response.status_code == 201
        user_id = register_response.json()["id"]
        assert register_response.json()["is_verified"] is False

        # 2. Cannot login before email verification
        login_response = client.post(
            "/api/auth/login/", json={"email": email, "password": original_password}
        )
        assert login_response.status_code == 401
        assert login_response.json()["detail"]["code"] == "auth_val_007"

        # 3. Wrong OTP is rejected
        wrong_verify = client.post("/api/auth/verify-otp/", json={"email": email, "code": "000000"})
        assert wrong_verify.status_code == 400

        # 4. Resend invalidates the previous code and issues a new one
        first_code = _get_latest_otp(db_session, user_id)
        resend_response = client.post("/api/auth/resend-otp/", json={"email": email})
        assert resend_response.status_code == 200
        second_code = _get_latest_otp(db_session, user_id)
        assert second_code != first_code

        stale_verify = client.post(
            "/api/auth/verify-otp/", json={"email": email, "code": first_code}
        )
        assert stale_verify.status_code == 400

        # 5. Verify with the current code
        verify_response = client.post(
            "/api/auth/verify-otp/", json={"email": email, "code": second_code}
        )
        assert verify_response.status_code == 200

        # 6. A used code can never be replayed
        replay_verify = client.post(
            "/api/auth/verify-otp/", json={"email": email, "code": second_code}
        )
        assert replay_verify.status_code == 400

        # 7. Login now works
        login_response = client.post(
            "/api/auth/login/", json={"email": email, "password": original_password}
        )
        assert login_response.status_code == 200
        access_token = login_response.json()["access"]
        refresh_token = login_response.json()["refresh"]
        headers = {"Authorization": f"Bearer {access_token}"}

        me_response = client.get("/api/auth/me/", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["email"] == email
        assert me_response.json()["is_verified"] is True

        # 8. Refresh token yields a working access token
        refresh_response = client.post("/api/auth/token/refresh/", json={"refresh": refresh_token})
        assert refresh_response.status_code == 200
        refreshed_headers = {"Authorization": f"Bearer {refresh_response.json()['access']}"}
        assert client.get("/api/auth/me/", headers=refreshed_headers).status_code == 200

        # 9. Wrong current password is rejected with a distinct code
        wrong_change = client.post(
            "/api/auth/change-password/",
            json={"current_password": "wrong", "new_password": "ChangedPass123!"},
            headers=headers,
        )
        assert wrong_change.status_code == 400
        assert wrong_change.json()["detail"]["code"] == "auth_val_013"

        # 10. Change password
        changed_password = "ChangedPass123!"
        change_response = client.post(
            "/api/auth/change-password/",
            json={"current_password": original_password, "new_password": changed_password},
            headers=headers,
        )
        assert change_response.status_code == 200

        # 11. Old password no longer works, new one does
        assert (
            client.post(
                "/api/auth/login/", json={"email": email, "password": original_password}
            ).status_code
            == 401
        )
        assert (
            client.post(
                "/api/auth/login/", json={"email": email, "password": changed_password}
            ).status_code
            == 200
        )

        # 12. Forget password -> OTP-based reset
        forgot_response = client.post("/api/auth/forgot-password/", json={"email": email})
        assert forgot_response.status_code == 200
        reset_code = _get_latest_otp(db_session, user_id)

        wrong_reset = client.post(
            "/api/auth/reset-password/",
            json={"email": email, "code": "000000", "new_password": "ResetPass123!"},
        )
        assert wrong_reset.status_code == 400

        reset_password = "ResetPass123!"
        reset_response = client.post(
            "/api/auth/reset-password/",
            json={"email": email, "code": reset_code, "new_password": reset_password},
        )
        assert reset_response.status_code == 200

        # 13. Pre-reset password no longer works
        assert (
            client.post(
                "/api/auth/login/", json={"email": email, "password": changed_password}
            ).status_code
            == 401
        )
        assert (
            client.post(
                "/api/auth/login/", json={"email": email, "password": reset_password}
            ).status_code
            == 200
        )

        # 14. Initiate email change
        new_email = "new@example.com"
        change_email_response = client.post(
            "/api/auth/change-email/",
            json={"new_email": new_email, "password": reset_password},
            headers=headers,
        )
        assert change_email_response.status_code == 200

        # 15. Wrong code leaves the email unchanged
        wrong_email_verify = client.post(
            "/api/auth/verify-change-email/",
            json={"new_email": new_email, "code": "000000"},
            headers=headers,
        )
        assert wrong_email_verify.status_code == 400
        assert client.get("/api/auth/me/", headers=headers).json()["email"] == email

        # 16. Correct code switches the email
        change_email_code = _get_latest_otp(db_session, user_id)
        verify_email_response = client.post(
            "/api/auth/verify-change-email/",
            json={"new_email": new_email, "code": change_email_code},
            headers=headers,
        )
        assert verify_email_response.status_code == 200
        assert client.get("/api/auth/me/", headers=headers).json()["email"] == new_email

        # 17. Login now requires the new email
        assert (
            client.post(
                "/api/auth/login/", json={"email": email, "password": reset_password}
            ).status_code
            == 401
        )
        final_login = client.post(
            "/api/auth/login/", json={"email": new_email, "password": reset_password}
        )
        assert final_login.status_code == 200

        # 18. Delete the account
        delete_response = client.post(
            "/api/auth/delete-account/",
            json={"password": reset_password},
            headers=headers,
        )
        assert delete_response.status_code == 200

        # 19. Account is gone: login, refresh and access all fail
        assert (
            client.post(
                "/api/auth/login/", json={"email": new_email, "password": reset_password}
            ).status_code
            == 401
        )
        assert (
            client.post("/api/auth/token/refresh/", json={"refresh": refresh_token}).status_code
            == 401
        )
        assert client.get("/api/auth/me/", headers=headers).status_code == 401

        # 20. The original email can be registered again afterwards
        re_register = client.post("/api/auth/register/", json=register_data)
        assert re_register.status_code == 201
        assert re_register.json()["email"] == email


class TestAuthEdgeCases:
    def test_login_unverified_user(self, client: TestClient, register_data: dict):
        client.post("/api/auth/register/", json=register_data)
        response = client.post(
            "/api/auth/login/",
            json={"email": register_data["email"], "password": register_data["password"]},
        )
        assert response.status_code == 401
        assert response.json()["detail"]["code"] == "auth_val_007"

    def test_access_token_survives_password_change(
        self, client: TestClient, register_data: dict, db_session
    ):
        """Access tokens are stateless JWTs: they remain valid after a password change."""
        email = register_data["email"]
        password = register_data["password"]
        register_response = client.post("/api/auth/register/", json=register_data)
        user_id = register_response.json()["id"]
        otp = _get_latest_otp(db_session, user_id)
        client.post("/api/auth/verify-otp/", json={"email": email, "code": otp})
        login = client.post("/api/auth/login/", json={"email": email, "password": password})
        headers = {"Authorization": f"Bearer {login.json()['access']}"}

        change = client.post(
            "/api/auth/change-password/",
            json={
                "current_password": password,
                "new_password": "NewPass123!",
            },
            headers=headers,
        )
        assert change.status_code == 200
        assert client.get("/api/auth/me/", headers=headers).status_code == 200

    def test_refresh_token_survives_password_change(
        self, client: TestClient, register_data: dict, db_session
    ):
        email = register_data["email"]
        password = register_data["password"]
        register_response = client.post("/api/auth/register/", json=register_data)
        user_id = register_response.json()["id"]
        otp = _get_latest_otp(db_session, user_id)
        client.post("/api/auth/verify-otp/", json={"email": email, "code": otp})
        login = client.post("/api/auth/login/", json={"email": email, "password": password})
        refresh_token = login.json()["refresh"]
        headers = {"Authorization": f"Bearer {login.json()['access']}"}
        client.post(
            "/api/auth/change-password/",
            json={
                "current_password": password,
                "new_password": "NewPass123!",
            },
            headers=headers,
        )
        refresh_response = client.post("/api/auth/token/refresh/", json={"refresh": refresh_token})
        assert refresh_response.status_code == 200
        assert (
            client.get(
                "/api/auth/me/",
                headers={"Authorization": f"Bearer {refresh_response.json()['access']}"},
            ).status_code
            == 200
        )

    def test_reset_password_before_email_verification(
        self, client: TestClient, register_data: dict, db_session
    ):
        """An unverified user can still reset their password via OTP."""
        email = register_data["email"]
        register_response = client.post("/api/auth/register/", json=register_data)
        user_id = register_response.json()["id"]

        assert client.post("/api/auth/forgot-password/", json={"email": email}).status_code == 200
        reset_code = _get_latest_otp(db_session, user_id)
        reset_response = client.post(
            "/api/auth/reset-password/",
            json={"email": email, "code": reset_code, "new_password": "ResetPass123!"},
        )
        assert reset_response.status_code == 200

        # Still unverified: must verify the account before logging in
        login_response = client.post(
            "/api/auth/login/", json={"email": email, "password": "ResetPass123!"}
        )
        assert login_response.status_code == 401
        assert login_response.json()["detail"]["code"] == "auth_val_007"

        verify_response = client.post(
            "/api/auth/verify-otp/",
            json={"email": email, "code": "000000"},
        )
        assert verify_response.status_code == 400

    def test_delete_account_wrong_password_keeps_session(
        self, client: TestClient, register_data: dict, db_session
    ):
        """A failed deletion must not invalidate the session."""
        email = register_data["email"]
        password = register_data["password"]
        register_response = client.post("/api/auth/register/", json=register_data)
        user_id = register_response.json()["id"]
        otp = _get_latest_otp(db_session, user_id)
        client.post("/api/auth/verify-otp/", json={"email": email, "code": otp})
        login = client.post("/api/auth/login/", json={"email": email, "password": password})
        headers = {"Authorization": f"Bearer {login.json()['access']}"}

        wrong = client.post(
            "/api/auth/delete-account/", json={"password": "wrong"}, headers=headers
        )
        assert wrong.status_code == 400

        me_response = client.get("/api/auth/me/", headers=headers)
        assert me_response.status_code == 200

    def test_delete_account_cascades_related_data(
        self, client: TestClient, register_data: dict, db_session
    ):
        """Deleting an account must cascade to every table referencing the user."""
        email = register_data["email"]
        password = register_data["password"]
        register_response = client.post("/api/auth/register/", json=register_data)
        user_id = register_response.json()["id"]
        otp = _get_latest_otp(db_session, user_id)
        client.post("/api/auth/verify-otp/", json={"email": email, "code": otp})
        login = client.post("/api/auth/login/", json={"email": email, "password": password})
        headers = {"Authorization": f"Bearer {login.json()['access']}"}

        # Give the account related data across several referencing tables
        project = Project(title="Cascade Test", description="")
        db_session.add(project)
        db_session.flush()
        db_session.add(
            UserProjectProfile(
                user_id=user_id, project_id=project.id, role=UserProjectProfile.Role.ADMIN
            )
        )
        db_session.add(Notification(user_id=user_id, type="TEST", title="Hi"))
        application = Application(project_id=project.id, app_id="com.test.app", title="Test App")
        db_session.add(application)
        db_session.flush()
        release = Release(application_id=application.id, version_code=1, version_id="1.0.0")
        db_session.add(release)
        db_session.flush()
        bug = BugReport(release_id=release.id, reporter_id=user_id, description="Bug")
        db_session.add(bug)
        db_session.flush()
        db_session.add(BugMessage(bug_id=bug.id, user_id=user_id, text="Message"))
        db_session.flush()

        # Account with all this data can still be deleted
        delete_response = client.post(
            "/api/auth/delete-account/",
            json={"password": password},
            headers=headers,
        )
        assert delete_response.status_code == 200

        # Every row referencing the user is gone
        assert (
            db_session.execute(select(User).where(User.id == user_id)).scalar_one_or_none() is None
        )
        assert (
            db_session.execute(
                select(UserProjectProfile).where(UserProjectProfile.user_id == user_id)
            ).scalar_one_or_none()
            is None
        )
        assert (
            db_session.execute(
                select(Notification).where(Notification.user_id == user_id)
            ).scalar_one_or_none()
            is None
        )
        assert (
            db_session.execute(
                select(BugReport).where(BugReport.reporter_id == user_id)
            ).scalar_one_or_none()
            is None
        )
        assert (
            db_session.execute(
                select(BugMessage).where(BugMessage.user_id == user_id)
            ).scalar_one_or_none()
            is None
        )
        assert (
            db_session.execute(
                select(OneTimePassword).where(OneTimePassword.user_id == user_id)
            ).scalar_one_or_none()
            is None
        )
