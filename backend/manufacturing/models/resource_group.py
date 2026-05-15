from django.db import models
from django.core.exceptions import ValidationError
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class CapabilityType(models.TextChoices):
    SHARED = "SHARED", "Shared"
    DEDICATED = "DEDICATED", "Dedicated"
    CONSTRAINT = "CONSTRAINT", "Constraint"
    PACEMAKER = "PACEMAKER", "Pacemaker"
    MANUAL = "MANUAL", "Manual"
    AUTOMATED = "AUTOMATED", "Automated"


class ResourceGroup(TimeStampedModel):
    department = models.ForeignKey(
        "manufacturing.Department", on_delete=models.PROTECT,
        related_name="resource_groups",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    status_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    members = models.IntegerField(default=0)
    leader = models.CharField(max_length=200, blank=True, default="")
    supervisor = models.CharField(max_length=200, blank=True, default="")
    group_type_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    capability_type = models.CharField(
        max_length=20, choices=CapabilityType.choices,
        default=CapabilityType.SHARED,
    )
    shift_pattern_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    capacity_model = models.CharField(max_length=100, blank=True, default="")
    oee_target = models.FloatField(null=True, blank=True)
    is_bottleneck = models.BooleanField(default=False)
    is_constraint = models.BooleanField(default=False)

    class Meta:
        db_table = "manufacturing_resource_group"
        ordering = ["name"]
        verbose_name = "Resource Group"
        verbose_name_plural = "Resource Groups"
        constraints = [
            models.UniqueConstraint(fields=["department", "code"], name="uq_resource_group_department_code"),
            models.UniqueConstraint(fields=["department", "name"], name="uq_resource_group_department_name"),
        ]
        indexes = [
            models.Index(fields=["department"], name="mfg_rg_department_idx"),
            models.Index(fields=["department", "code"], name="mfg_rg_department_code_idx"),
            models.Index(fields=["status"], name="mfg_rg_status_idx"),
        ]

    def clean(self):
        if self.pk and self.department_id:
            original = ResourceGroup.objects.get(pk=self.pk)
            if original.department_id != self.department_id:
                if self.resources.exists():
                    raise ValidationError(
                        "Cannot change department while resources are assigned to this group."
                    )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}"
