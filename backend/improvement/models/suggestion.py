from django.db import models
from shared.models.base import TimeStampedModel
from improvement.constants import (
    SUGGESTION_STATUS_CHOICES,
    SUGGESTION_STATUS_NEW,
    SUGGESTION_PRIORITY_CHOICES,
    SUGGESTION_PRIORITY_MEDIUM,
)


class Suggestion(TimeStampedModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    submitted_by = models.CharField(max_length=255, blank=True, default="")
    target_type = models.CharField(max_length=100, blank=True, default="")
    target_id = models.IntegerField(null=True, blank=True)
    category = models.CharField(max_length=100, blank=True, default="")
    priority = models.CharField(
        max_length=20,
        choices=SUGGESTION_PRIORITY_CHOICES,
        default=SUGGESTION_PRIORITY_MEDIUM,
    )
    status = models.CharField(
        max_length=30,
        choices=SUGGESTION_STATUS_CHOICES,
        default=SUGGESTION_STATUS_NEW,
    )
    decision = models.TextField(blank=True, default="")
    comments = models.TextField(blank=True, default="")

    class Meta:
        app_label = "improvement"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"
