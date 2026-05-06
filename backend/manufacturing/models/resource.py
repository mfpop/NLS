from django.db import models
from shared.models.base import TimeStampedModel


class Resource(TimeStampedModel):
    TYPE_CHOICES = [
        ("Machine", "Machine"),
        ("Workstation", "Workstation"),
        ("Inspection Station", "Inspection Station"),
        ("Material Handling", "Material Handling"),
        ("Tool", "Tool"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]
    OP_STATUS_CHOICES = [
        ("Running", "Running"),
        ("Idle", "Idle"),
        ("Down", "Down"),
        ("Maintenance", "Maintenance"),
    ]

    name = models.CharField(max_length=200, verbose_name="Resource Name")
    code = models.CharField(max_length=50, unique=True, verbose_name="Resource Code")
    resource_type = models.CharField(
        max_length=50, choices=TYPE_CHOICES, default="Machine", verbose_name="Type"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    op_status = models.CharField(
        max_length=50, choices=OP_STATUS_CHOICES, default="Idle", verbose_name="Operational Status"
    )
    utilization = models.FloatField(default=0.0)
    shift = models.CharField(max_length=100, blank=True, default="")
    last_activity = models.CharField(max_length=100, blank=True, default="")
    flow_position = models.CharField(max_length=100, blank=True, default="")

    resource_group = models.ForeignKey(
        "manufacturing.ResourceGroup",
        on_delete=models.CASCADE,
        related_name="resources",
    )
    class Meta:
        db_table = "manufacturing_resource"
        ordering = ["name"]
        verbose_name = "Resource"
        verbose_name_plural = "Resources"

    def __str__(self):
        return f"{self.name} ({self.code})"

