from django.db import models
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class ResourceGroup(TimeStampedModel):
    department = models.ForeignKey(
        "manufacturing.Department", on_delete=models.CASCADE,
        related_name="resource_groups", null=True, blank=True,
    )
    code = models.CharField(max_length=50, blank=True, default="")
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
    group_type_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )

    class Meta:
        db_table = "manufacturing_resource_group"
        ordering = ["name"]
        verbose_name = "Resource Group"
        verbose_name_plural = "Resource Groups"

    def __str__(self):
        return f"{self.name}"
