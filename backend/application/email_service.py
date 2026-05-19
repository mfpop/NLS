from __future__ import annotations

from urllib.parse import urljoin

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.template.loader import render_to_string

from application.services import get_setting_value


_APP_NAME = "LeanSync"


def _email_enabled() -> bool:
    val = get_setting_value("notifications.email_enabled", "False")
    return val.lower() in ("true", "1", "yes")


def _app_base_url() -> str:
    return get_setting_value("general.app_base_url", "http://localhost:5173")


def send_password_reset_email(user: User, token: str) -> bool:
    """Send a password reset email to the given user.

    Returns True if the email was sent (or queued), False if email is disabled.
    """
    if not _email_enabled():
        return False

    if not user.email:
        return False

    reset_url = urljoin(_app_base_url().rstrip("/") + "/", f"reset-password/{token}")

    subject = f"Reset your {_APP_NAME} password"

    plain_message = render_to_string("emails/password_reset.txt", {
        "app_name": _APP_NAME,
        "user_name": user.get_full_name() or user.username,
        "reset_url": reset_url,
        "expiry_hours": "1",  # matches default token expiry
    })

    html_message = render_to_string("emails/password_reset.html", {
        "app_name": _APP_NAME,
        "user_name": user.get_full_name() or user.username,
        "reset_url": reset_url,
        "expiry_hours": "1",
    })

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )
    return True
