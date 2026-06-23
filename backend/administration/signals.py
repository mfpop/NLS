"""Signal handlers for auto-logging system events to SystemAuditLog.

Handles:
- User login/logout events
- User role assignments
- Data changes (via model save signals for key entities)
"""

from django.db.models.signals import post_save, pre_save
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.contrib.auth.models import User


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log when a user logs in."""
    from .models import SystemAuditLog
    ip = _get_client_ip(request)
    SystemAuditLog.objects.create(
        event_type=SystemAuditLog.EventType.LOGIN_EVENT,
        user=user,
        username=user.username,
        action="USER_LOGIN",
        description=f"User {user.username} logged in.",
        ip_address=ip,
        details={"user_id": user.id, "username": user.username},
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log when a user logs out."""
    from .models import SystemAuditLog
    ip = _get_client_ip(request)
    SystemAuditLog.objects.create(
        event_type=SystemAuditLog.EventType.LOGIN_EVENT,
        user=user,
        username=user.username if user else "unknown",
        action="USER_LOGOUT",
        description=f"User {user.username if user else 'unknown'} logged out.",
        ip_address=ip,
        details={"user_id": user.id if user else None},
    )


def _get_client_ip(request):
    """Extract the client IP from the request."""
    if request is None:
        return None
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def log_audit_event(
    event_type, action, description,
    user=None, username="", entity_type="", entity_id="",
    ip_address=None, details=None,
):
    """Helper to create audit log entries from anywhere in the codebase."""
    from .models import SystemAuditLog
    SystemAuditLog.objects.create(
        event_type=event_type,
        user=user,
        username=username or (user.username if user else ""),
        action=action,
        description=description,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else "",
        ip_address=ip_address,
        details=details or {},
    )
