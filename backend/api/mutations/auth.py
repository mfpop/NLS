import strawberry
from typing import Optional
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.db import transaction

from api.types.auth import (
    ForgotPasswordPayload, ResetPasswordInput, ResetPasswordPayload,
    RegisterInput, RegisterPayload, UserNode,
)
from api.auth_utils import encode_jwt
from api.permissions import ensure_access
from application.email_service import send_password_reset_email
from application.models import PasswordResetToken
from application.services import get_setting_value


_RESET_TOKEN_LENGTH = 48


@strawberry.type
class AuthMutation:
    @strawberry.mutation
    def request_password_reset(self, username_or_email: str) -> ForgotPasswordPayload:
        """Request a password reset token. Always returns the same message for security."""
        user = User.objects.filter(
            models.Q(username__iexact=username_or_email) | models.Q(email__iexact=username_or_email)
        ).first()

        if user and user.email:
            # Rate limit: max one token per 5 minutes
            cooldown = timezone.now() - timedelta(minutes=5)
            recent = PasswordResetToken.objects.filter(
                user=user,
                created_at__gte=cooldown,
            ).exists()
            if not recent:
                expiry_minutes = int(get_setting_value("security.password_reset_token_expiry_minutes", "60"))
                token = get_random_string(_RESET_TOKEN_LENGTH)
                PasswordResetToken.objects.create(
                    user=user,
                    token=token,
                    expires_at=timezone.now() + timedelta(minutes=expiry_minutes),
                )
                # Send the reset email
                try:
                    send_password_reset_email(user, token)
                except Exception as exc:
                    import logging
                    logging.getLogger("lmd.auth").warning(
                        "Failed to send password reset email to user %s: %s", user.id, exc
                    )

        return ForgotPasswordPayload(
            message="If an account exists, reset instructions were sent."
        )

    @strawberry.mutation
    def reset_password(self, input: ResetPasswordInput) -> ResetPasswordPayload:
        """Reset a user's password using a valid reset token."""
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(
                token=input.token,
                is_used=False,
                expires_at__gt=timezone.now(),
            )
        except PasswordResetToken.DoesNotExist:
            return ResetPasswordPayload(
                ok=False,
                message="Invalid or expired reset token.",
            )

        if len(input.new_password) < 8:
            return ResetPasswordPayload(
                ok=False,
                message="Password must be at least 8 characters.",
            )

        user = reset_token.user
        user.set_password(input.new_password)
        user.save(update_fields=["password"])

        reset_token.is_used = True
        reset_token.save(update_fields=["is_used"])

        return ResetPasswordPayload(
            ok=True,
            message="Password has been reset successfully.",
        )

    @strawberry.mutation
    @transaction.atomic
    def register(self, input: RegisterInput) -> RegisterPayload:
        """Register a new user account if self-registration is enabled."""
        self_reg_enabled = get_setting_value("security.self_registration_enabled", "True")
        if self_reg_enabled.lower() not in ("true", "1", "yes"):
            return RegisterPayload(
                ok=False,
                message="Account creation requires administrator invitation.",
            )

        username = input.username.strip()
        email = input.email.strip()
        password = input.password

        if not username or not password:
            return RegisterPayload(ok=False, message="Username and password are required.")

        if len(password) < 8:
            return RegisterPayload(ok=False, message="Password must be at least 8 characters.")

        if User.objects.filter(username__iexact=username).exists():
            return RegisterPayload(ok=False, message="That username is already taken.")

        if email and User.objects.filter(email__iexact=email).exists():
            return RegisterPayload(ok=False, message="That email is already registered.")

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=input.first_name.strip(),
            last_name=input.last_name.strip(),
        )

        from manufacturing.models import UserRole
        UserRole.objects.create(user=user, role=UserRole.RoleType.GUEST)

        role = "guest"
        return RegisterPayload(
            ok=True,
            message="Account created successfully.",
            user=UserNode(
                id=str(user.id),
                name=user.get_full_name() or user.username,
                username=user.username,
                email=user.email or "",
                role=role,
                plant="",
                department="",
                display_name=user.get_full_name() or user.username,
            ),
        )
