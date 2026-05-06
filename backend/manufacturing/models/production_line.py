from django.db import models
from shared.models.base import TimeStampedModel


class ProductionLine(TimeStampedModel):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    code = models.CharField(max_length=20, verbose_name="Line Code")
    name = models.CharField(max_length=200, verbose_name="Line Name")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    plant = models.ForeignKey(
        "manufacturing.Plant",
        on_delete=models.CASCADE,
        related_name="production_lines",
    )
    departments = models.ManyToManyField(
        "manufacturing.Department",
        related_name="production_lines",
        blank=True,
    )
    models_produced = models.TextField(blank=True, default="", help_text="Comma-separated list of models")
    shift_pattern = models.CharField(max_length=100, blank=True, default="")
    is_constraint = models.BooleanField(default=False)

    department_count = models.IntegerField(default=0)
    group_count = models.IntegerField(default=0)
    resource_count = models.IntegerField(default=0)

    class Meta:
        db_table = "manufacturing_production_line"
        ordering = ["name"]
        verbose_name = "Production Line"
        verbose_name_plural = "Production Lines"

    def __str__(self):
        return f"{self.name} ({self.code})"
