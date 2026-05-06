from django.db import models
from django.contrib.auth.models import User
from shared.models.base import TimeStampedModel


class UserRole(models.Model):
    class RoleType(models.TextChoices):
        DB_ADMIN = "db_admin", "Database Admin"
        APP_OWNER = "app_owner", "Application Owner"
        DEPT_MANAGER = "dept_manager", "Department Manager"
        SUPERVISOR = "supervisor", "Supervisor"
        GUEST = "guest", "Guest"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="role_profile")
    role = models.CharField(max_length=20, choices=RoleType.choices, default=RoleType.GUEST)
    plant = models.CharField(max_length=200, blank=True, default="")
    department = models.CharField(max_length=200, blank=True, default="")

    def __str__(self):
        parts = [self.user.username, self.get_role_display()]
        if self.plant:
            parts.append(f"[{self.plant}]")
        if self.department:
            parts.append(f"({self.department})")
        return " ".join(parts)
