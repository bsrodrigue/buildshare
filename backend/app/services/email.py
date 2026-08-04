from __future__ import annotations

import logging
from html import escape
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service using Brevo API."""

    def __init__(self) -> None:
        self._client: Any = None

    def _get_client(self) -> Any:
        """Lazy-load the Brevo client."""
        if self._client is None:
            try:
                from brevo import Brevo

                self._client = Brevo(api_key=settings.BREVO_API_KEY)
            except ImportError:
                logger.warning("brevo package not installed. Email sending disabled.")
                raise
        return self._client

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        to_name: str = "",
    ) -> bool:
        """Send an email via Brevo.

        Returns True if sent successfully, False otherwise.
        """
        if not settings.BREVO_API_KEY:
            logger.warning("BREVO_API_KEY not configured. Email not sent.")
            return False

        if not settings.BREVO_SENDER_EMAIL:
            logger.warning("BREVO_SENDER_EMAIL not configured. Email not sent.")
            return False

        try:
            from brevo.transactional_emails import (
                SendTransacEmailRequestSender,
                SendTransacEmailRequestToItem,
            )

            client = self._get_client()

            sender = SendTransacEmailRequestSender(
                email=settings.BREVO_SENDER_EMAIL,
                name=settings.BREVO_SENDER_NAME,
            )

            to_item = SendTransacEmailRequestToItem(
                email=to_email,
                name=to_name,
            )

            client.transactional_emails.send_transac_email(
                subject=subject,
                html_content=html_content,
                sender=sender,
                to=[to_item],
            )

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except ImportError:
            logger.warning("brevo package not installed. Email not sent.")
            return False
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False


# Global email service instance
email_service = EmailService()


def send_otp_email(to_email: str, otp_code: str, user_name: str = "") -> bool:
    """Send an OTP verification email.

    Args:
        to_email: Recipient email address
        otp_code: The 6-digit OTP code
        user_name: Optional recipient name

    Returns:
        True if sent successfully, False otherwise
    """
    user_name = escape(user_name)
    subject = "Votre code de vérification BuildShare"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">BuildShare</h1>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #333; margin-top: 0;">Code de vérification</h2>

            <p style="color: #666; font-size: 16px;">
                Bonjour{f" {user_name}" if user_name else ""},
            </p>

            <p style="color: #666; font-size: 16px;">
                Voici votre code de vérification :
            </p>

            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">{otp_code}</span>
            </div>

            <p style="color: #999; font-size: 14px;">
                Ce code expire dans 15 minutes.
            </p>

            <p style="color: #999; font-size: 14px;">
                Si vous n'avez pas demandé ce code, veuillez ignorer cet email.
            </p>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>Cet email a été envoyé par BuildShare</p>
        </div>
    </body>
    </html>
    """

    return email_service.send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        to_name=user_name,
    )


def send_account_activated_email(to_email: str, user_name: str = "") -> bool:
    user_name = escape(user_name)
    subject = "Compte activé — Bienvenue sur BuildShare"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">BuildShare</h1>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #333; margin-top: 0;">Votre compte est activé</h2>

            <p style="color: #666; font-size: 16px;">
                Bonjour{f" {user_name}" if user_name else ""},
            </p>

            <p style="color: #666; font-size: 16px;">
                Votre adresse email a été vérifiée avec succès. Vous pouvez dès maintenant vous connecter et commencer à partager vos builds.
            </p>

            <div style="margin: 30px 0;">
                <a href="{settings.PUBLIC_URL}/login" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                    Se connecter
                </a>
            </div>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>Cet email a été envoyé par BuildShare</p>
        </div>
    </body>
    </html>
    """

    return email_service.send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        to_name=user_name,
    )


def send_password_reset_email(to_email: str, reset_token: str, user_name: str = "") -> bool:
    """Send a password reset email with a reset link.

    Args:
        to_email: Recipient email address
        reset_token: The JWT reset token
        user_name: Optional recipient name

    Returns:
        True if sent successfully, False otherwise
    """
    user_name = escape(user_name)
    # Build reset URL — in production, this should be your frontend URL
    base_url = settings.PUBLIC_URL or "http://localhost:8081"
    reset_url = escape(f"{base_url}/reset-password?token={reset_token}")

    subject = "Réinitialisation de votre mot de passe BuildShare"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">BuildShare</h1>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
            <h2 style="color: #333; margin-top: 0; text-align: center;">Réinitialisation du mot de passe</h2>

            <p style="color: #666; font-size: 16px;">
                Bonjour{f" {user_name}" if user_name else ""},
            </p>

            <p style="color: #666; font-size: 16px;">
                Vous avez demandé la réinitialisation de votre mot de passe.
                Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                    Réinitialiser mon mot de passe
                </a>
            </div>

            <p style="color: #999; font-size: 14px; text-align: center;">
                Ce lien expire dans 1 heure.
            </p>

            <p style="color: #999; font-size: 14px; text-align: center;">
                Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.
                Votre mot de passe actuel restera inchangé.
            </p>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>Cet email a été envoyé par BuildShare</p>
        </div>
    </body>
    </html>
    """

    return email_service.send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        to_name=user_name,
    )


def send_email_change_verification_email(to_email: str, otp_code: str, user_name: str = "") -> bool:
    """Send an email change verification email.

    Args:
        to_email: The NEW email address
        otp_code: The 6-digit OTP code
        user_name: Optional recipient name

    Returns:
        True if sent successfully, False otherwise
    """
    user_name = escape(user_name)
    subject = "Vérification du changement d'email BuildShare"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">BuildShare</h1>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #333; margin-top: 0;">Changement d'adresse email</h2>

            <p style="color: #666; font-size: 16px;">
                Bonjour{f" {user_name}" if user_name else ""},
            </p>

            <p style="color: #666; font-size: 16px;">
                Vous avez demandé un changement d'adresse email.
                Voici votre code de vérification :
            </p>

            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">{otp_code}</span>
            </div>

            <p style="color: #999; font-size: 14px;">
                Ce code expire dans 15 minutes.
            </p>

            <p style="color: #999; font-size: 14px;">
                Si vous n'avez pas demandé ce changement, veuillez ignorer cet email.
            </p>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>Cet email a été envoyé par BuildShare</p>
        </div>
    </body>
    </html>
    """

    return email_service.send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        to_name=user_name,
    )
