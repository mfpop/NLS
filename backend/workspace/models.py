from django.db import models
from shared.models.base import TimeStampedModel

# Chat models (direct 1:1 messaging)
from workspace.models_chat import ChatThread, ChatParticipant, ChatMessage  # noqa: F401

# Chat models (direct 1:1 messaging)
from workspace.models_chat import ChatThread, ChatParticipant, ChatMessage  # noqa: F401


TASK_STATUS_OPEN = "OPEN"
TASK_STATUS_IN_PROGRESS = "IN_PROGRESS"
TASK_STATUS_WAITING = "WAITING"
TASK_STATUS_COMPLETED = "COMPLETED"
TASK_STATUS_CANCELLED = "CANCELLED"

TASK_STATUS_CHOICES = [
    (TASK_STATUS_OPEN, "Open"),
    (TASK_STATUS_IN_PROGRESS, "In Progress"),
    (TASK_STATUS_WAITING, "Waiting"),
    (TASK_STATUS_COMPLETED, "Completed"),
    (TASK_STATUS_CANCELLED, "Cancelled"),
]

TASK_PRIORITY_LOW = "LOW"
TASK_PRIORITY_MEDIUM = "MEDIUM"
TASK_PRIORITY_HIGH = "HIGH"
TASK_PRIORITY_CRITICAL = "CRITICAL"

TASK_PRIORITY_CHOICES = [
    (TASK_PRIORITY_LOW, "Low"),
    (TASK_PRIORITY_MEDIUM, "Medium"),
    (TASK_PRIORITY_HIGH, "High"),
    (TASK_PRIORITY_CRITICAL, "Critical"),
]


class WorkspaceTask(TimeStampedModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=30, choices=TASK_STATUS_CHOICES, default=TASK_STATUS_OPEN,
    )
    priority = models.CharField(
        max_length=20, choices=TASK_PRIORITY_CHOICES, default=TASK_PRIORITY_MEDIUM,
    )
    assigned_to = models.CharField(max_length=255, blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    source_type = models.CharField(max_length=50, blank=True, default="")
    source_id = models.IntegerField(null=True, blank=True)
    source_title = models.CharField(max_length=255, blank=True, default="")
    source_module = models.CharField(max_length=50, blank=True, default="")
    created_by = models.CharField(max_length=255, blank=True, default="")
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "workspace"
        db_table = "workspace_task"
        ordering = ["-created_at"]
        verbose_name = "Workspace Task"
        verbose_name_plural = "Workspace Tasks"
        indexes = [
            models.Index(fields=["assigned_to"], name="wtask_assigned_idx"),
            models.Index(fields=["status"], name="wtask_status_idx"),
            models.Index(fields=["priority"], name="wtask_priority_idx"),
            models.Index(fields=["due_date"], name="wtask_due_idx"),
            models.Index(fields=["source_type", "source_id"], name="wtask_source_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"
