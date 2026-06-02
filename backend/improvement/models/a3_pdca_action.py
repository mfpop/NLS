from django.db import models
from shared.models.base import TimeStampedModel
from improvement.constants import (
    A3_ACTION_STATUS_CHOICES,
    A3_ACTION_STATUS_OPEN,
)


class A3PDCAAction(TimeStampedModel):
    a3_pdca = models.ForeignKey(
        "improvement.A3PDCA",
        on_delete=models.CASCADE,
        related_name="actions",
    )
    phase = models.CharField(max_length=20, blank=True, default="")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    owner = models.CharField(max_length=255, blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30,
        choices=A3_ACTION_STATUS_CHOICES,
        default=A3_ACTION_STATUS_OPEN,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "improvement"
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.phase}] {self.title} ({self.status})"
