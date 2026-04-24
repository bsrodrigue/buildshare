import pytest
from rest_framework import status
from rest_framework.test import APIClient

from users.models import User


@pytest.mark.django_db
class TestUserRegistration:
    @pytest.fixture
    def client(self) -> APIClient:
        return APIClient()

    def test_user_registration_success(self, client: APIClient) -> None:
        url = "/api/auth/register/"
        data = {
            "email": "newuser@example.com",
            "password": "strongpassword123",
            "first_name": "Jean",
            "last_name": "Dupont",
        }

        response = client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email="newuser@example.com").exists()
        user = User.objects.get(email="newuser@example.com")
        assert user.first_name == "Jean"
        assert user.last_name == "Dupont"

    def test_user_registration_duplicate_email_fails(self, client: APIClient) -> None:
        User.objects.create_user(email="existing@example.com", password="password")

        url = "/api/auth/register/"
        data = {
            "email": "existing@example.com",
            "password": "anotherpassword",
        }

        response = client.post(url, data)

        # Should return 400 Bad Request due to IntegrityError/ApplicationError handling
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_user_registration_creates_profile(self, client: APIClient) -> None:
        url = "/api/auth/register/"
        data = {
            "email": "profileuser@example.com",
            "password": "strongpassword123",
            "first_name": "Jean",
            "last_name": "Dupont",
        }

        response = client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="profileuser@example.com")

        # Verify profile exists
        assert hasattr(user, "profile")
        assert user.profile.user == user
