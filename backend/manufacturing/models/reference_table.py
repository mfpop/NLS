from django.db import models
from shared.models.base import TimeStampedModel


class ReferenceTable(TimeStampedModel):
    GROUP_CHOICES = [
        ("organization", "Organization"),
        ("manufacturing", "Manufacturing"),
        ("material_flow", "Material Flow"),
        ("lean_quality", "Lean / Quality"),
        ("people", "People"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    name = models.CharField(max_length=200, verbose_name="Table Name")
    description = models.TextField(blank=True, default="")
    group = models.CharField(max_length=50, choices=GROUP_CHOICES, blank=True, default="", verbose_name="Group")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    entry_count = models.IntegerField(default=0, verbose_name="Number of entries")

    class Meta:
        db_table = "manufacturing_reference_table"
        ordering = ["name"]
        verbose_name = "Reference Table"
        verbose_name_plural = "Reference Tables"

    def __str__(self):
        return self.name
