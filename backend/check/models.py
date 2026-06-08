from django.db import models
from shared.models.base import TimeStampedModel
from check.constants import (
    CONTROL_AREA_CHOICES,
    CONTROL_AREA_PRODUCTION,
    PROBLEM_TYPE_CHOICES,
    PROBLEM_STATUS_CHOICES,
    PROBLEM_STATUS_OPEN,
    ACTION_STATUS_CHOICES,
    ACTION_STATUS_OPEN,
    ACTION_PRIORITY_CHOICES,
    ACTION_PRIORITY_MEDIUM,
    PRODUCTION_CHECK_TYPE_CHOICES,
    QUALITY_CHECK_TYPE_CHOICES,
    SAFETY_CHECK_TYPE_CHOICES,
    MATERIAL_CHECK_TYPE_CHOICES,
    CHECK_STATUS_CHOICES,
    CHECK_STATUS_DRAFT,
    CHECKLIST_RESULT_CHOICES,
    DMR_STATUS_CHOICES,
    DMR_STATUS_OPEN,
    DMR_STATUS_QUARANTINED,
    DMR_STATUS_DISPOSITION_PENDING,
    DMR_STATUS_DISPOSITION_APPROVED,
    DMR_DISPOSITION_CHOICES,
    SEVERITY_CHOICES,
    SEVERITY_MEDIUM,
    RMA_STATUS_CHOICES,
    RMA_STATUS_OPEN,
    RMA_DISPOSITION_CHOICES,
    RMA_DISPOSITION_SCRAP,
    RMA_CUSTOMER_RESPONSE_CHOICES,
    RMA_CUSTOMER_RESPONSE_NOT_REQUIRED,
    INCIDENT_TYPE_CHOICES,
    INCIDENT_STATUS_CHOICES,
    INCIDENT_STATUS_OPEN,
    MATERIAL_ISSUE_TYPE_CHOICES,
    MATERIAL_ISSUE_STATUS_CHOICES,
    MATERIAL_ISSUE_STATUS_OPEN,
    SEVERITY_CHOICES,
    SEVERITY_MEDIUM,
)


class Problem(TimeStampedModel):
    control_area = models.CharField(
        max_length=30, choices=CONTROL_AREA_CHOICES, default=CONTROL_AREA_PRODUCTION,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    problem_type = models.CharField(max_length=50, choices=PROBLEM_TYPE_CHOICES)
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default=SEVERITY_MEDIUM)
    status = models.CharField(
        max_length=30, choices=PROBLEM_STATUS_CHOICES, default=PROBLEM_STATUS_OPEN,
    )
    reported_by = models.CharField(max_length=255, blank=True, default="")
    reported_at = models.DateTimeField(auto_now_add=True)
    source_type = models.CharField(max_length=50, blank=True, default="")
    source_id = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class Action(TimeStampedModel):
    control_area = models.CharField(
        max_length=30, choices=CONTROL_AREA_CHOICES, default=CONTROL_AREA_PRODUCTION,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    source_type = models.CharField(max_length=50, blank=True, default="")
    source_id = models.IntegerField(null=True, blank=True)
    owner = models.CharField(max_length=255, blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30, choices=ACTION_STATUS_CHOICES, default=ACTION_STATUS_OPEN,
    )
    priority = models.CharField(
        max_length=20, choices=ACTION_PRIORITY_CHOICES, default=ACTION_PRIORITY_MEDIUM,
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class ProductionCheck(TimeStampedModel):
    check_type = models.CharField(max_length=50, choices=PRODUCTION_CHECK_TYPE_CHOICES)
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    checked_by = models.CharField(max_length=255, blank=True, default="")
    check_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30, choices=CHECK_STATUS_CHOICES, default=CHECK_STATUS_DRAFT,
    )
    score = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class ProductionChecklistItem(TimeStampedModel):
    production_check = models.ForeignKey(
        ProductionCheck, on_delete=models.CASCADE, related_name="checklist_items",
    )
    question = models.CharField(max_length=500)
    result = models.CharField(max_length=20, null=True, blank=True, choices=CHECKLIST_RESULT_CHOICES)
    comment = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["id"]

    def __str__(self):
        return f"Item {self.id} for ProductionCheck {self.production_check_id}"


class QualityCheck(TimeStampedModel):
    check_type = models.CharField(max_length=50, choices=QUALITY_CHECK_TYPE_CHOICES)
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    checked_by = models.CharField(max_length=255, blank=True, default="")
    check_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30, choices=CHECK_STATUS_CHOICES, default=CHECK_STATUS_DRAFT,
    )
    score = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class QualityChecklistItem(TimeStampedModel):
    quality_check = models.ForeignKey(
        QualityCheck, on_delete=models.CASCADE, related_name="checklist_items",
    )
    question = models.CharField(max_length=500)
    result = models.CharField(max_length=20, null=True, blank=True, choices=CHECKLIST_RESULT_CHOICES)
    comment = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["id"]

    def __str__(self):
        return f"Item {self.id} for QualityCheck {self.quality_check_id}"


