from django.db import models
from shared.models.base import TimeStampedModel


class ReferenceTable(TimeStampedModel):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    name = models.CharField(max_length=200, verbose_name="Table Name")
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    entry_count = models.IntegerField(default=0, verbose_name="Number of entries")

    class Meta:
        db_table = "manufacturing_reference_table"
        ordering = ["name"]
        verbose_name = "Reference Table"
        verbose_name_plural = "Reference Tables"

    def __str__(self):
        return self.name
