from django.db import models
from django.core.exceptions import ValidationError
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class ProductionLine(TimeStampedModel):
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.PROTECT,
        related_name="production_lines",
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
    shift_pattern = models.CharField(max_length=100, blank=True, default="")
    shift_pattern_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    line_type_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    default_calendar_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    week_start_day_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    timezone_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    capacity_basis = models.CharField(max_length=100, blank=True, default="")
    capacity_uom_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    bottleneck_resource_group = models.ForeignKey(
        "manufacturing.ResourceGroup", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="bottleneck_for_lines",
    )
    is_constraint = models.BooleanField(default=False)

    def clean(self):
        if self.bottleneck_resource_group_id and self.plant_id:
            rg_plant_id = self.bottleneck_resource_group.department.plant_id
            if rg_plant_id != self.plant_id:
                raise ValidationError(
                    "Bottleneck resource group must belong to a department in the same plant."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        db_table = "manufacturing_production_line"
        ordering = ["name"]
        verbose_name = "Production Line"
        verbose_name_plural = "Production Lines"
        indexes = [
            models.Index(fields=["plant", "code"], name="mfg_line_plant_code_idx"),
            models.Index(fields=["plant"], name="mfg_line_plant_idx"),
        ]
        constraints = [
            models.UniqueConstraint(fields=["plant", "code"], name="uq_line_plant_code"),
            models.UniqueConstraint(fields=["plant", "name"], name="uq_line_plant_name"),
            models.UniqueConstraint(fields=["id", "plant"], name="uq_line_id_plant"),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class ProductionLineProductFamily(TimeStampedModel):
    production_line = models.ForeignKey(
        ProductionLine, on_delete=models.CASCADE,
        related_name="family_assignments",
        db_index=True,
    )
    product_family = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.CASCADE,
        related_name="pl_family_assignments",
        db_index=True,
    )
    is_primary = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )

    class Meta:
        db_table = "manufacturing_production_line_family"
        ordering = ["production_line", "product_family__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["production_line", "product_family"],
                name="uq_pl_family",
            ),
        ]
        indexes = [
            models.Index(fields=["production_line", "product_family"]),
            models.Index(fields=["production_line", "status"]),
        ]
        verbose_name = "Line-Family Assignment"
        verbose_name_plural = "Line-Family Assignments"

    def __str__(self):
        return f"{self.production_line.name} → {self.product_family.name}"


class ProductionLineProductModel(TimeStampedModel):
    production_line = models.ForeignKey(
        ProductionLine, on_delete=models.CASCADE,
        related_name="model_assignments",
        db_index=True,
    )
    product_model = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.CASCADE,
        related_name="pl_model_assignments",
        db_index=True,
    )
    product_family = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.CASCADE,
        related_name="pl_model_family_assignments",
        db_index=True,
    )
    is_primary = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )

    class Meta:
        db_table = "manufacturing_production_line_model"
        ordering = ["production_line", "product_model__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["production_line", "product_model"],
                name="uq_pl_model",
            ),
        ]
        indexes = [
            models.Index(fields=["production_line", "product_model"]),
            models.Index(fields=["production_line", "product_family"]),
            models.Index(fields=["production_line", "status"]),
        ]
        verbose_name = "Line-Model Assignment"
        verbose_name_plural = "Line-Model Assignments"

    def __str__(self):
        return f"{self.production_line.name} → {self.product_model.name}"
