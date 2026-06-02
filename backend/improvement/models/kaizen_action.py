from django.db import models
from shared.models.base import TimeStampedModel
from improvement.constants import (
    KAIZEN_ACTION_STATUS_CHOICES,
    KAIZEN_ACTION_STATUS_OPEN,
)


class KaizenAction(TimeStampedModel):
    kaizen = models.ForeignKey(
        "improvement.Kaizen",
        on_delete=models.CASCADE,
        related_name="actions",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    owner = models.CharField(max_length=255, blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30,
        choices=KAIZEN_ACTION_STATUS_CHOICES,
        default=KAIZEN_ACTION_STATUS_OPEN,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "improvement"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"
