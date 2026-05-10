from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from .entity_status import EntityStatus


class ProductionLineDepartmentAssignment(models.Model):
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.CASCADE,
        related_name="department_assignments",
    )
    department = models.ForeignKey(
        "manufacturing.Department", on_delete=models.CASCADE,
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
        unique_together = [("production_line", "department")]
        verbose_name = "Line-Department Assignment"
        verbose_name_plural = "Line-Department Assignments"

    def __str__(self):
        return f"{self.production_line.name} → {self.department.name} [#{self.sequence}]"
