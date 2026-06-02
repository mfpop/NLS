from django.db import models
from shared.models.base import TimeStampedModel
from improvement.constants import (
    KAIZEN_STATUS_CHOICES,
    KAIZEN_STATUS_PLANNED,
    KAIZEN_PRIORITY_CHOICES,
    KAIZEN_PRIORITY_MEDIUM,
    SOURCE_TYPE_CHOICES,
    SOURCE_TYPE_MANUAL,
)


class Kaizen(TimeStampedModel):
    title = models.CharField(max_length=255)
    kaizen_code = models.CharField(max_length=50, blank=True, default="")
    problem_statement = models.TextField(blank=True, default="")
    target_type = models.CharField(max_length=100, blank=True, default="")
    target_id = models.IntegerField(null=True, blank=True)
    current_condition = models.TextField(blank=True, default="")
    target_condition = models.TextField(blank=True, default="")
    owner = models.CharField(max_length=255, blank=True, default="")
    priority = models.CharField(
        max_length=20,
        choices=KAIZEN_PRIORITY_CHOICES,
        default=KAIZEN_PRIORITY_MEDIUM,
    )
    source_type = models.CharField(
        max_length=50,
        choices=SOURCE_TYPE_CHOICES,
        default=SOURCE_TYPE_MANUAL,
    )
    source_suggestion = models.ForeignKey(
        "improvement.Suggestion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kaizens",
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30,
        choices=KAIZEN_STATUS_CHOICES,
        default=KAIZEN_STATUS_PLANNED,
    )
    result_summary = models.TextField(blank=True, default="")

    class Meta:
        app_label = "improvement"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"
