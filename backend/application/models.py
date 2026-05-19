from django.db import models

from shared.models.base import TimeStampedModel


class ApplicationSetting(models.Model):
    class ValueType(models.TextChoices):
        STRING = "STRING", "String"
        BOOLEAN = "BOOLEAN", "Boolean"
        INTEGER = "INTEGER", "Integer"
        DECIMAL = "DECIMAL", "Decimal"
        JSON = "JSON", "JSON"

    key = models.CharField(max_length=80, unique=True)
    value = models.JSONField(default=dict)
    value_type = models.CharField(max_length=16, choices=ValueType.choices, default=ValueType.STRING)
    category = models.CharField(max_length=40)
    description = models.CharField(max_length=255, blank=True, default="")
    is_system = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "key"]
        indexes = [
            models.Index(fields=["category"], name="app_setting_category_idx"),
        ]

    def __str__(self) -> str:
        return self.key


class PasswordResetToken(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["token"], name="pwd_reset_token_idx"),
            models.Index(fields=["user", "is_used"], name="pwd_reset_user_used_idx"),
        ]

    def __str__(self) -> str:
        return f"Reset token for {self.user.username} (used={self.is_used})"


class ImportSourceConfig(TimeStampedModel):
    class SourceType(models.TextChoices):
        EXCEL = "EXCEL", "Excel"
        CSV = "CSV", "CSV"
        ERP_EXPORT = "ERP_EXPORT", "ERP export"

    class Domain(models.TextChoices):
        PLANT_STRUCTURE = "PLANT_STRUCTURE", "Plant structure"
        MATERIALS = "MATERIALS", "Materials"
        BOM = "BOM", "BOM"
        ROUTING = "ROUTING", "Routing"
        SCHEDULES = "SCHEDULES", "Schedules"
        INVENTORY = "INVENTORY", "Inventory"

    name = models.CharField(max_length=120)
    source_type = models.CharField(max_length=16, choices=SourceType.choices)
    domain = models.CharField(max_length=32, choices=Domain.choices)
    path = models.CharField(max_length=512)
    file_pattern = models.CharField(max_length=120)
    archive_path = models.CharField(max_length=512, blank=True, default="")
    error_path = models.CharField(max_length=512, blank=True, default="")
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    polling_interval_minutes = models.PositiveIntegerField(null=True, blank=True)
    last_checked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["domain", "name"]
        indexes = [
            models.Index(fields=["domain", "is_active"], name="import_src_domain_active_idx"),
            models.Index(fields=["is_archived"], name="import_src_archived_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.domain})"
