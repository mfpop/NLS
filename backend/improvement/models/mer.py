from django.db import models
from shared.models.base import TimeStampedModel
from improvement.constants import (
    MER_STATUS_CHOICES,
    MER_STATUS_SUBMITTED,
    MER_TYPE_CHOICES,
    MER_TYPE_ENGINEERING_CHANGE,
    MER_CATEGORY_CHOICES,
    MER_PRIORITY_CHOICES,
    MER_PRIORITY_MEDIUM,
)


class ManufacturingEngineeringRequest(TimeStampedModel):
    """Manufacturing Engineering Request — captures engineering change, tooling,
    process improvement, and equipment modification requests in the PLAN module.
    Follows lean best practices: standardized workflow, visual status tracking,
    and traceability to Kaizen/A3 conversion."""

    # ── Identification ──
    mer_code = models.CharField(max_length=50, blank=True, default="")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    # ── Classification ──
    request_type = models.CharField(
        max_length=50,
        choices=MER_TYPE_CHOICES,
        default=MER_TYPE_ENGINEERING_CHANGE,
    )
    category = models.CharField(
        max_length=50,
        choices=MER_CATEGORY_CHOICES,
        blank=True,
        default="",
    )
    priority = models.CharField(
        max_length=20,
        choices=MER_PRIORITY_CHOICES,
        default=MER_PRIORITY_MEDIUM,
    )

    # ── Target ──
    target_type = models.CharField(max_length=100, blank=True, default="")
    target_id = models.IntegerField(null=True, blank=True)

    # ── People ──
    submitted_by = models.CharField(max_length=255, blank=True, default="")
    owner = models.CharField(max_length=255, blank=True, default="")
    assigned_to = models.CharField(max_length=255, blank=True, default="")
    reviewer = models.CharField(max_length=255, blank=True, default="")

    # ── Status & Workflow ──
    status = models.CharField(
        max_length=30,
        choices=MER_STATUS_CHOICES,
        default=MER_STATUS_SUBMITTED,
    )
    review_notes = models.TextField(blank=True, default="")
    rejection_reason = models.TextField(blank=True, default="")

    # ── Impact Assessment (CQDS — Cost, Quality, Delivery, Safety) ──
    impact_cost = models.TextField(blank=True, default="")
    impact_quality = models.TextField(blank=True, default="")
    impact_delivery = models.TextField(blank=True, default="")
    impact_safety = models.TextField(blank=True, default="")

    # ── Cost ──
    estimated_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    actual_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    # ── Dates ──
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)

    # ── Linkage to Improvement ──
    linked_kaizen = models.ForeignKey(
        "improvement.Kaizen",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_mers",
    )
    linked_a3 = models.ForeignKey(
        "improvement.A3PDCA",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_mers",
    )

    # ── Result ──
    result_summary = models.TextField(blank=True, default="")
    lessons_learned = models.TextField(blank=True, default="")

    class Meta:
        app_label = "improvement"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.mer_code or self.title} ({self.status})"
