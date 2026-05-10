from django.db import models
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class ProductionLine(TimeStampedModel):
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.CASCADE,
        related_name="production_lines",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    shift_pattern = models.CharField(max_length=100, blank=True, default="")
    is_constraint = models.BooleanField(default=False)

    class Meta:
        db_table = "manufacturing_production_line"
        ordering = ["name"]
        verbose_name = "Production Line"
        verbose_name_plural = "Production Lines"

    def __str__(self):
        return f"{self.name} ({self.code})"
