from django.db import models
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class Department(TimeStampedModel):
    plant = models.ForeignKey(
        "manufacturing.Plant",
        on_delete=models.PROTECT,
        related_name="departments",
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
    manager = models.CharField(max_length=200, blank=True, default="")
    supervisor = models.CharField(max_length=200, blank=True, default="")
    employees = models.IntegerField(default=0)
    department_type_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )

    class Meta:
        db_table = "manufacturing_department"
        ordering = ["name"]
        verbose_name = "Department"
        verbose_name_plural = "Departments"
        indexes = [
            models.Index(fields=["plant", "code"], name="mfg_dept_plant_code_idx"),
            models.Index(fields=["code"], name="mfg_dept_code_idx"),
            models.Index(fields=["status"], name="mfg_dept_status_idx"),
            models.Index(fields=["name"], name="mfg_dept_name_idx"),
        ]
        constraints = [
            models.UniqueConstraint(fields=["plant", "code"], name="uq_department_plant_code"),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"
