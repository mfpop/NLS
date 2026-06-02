from django.db import models
from shared.models.base import TimeStampedModel
from improvement.constants import (
    A3_STATUS_CHOICES,
    A3_PHASE_DRAFT,
)


class A3PDCA(TimeStampedModel):
    title = models.CharField(max_length=255)
    a3_code = models.CharField(max_length=50, blank=True, default="")
    source_type = models.CharField(max_length=50, blank=True, default="")
    source_kaizen = models.ForeignKey(
        "improvement.Kaizen",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="a3_pdca_records",
    )
    target_type = models.CharField(max_length=100, blank=True, default="")
    target_id = models.IntegerField(null=True, blank=True)
    owner = models.CharField(max_length=255, blank=True, default="")
    priority = models.CharField(max_length=20, blank=True, default="MEDIUM")

    # PLAN phase
    background = models.TextField(blank=True, default="")
    problem_statement = models.TextField(blank=True, default="")
    current_condition = models.TextField(blank=True, default="")
    target_condition = models.TextField(blank=True, default="")
    root_cause_analysis = models.TextField(blank=True, default="")
    countermeasures = models.TextField(blank=True, default="")
    implementation_plan = models.TextField(blank=True, default="")

    # DO phase
    do_notes = models.TextField(blank=True, default="")
    blockers = models.TextField(blank=True, default="")

    # CHECK phase
    result_validation = models.TextField(blank=True, default="")
    before_after_comparison = models.TextField(blank=True, default="")
    effectiveness_check = models.TextField(blank=True, default="")

    # ACT phase
    standardization_actions = models.TextField(blank=True, default="")
    lessons_learned = models.TextField(blank=True, default="")
    follow_up_plan = models.TextField(blank=True, default="")

    result_summary = models.TextField(blank=True, default="")

    status = models.CharField(
        max_length=30,
        choices=A3_STATUS_CHOICES,
        default=A3_PHASE_DRAFT,
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)

    class Meta:
        app_label = "improvement"
        ordering = ["-created_at"]
        verbose_name = "A3/PDCA"
        verbose_name_plural = "A3/PDCA Records"

    def __str__(self):
        return f"{self.title} ({self.status})"
