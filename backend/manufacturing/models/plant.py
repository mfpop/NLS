from django.db import models
from shared.models.base import TimeStampedModel


class Plant(TimeStampedModel):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    code = models.CharField(max_length=20, unique=True, verbose_name="Plant Code")
    name = models.CharField(max_length=200, verbose_name="Plant Name")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    building = models.CharField(max_length=200, blank=True, default="")
    address = models.CharField(max_length=500, blank=True, default="")
    timezone = models.CharField(max_length=100, blank=True, default="")
    default_calendar_id = models.CharField(max_length=50, blank=True, null=True)
    default_schedule_id = models.CharField(max_length=50, blank=True, null=True)
    manager_name = models.CharField(max_length=200, blank=True, default="")
    manager_email = models.EmailField(max_length=200, blank=True, default="")
    description = models.TextField(blank=True, default="")

    line_count = models.IntegerField(default=0)
    department_count = models.IntegerField(default=0)
    group_count = models.IntegerField(default=0)
    resource_count = models.IntegerField(default=0)

    class Meta:
        db_table = "manufacturing_plant"
        ordering = ["name"]
        verbose_name = "Plant"
        verbose_name_plural = "Plants"

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def is_active(self):
        return self.status == "active"