class DMR(TimeStampedModel):
    dmr_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    material_item = models.ForeignKey(
        "manufacturing.Material", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="dmrs",
    )
    product_variant = models.ForeignKey(
        "manufacturing.ProductVariant", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="dmrs",
    )
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    uom = models.CharField(max_length=50, blank=True, default="")
    defect_description = models.TextField(blank=True, default="")
    containment = models.TextField(blank=True, default="")
    severity = models.CharField(
        max_length=20, choices=SEVERITY_CHOICES, default=SEVERITY_MEDIUM,
    )
    disposition = models.CharField(
        max_length=30, null=True, blank=True, choices=DMR_DISPOSITION_CHOICES,
    )
    status = models.CharField(
        max_length=30, choices=DMR_STATUS_CHOICES, default=DMR_STATUS_OPEN,
    )
    owner = models.CharField(max_length=255, blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.dmr_number} ({self.status})"


class RMA(TimeStampedModel):
    rma_number = models.CharField(max_length=50, unique=True)
    customer_name = models.CharField(max_length=255)
    part_number = models.CharField(max_length=100, blank=True, default="")
    serial_lot = models.CharField(max_length=100, blank=True, default="")
    product_variant = models.ForeignKey(
        "manufacturing.ProductVariant", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="rmas",
    )
    material_item = models.ForeignKey(
        "manufacturing.Material", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="rmas",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    reason = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=30, choices=RMA_STATUS_CHOICES, default=RMA_STATUS_OPEN,
    )
    received_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    disposition = models.CharField(
        max_length=30, null=True, blank=True, choices=RMA_DISPOSITION_CHOICES,
    )
    customer_response_status = models.CharField(
        max_length=30, choices=RMA_CUSTOMER_RESPONSE_CHOICES,
        default=RMA_CUSTOMER_RESPONSE_NOT_REQUIRED,
    )
    receiving_inspection_result = models.TextField(blank=True, default="")
    confirmed_defect = models.TextField(blank=True, default="")
    suspected_cause = models.TextField(blank=True, default="")
    confirmed_cause = models.TextField(blank=True, default="")
    disposition_owner = models.CharField(max_length=255, blank=True, default="")
    disposition_date = models.DateField(null=True, blank=True)
    customer_response = models.TextField(blank=True, default="")
    owner = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.rma_number} ({self.status})"


class SafetyCheck(TimeStampedModel):
    check_type = models.CharField(max_length=50, choices=SAFETY_CHECK_TYPE_CHOICES)
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    checked_by = models.CharField(max_length=255, blank=True, default="")
    check_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30, choices=CHECK_STATUS_CHOICES, default=CHECK_STATUS_DRAFT,
    )
    score = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class SafetyChecklistItem(TimeStampedModel):
    safety_check = models.ForeignKey(
        SafetyCheck, on_delete=models.CASCADE, related_name="checklist_items",
    )
    question = models.CharField(max_length=500)
    result = models.CharField(max_length=20, null=True, blank=True, choices=CHECKLIST_RESULT_CHOICES)
    comment = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["id"]

    def __str__(self):
        return f"Item {self.id} for SafetyCheck {self.safety_check_id}"


class SafetyIncident(TimeStampedModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    incident_type = models.CharField(max_length=50, choices=INCIDENT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default=SEVERITY_MEDIUM)
    status = models.CharField(
        max_length=30, choices=INCIDENT_STATUS_CHOICES, default=INCIDENT_STATUS_OPEN,
    )
    reported_by = models.CharField(max_length=255, blank=True, default="")
    owner = models.CharField(max_length=255, blank=True, default="")
    containment_action = models.TextField(blank=True, default="")
    closed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class MaterialCheck(TimeStampedModel):
    check_type = models.CharField(max_length=50, choices=MATERIAL_CHECK_TYPE_CHOICES)
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    checked_by = models.CharField(max_length=255, blank=True, default="")
    check_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30, choices=CHECK_STATUS_CHOICES, default=CHECK_STATUS_DRAFT,
    )
    score = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class MaterialChecklistItem(TimeStampedModel):
    material_check = models.ForeignKey(
        MaterialCheck, on_delete=models.CASCADE, related_name="checklist_items",
    )
    question = models.CharField(max_length=500)
    result = models.CharField(max_length=20, null=True, blank=True, choices=CHECKLIST_RESULT_CHOICES)
    comment = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["id"]

    def __str__(self):
        return f"Item {self.id} for MaterialCheck {self.material_check_id}"


class MaterialIssue(TimeStampedModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    issue_type = models.CharField(max_length=50, choices=MATERIAL_ISSUE_TYPE_CHOICES)
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    material_item = models.ForeignKey(
        "manufacturing.Material", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="material_issues",
    )
    material_bin = models.ForeignKey(
        "manufacturing.MaterialBin", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="material_issues",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    uom = models.CharField(max_length=50, blank=True, default="")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default=SEVERITY_MEDIUM)
    status = models.CharField(
        max_length=30, choices=MATERIAL_ISSUE_STATUS_CHOICES, default=MATERIAL_ISSUE_STATUS_OPEN,
    )
    reported_by = models.CharField(max_length=255, blank=True, default="")
    owner = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"
