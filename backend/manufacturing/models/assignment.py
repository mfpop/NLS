from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.core.exceptions import ValidationError
from .entity_status import EntityStatus


class ProductionLineDepartmentAssignment(models.Model):
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.PROTECT,
        related_name="line_department_assignments",
    )
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.PROTECT,
        related_name="department_assignments",
    )
    department = models.ForeignKey(
        "manufacturing.Department", on_delete=models.PROTECT,
        related_name="line_assignments",
    )
    sequence = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_production_line_department"
        ordering = ["production_line", "sequence"]
        indexes = [
            models.Index(fields=["plant"], name="mfg_pld_plant_idx"),
            models.Index(fields=["production_line"], name="mfg_pld_line_idx"),
            models.Index(fields=["department"], name="mfg_pld_dept_idx"),
            models.Index(fields=["plant", "production_line"], name="mfg_pld_plant_line_idx"),
            models.Index(fields=["plant", "department"], name="mfg_pld_plant_dept_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["production_line", "department"],
                name="uq_line_department_assignment",
            ),
        ]
        verbose_name = "Line-Department Assignment"
        verbose_name_plural = "Line-Department Assignments"

    def clean(self):
        if self.plant_id and self.production_line_id and self.production_line.plant_id != self.plant_id:
            raise ValidationError("Plant must match the production line's plant.")
        if self.plant_id and self.department_id and self.department.plant_id != self.plant_id:
            raise ValidationError("Plant must match the department's plant.")
        if self.production_line_id and self.department_id and self.production_line.plant_id != self.department.plant_id:
            raise ValidationError("Production line and department must belong to the same plant.")

    def save(self, *args, **kwargs):
        if self.production_line_id and not self.plant_id:
            self.plant_id = self.production_line.plant_id
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.production_line.name} → {self.department.name} [#{self.sequence}]"
