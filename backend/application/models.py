from django.db import models


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
