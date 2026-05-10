from django.db import models
from .entity_status import EntityStatus


class Schedule(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_schedule"
        ordering = ["name"]
        verbose_name = "Schedule"
        verbose_name_plural = "Schedules"

    def __str__(self):
        return self.name


class Shift(models.Model):
    schedule = models.ForeignKey(
        Schedule, on_delete=models.CASCADE, related_name="shifts",
    )
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_shift"
        ordering = ["schedule", "start_time"]
        verbose_name = "Shift"
        verbose_name_plural = "Shifts"

    def __str__(self):
        return f"{self.schedule.name} / {self.name}"


class ScheduleAssignment(models.Model):
    ENTITY_TYPE_CHOICES = [
        ("RESOURCE", "Resource"),
        ("RESOURCE_GROUP", "Resource Group"),
        ("DEPARTMENT", "Department"),
        ("PRODUCTION_LINE", "Production Line"),
        ("PLANT", "Plant"),
        ("COMPANY", "Company"),
    ]
    INHERITANCE_CHOICES = [
        ("NONE", "None"),
        ("PARENT", "Inherit from parent"),
        ("CHILDREN", "Apply to children"),
        ("BOTH", "Both directions"),
    ]

    entity_type = models.CharField(max_length=30, choices=ENTITY_TYPE_CHOICES)
    entity_id = models.CharField(max_length=50)
    schedule = models.ForeignKey(
        Schedule, on_delete=models.CASCADE, related_name="assignments",
    )
    inheritance_mode = models.CharField(
        max_length=20, choices=INHERITANCE_CHOICES, default="NONE",
    )
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_schedule_assignment"
        ordering = ["entity_type", "entity_id"]
        verbose_name = "Schedule Assignment"
        verbose_name_plural = "Schedule Assignments"
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"{self.entity_type}:{self.entity_id} → {self.schedule.name}"
