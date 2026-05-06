from django.db import models
from shared.models.base import TimeStampedModel


class Department(TimeStampedModel):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    code = models.CharField(max_length=20, unique=True, verbose_name="Department Code")
    name = models.CharField(max_length=200, verbose_name="Department Name")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    manager = models.CharField(max_length=200, blank=True, default="")
    employees = models.IntegerField(default=0)

    group_count = models.IntegerField(default=0)
    resource_count = models.IntegerField(default=0)

    class Meta:
        db_table = "manufacturing_department"
        ordering = ["name"]
        verbose_name = "Department"
        verbose_name_plural = "Departments"

    def __str__(self):
        return f"{self.name} ({self.code})"
