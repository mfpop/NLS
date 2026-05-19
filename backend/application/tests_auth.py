"""
Tests for authentication mutations:
- Login (ManufacturingMutation.login)
- Register (AuthMutation.register)
- requestPasswordReset (AuthMutation.request_password_reset)
- resetPassword (AuthMutation.reset_password)

Security invariants:
- Generic error messages only (no user enumeration)
- Password reset token expires
- Rate limiting on password reset requests
- Self-registration respects backend policy
"""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from django.utils.crypto import get_random_string

from api.mutations.auth import AuthMutation
from api.mutations.manufacturing import ManufacturingMutation
from api.types.auth import LoginInput, RegisterInput, ResetPasswordInput
from application.models import PasswordResetToken
from application.services import get_setting_value


class LoginTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="securepass123",
        )
        self.mutation = ManufacturingMutation()

    def _input(self, username="testuser", password="securepass123") -> LoginInput:
        return LoginInput(username=username, password=password)

    def test_successful_login_returns_token_and_user(self):
        result = self.mutation.login(self._input())
        self.assertIsNotNone(result)
        self.assertIsNotNone(result.token)
        self.assertEqual(result.user.username, "testuser")
        self.assertEqual(result.user.email, "test@example.com")

    def test_login_wrong_password_returns_none(self):
        result = self.mutation.login(self._input(password="wrongpass"))
        self.assertIsNone(result)

    def test_login_nonexistent_user_returns_none(self):
        result = self.mutation.login(self._input(username="nobody"))
        self.assertIsNone(result)

    def test_login_empty_credentials_returns_none(self):
        result = self.mutation.login(self._input(username="", password=""))
        self.assertIsNone(result)


class RegisterTests(TestCase):
    def setUp(self):
        self.mutation = AuthMutation()
        # Ensure self_registration_enabled exists and is True
        from application.models import ApplicationSetting
        ApplicationSetting.objects.get_or_create(
            key="security.self_registration_enabled",
            defaults={"value": True, "value_type": "BOOLEAN", "category": "security"},
        )

    def _input(self, username="newuser", email="new@example.com",
               password="securepass123", first_name="", last_name="") -> RegisterInput:
        return RegisterInput(
            username=username, email=email, password=password,
            first_name=first_name, last_name=last_name,
        )

    def test_successful_registration_returns_ok(self):
        result = self.mutation.register(self._input())
        self.assertTrue(result.ok)
        self.assertEqual(result.message, "Account created successfully.")
        self.assertIsNotNone(result.user)
        self.assertEqual(result.user.username, "newuser")
        self.assertEqual(result.user.email, "new@example.com")
        # Verify user was actually created
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_duplicate_username_rejected(self):
        User.objects.create_user(username="existing", password="pass12345")
        result = self.mutation.register(self._input(username="existing"))
        self.assertFalse(result.ok)
        self.assertIn("already taken", result.message)

    def test_duplicate_email_rejected(self):
        User.objects.create_user(username="user1", email="dup@example.com", password="pass12345")
        result = self.mutation.register(self._input(email="dup@example.com", username="user2"))
        self.assertFalse(result.ok)
        self.assertIn("already registered", result.message)

    def test_weak_password_rejected(self):
        result = self.mutation.register(self._input(password="short"))
        self.assertFalse(result.ok)
        self.assertIn("8 characters", result.message)

    def test_blank_username_or_password_rejected(self):
        result = self.mutation.register(self._input(username="", password=""))
        self.assertFalse(result.ok)
        self.assertIn("required", result.message.lower())

    def test_self_registration_disabled_rejected(self):
        from application.models import ApplicationSetting
        setting = ApplicationSetting.objects.get(key="security.self_registration_enabled")
        setting.value = False
        setting.save()

        result = self.mutation.register(self._input(
            username="shouldfail", email="fail@example.com"
        ))
        self.assertFalse(result.ok)
        self.assertEqual(result.message, "Account creation requires administrator invitation.")
        self.assertIsNone(result.user)
        # Verify user was NOT created
        self.assertFalse(User.objects.filter(username="shouldfail").exists())

    def test_self_registration_creates_guest_role(self):
        from manufacturing.models import UserRole
        result = self.mutation.register(self._input(
            username="roleuser", email="role@example.com"
        ))
        self.assertTrue(result.ok)
        user = User.objects.get(username="roleuser")
        self.assertTrue(UserRole.objects.filter(user=user, role=UserRole.RoleType.GUEST).exists())


class RequestPasswordResetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="resetuser", email="reset@example.com", password="oldpass123",
        )
        self.user_no_email = User.objects.create_user(
            username="noemailuser", email="", password="pass12345",
        )
        self.mutation = AuthMutation()

    def test_existing_user_gets_token_created(self):
        self.mutation.request_password_reset("resetuser")
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 1)

    def test_existing_user_by_email_gets_token(self):
        self.mutation.request_password_reset("reset@example.com")
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 1)

    def test_always_returns_same_message_for_security(self):
        result_existing = self.mutation.request_password_reset("resetuser")
        result_nonexistent = self.mutation.request_password_reset("nonexistent")
        self.assertEqual(result_existing.message, "If an account exists, reset instructions were sent.")
        # Same message even for non-existing user
        self.assertEqual(result_existing.message, result_nonexistent.message)

    def test_no_token_created_for_nonexistent_user(self):
        self.mutation.request_password_reset("nonexistent")
        self.assertEqual(PasswordResetToken.objects.count(), 0)

    def test_no_token_created_for_user_without_email(self):
        self.mutation.request_password_reset("noemailuser")
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user_no_email).count(), 0)

    def test_rate_limit_respects_cooldown(self):
        # First request creates a token
        self.mutation.request_password_reset("resetuser")
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 1)

        # Second request within 5 minutes should be rate-limited (no new token)
        self.mutation.request_password_reset("resetuser")
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 1)

    def test_rate_limit_expires_after_5_minutes(self):
        self.mutation.request_password_reset("resetuser")
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 1)

        # Manually move the existing token back by 6 minutes so cooldown expires
        token = PasswordResetToken.objects.get(user=self.user)
        token.created_at = timezone.now() - timedelta(minutes=6)
        token.save()

        self.mutation.request_password_reset("resetuser")
        self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 2)

    def test_email_is_sent(self):
        with patch("api.mutations.auth.send_password_reset_email") as mock_send:
            self.mutation.request_password_reset("resetuser")
            mock_send.assert_called_once()
            args, _ = mock_send.call_args
            self.assertEqual(args[0], self.user)  # user object
            self.assertIsInstance(args[1], str)    # token string
            self.assertEqual(len(args[1]), 48)     # _RESET_TOKEN_LENGTH

    def test_email_failure_logged_not_crashed(self):
        with patch("api.mutations.auth.send_password_reset_email", side_effect=Exception("SMTP down")):
            # Should not raise — failure is logged silently
            result = self.mutation.request_password_reset("resetuser")
            self.assertEqual(result.message, "If an account exists, reset instructions were sent.")
            # Token should still be created even if email fails
            self.assertEqual(PasswordResetToken.objects.filter(user=self.user).count(), 1)

    def test_token_has_expiry(self):
        self.mutation.request_password_reset("resetuser")
        token = PasswordResetToken.objects.get(user=self.user)
        self.assertIsNotNone(token.expires_at)
        # Default expiry is 60 minutes from now
        expected_expiry = timezone.now() + timedelta(minutes=60)
        diff = abs((token.expires_at - expected_expiry).total_seconds())
        self.assertLess(diff, 5)  # within 5 seconds

    def test_token_uses_custom_expiry_from_settings(self):
        from application.models import ApplicationSetting
        ApplicationSetting.objects.update_or_create(
            key="security.password_reset_token_expiry_minutes",
            defaults={"value": 30, "value_type": "INTEGER", "category": "security"},
        )
        self.mutation.request_password_reset("resetuser")
        token = PasswordResetToken.objects.get(user=self.user)
        expected_expiry = timezone.now() + timedelta(minutes=30)
        diff = abs((token.expires_at - expected_expiry).total_seconds())
        self.assertLess(diff, 5)


class ResetPasswordTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="resetuser", email="reset@example.com", password="oldpass123",
        )
        self.token = PasswordResetToken.objects.create(
            user=self.user,
            token=get_random_string(48),
            expires_at=timezone.now() + timedelta(hours=1),
        )
        self.mutation = AuthMutation()

    def _input(self, token=None, new_password="newsecurepass456") -> ResetPasswordInput:
        return ResetPasswordInput(
            token=token or self.token.token,
            new_password=new_password,
        )

    def test_successful_reset_returns_ok(self):
        result = self.mutation.reset_password(self._input())
        self.assertTrue(result.ok)
        self.assertEqual(result.message, "Password has been reset successfully.")

    def test_password_is_actually_changed(self):
        self.mutation.reset_password(self._input())
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newsecurepass456"))
        self.assertFalse(self.user.check_password("oldpass123"))

    def test_token_is_marked_used(self):
        self.mutation.reset_password(self._input())
        self.token.refresh_from_db()
        self.assertTrue(self.token.is_used)

    def test_used_token_rejected(self):
        # First use succeeds
        self.mutation.reset_password(self._input())
        # Second use fails
        result = self.mutation.reset_password(self._input())
        self.assertFalse(result.ok)
        self.assertIn("Invalid or expired", result.message)

    def test_invalid_token_rejected(self):
        result = self.mutation.reset_password(self._input(token="invalidtoken123"))
        self.assertFalse(result.ok)
        self.assertIn("Invalid or expired", result.message)

    def test_expired_token_rejected(self):
        self.token.expires_at = timezone.now() - timedelta(minutes=1)
        self.token.save()
        result = self.mutation.reset_password(self._input())
        self.assertFalse(result.ok)
        self.assertIn("Invalid or expired", result.message)

    def test_weak_password_rejected(self):
        result = self.mutation.reset_password(self._input(new_password="short"))
        self.assertFalse(result.ok)
        self.assertIn("8 characters", result.message)

    def test_token_still_valid_after_password_change(self):
        """Verify password change works with a valid token."""
        result = self.mutation.reset_password(self._input())
        self.assertTrue(result.ok)
        # Verify new password works for login
        from django.contrib.auth import authenticate
        authed_user = authenticate(username="resetuser", password="newsecurepass456")
        self.assertIsNotNone(authed_user)
        # Old password no longer works
        old_authed = authenticate(username="resetuser", password="oldpass123")
        self.assertIsNone(old_authed)
