from django.db import models
from .entity_status import EntityStatus


class ReferenceCategory(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_reference_category"
        ordering = ["name"]
        verbose_name = "Reference Category"
        verbose_name_plural = "Reference Categories"

    def __str__(self):
        return self.name


class ReferenceValue(models.Model):
    category = models.ForeignKey(
        ReferenceCategory, on_delete=models.CASCADE, related_name="values",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    description = models.TextField(default="")
    usage_context = models.TextField(default="")
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_system_managed = models.BooleanField(default=False)
    is_configurable = models.BooleanField(default=True)
    metadata = models.JSONField(blank=True, default=dict)
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_reference_value"
        ordering = ["category", "sort_order", "name"]
        unique_together = [("category", "code")]
        constraints = [
            models.CheckConstraint(condition=~models.Q(code=""), name="ref_value_code_not_empty"),
            models.CheckConstraint(condition=~models.Q(name=""), name="ref_value_name_not_empty"),
            models.CheckConstraint(condition=~models.Q(description=""), name="ref_value_description_not_empty"),
            models.CheckConstraint(condition=~models.Q(usage_context=""), name="ref_value_usage_context_not_empty"),
        ]
        verbose_name = "Reference Value"
        verbose_name_plural = "Reference Values"

    def __str__(self):
        return f"{self.category.name} / {self.name}"


class ResourceType(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_resource_type"
        ordering = ["name"]
        verbose_name = "Resource Type"
        verbose_name_plural = "Resource Types"

    def __str__(self):
        return self.name


class VisualIdentity(models.Model):
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50)
    icon_key = models.CharField(max_length=100, blank=True, default="")
    color_key = models.CharField(max_length=50, blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_visual_identity"
        unique_together = [("entity_type", "entity_id")]
        verbose_name = "Visual Identity"
        verbose_name_plural = "Visual Identities"

    def __str__(self):
        return f"{self.entity_type}:{self.entity_id} ({self.icon_key}/{self.color_key})"
