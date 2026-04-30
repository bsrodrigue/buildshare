from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .apis import MeApi, RegisterApi, ResendOtpApi, VerifyOtpApi

urlpatterns = [
    path("register/", RegisterApi.as_view(), name="register"),
    path("verify-otp/", VerifyOtpApi.as_view(), name="verify_otp"),
    path("resend-otp/", ResendOtpApi.as_view(), name="resend_otp"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeApi.as_view(), name="me"),
]
