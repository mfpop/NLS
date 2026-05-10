from django.db import models
from django.db.models import Count
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class Plant(TimeStampedModel):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    building = models.CharField(max_length=200, blank=True, default="")
    address = models.CharField(max_length=500, blank=True, default="")
    timezone = models.CharField(max_length=100, blank=True, default="")
    manager_name = models.CharField(max_length=200, blank=True, default="")
    manager_email = models.EmailField(max_length=200, blank=True, default="")

    class Meta:
        db_table = "manufacturing_plant"
        ordering = ["name"]
        verbose_name = "Plant"
        verbose_name_plural = "Plants"

    def __str__(self):
        return f"{self.name} ({self.code})"
