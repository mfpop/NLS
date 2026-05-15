from django.db import models
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class Resource(TimeStampedModel):
    resource_group = models.ForeignKey(
        "manufacturing.ResourceGroup", on_delete=models.PROTECT,
        related_name="resources",
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
    resource_type_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    capabilities = models.ManyToManyField(
        "manufacturing.ReferenceValue", blank=True,
        related_name="resources_with_capability",
    )

    class Meta:
        db_table = "manufacturing_resource"
        ordering = ["name"]
        verbose_name = "Resource"
        verbose_name_plural = "Resources"
        indexes = [
            models.Index(fields=["resource_group", "code"], name="mfg_res_group_code_idx"),
            models.Index(fields=["resource_group"], name="mfg_res_group_idx"),
        ]
        constraints = [
            models.UniqueConstraint(fields=["resource_group", "code"], name="uq_resource_group_code"),
            models.UniqueConstraint(fields=["resource_group", "name"], name="uq_resource_group_name"),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

