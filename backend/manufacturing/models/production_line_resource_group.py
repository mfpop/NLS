from django.db import models
from django.core.validators import MinValueValidator
from shared.models.base import TimeStampedModel


class ProductionLineResourceGroup(TimeStampedModel):
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine",
        on_delete=models.CASCADE,
        related_name="assigned_resource_groups",
    )
    resource_group = models.ForeignKey(
        "manufacturing.ResourceGroup",
        on_delete=models.CASCADE,
        related_name="production_line_assignments",
    )
    sequence = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "manufacturing_production_line_resource_group"
        ordering = ["production_line", "sequence"]
        constraints = [
            models.UniqueConstraint(
                fields=["production_line", "resource_group"],
                name="uq_pl_rg_assignment",
            ),
            models.UniqueConstraint(
                fields=["production_line", "sequence"],
                name="uq_pl_rg_sequence",
            ),
        ]
        indexes = [
            models.Index(fields=["production_line", "sequence"]),
            models.Index(fields=["production_line", "is_active"]),
            models.Index(fields=["resource_group", "is_active"]),
        ]
        verbose_name = "Production Line Resource Group Assignment"
        verbose_name_plural = "Production Line Resource Group Assignments"

    def __str__(self):
        return f"{self.production_line} → {self.resource_group} (seq {self.sequence})"
