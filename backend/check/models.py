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
    EVENT_TYPE_CHOICES,
    EVENT_STATUS_CHOICES,
    EVENT_STATUS_DRAFT,
    INCIDENT_TYPE_CHOICES,
    INCIDENT_STATUS_CHOICES,
    INCIDENT_STATUS_OPEN,
    MATERIAL_ISSUE_TYPE_CHOICES,
    MATERIAL_ISSUE_STATUS_CHOICES,
    MATERIAL_ISSUE_STATUS_OPEN,
    CLAIM_TYPE_CHOICES,
    CLAIM_STATUS_CHOICES,
    CLAIM_STATUS_DRAFT,
    CARE_TYPE_CHOICES,
    MEDICAL_STATUS_CHOICES,
    MEDICAL_STATUS_DRAFT,
    ENV_REPORT_TYPE_CHOICES,
    ENV_REPORT_STATUS_CHOICES,
    ENV_REPORT_STATUS_DRAFT,
    CAPA_STATUS_CHOICES,
    CAPA_STATUS_DRAFT,
    CAPA_SOURCE_TYPES,
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
    owner = models.CharField(max_length=255, blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    closed_at = models.DateTimeField(null=True, blank=True)
    # Source location fields for target resolution
    plant = models.CharField(max_length=100, blank=True, default="")
    production_line = models.CharField(max_length=100, blank=True, default="")
    department = models.CharField(max_length=100, blank=True, default="")
    resource_group = models.CharField(max_length=100, blank=True, default="")
    resource = models.CharField(max_length=100, blank=True, default="")
    # Resolution fields
    containment_notes = models.TextField(blank=True, default="")
    root_cause = models.TextField(blank=True, default="")
    resolution_notes = models.TextField(blank=True, default="")

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
    action_type = models.CharField(max_length=50, blank=True, default="CORRECTIVE")
    source_type = models.CharField(max_length=50, blank=True, default="")
    source_id = models.IntegerField(null=True, blank=True)
    linked_issue = models.ForeignKey(
        "Problem", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="actions",
    )
    owner = models.CharField(max_length=255, blank=True, default="")
    assigned_to = models.CharField(max_length=255, blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30, choices=ACTION_STATUS_CHOICES, default=ACTION_STATUS_OPEN,
    )
    priority = models.CharField(
        max_length=20, choices=ACTION_PRIORITY_CHOICES, default=ACTION_PRIORITY_MEDIUM,
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.CharField(max_length=255, blank=True, default="")
    completion_notes = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    # Target fields
    target_type = models.CharField(max_length=100, blank=True, default="")
    target_id = models.IntegerField(null=True, blank=True)
    plant = models.CharField(max_length=100, blank=True, default="")
    production_line = models.CharField(max_length=100, blank=True, default="")
    department = models.CharField(max_length=100, blank=True, default="")
    resource_group = models.CharField(max_length=100, blank=True, default="")
    resource = models.CharField(max_length=100, blank=True, default="")

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


class SafetyEvent(TimeStampedModel):
    event_type = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default=SEVERITY_MEDIUM)
    status = models.CharField(
        max_length=30, choices=EVENT_STATUS_CHOICES, default=EVENT_STATUS_DRAFT,
    )
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    reported_by = models.CharField(max_length=255, blank=True, default="")
    reported_at = models.DateTimeField(auto_now_add=True)
    occurred_at = models.DateTimeField(null=True, blank=True)
    location_text = models.CharField(max_length=500, blank=True, default="")
    immediate_action = models.TextField(blank=True, default="")
    injury_involved = models.BooleanField(default=False)
    property_damage = models.BooleanField(default=False)
    environmental_impact = models.BooleanField(default=False)
    owner = models.CharField(max_length=255, blank=True, default="")
    closed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        ordering = ["-created_at"]
        verbose_name = "Safety Event"
        verbose_name_plural = "Safety Events"
        indexes = [
            models.Index(fields=["event_type"], name="safety_evt_type_idx"),
            models.Index(fields=["status"], name="safety_evt_status_idx"),
            models.Index(fields=["severity"], name="safety_evt_severity_idx"),
            models.Index(fields=["target_type", "target_id"], name="safety_evt_target_idx"),
            models.Index(fields=["occurred_at"], name="safety_evt_occurred_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.event_type}) [{self.status}]"


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


class SafetyInjuryClaim(TimeStampedModel):
    safety_event = models.ForeignKey(
        "SafetyEvent", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="injury_claims",
    )
    claim_number = models.CharField(max_length=100, blank=True, default="")
    claimant_name = models.CharField(max_length=255)
    claimant_employee_id = models.CharField(max_length=100, blank=True, default="")
    claim_type = models.CharField(max_length=50, choices=CLAIM_TYPE_CHOICES)
    status = models.CharField(
        max_length=30, choices=CLAIM_STATUS_CHOICES, default=CLAIM_STATUS_DRAFT,
    )
    injury_summary = models.TextField(blank=True, default="")
    body_area = models.CharField(max_length=200, blank=True, default="")
    lost_time = models.BooleanField(default=False)
    restricted_work = models.BooleanField(default=False)
    reported_to_insurer = models.BooleanField(default=False)
    insurer_reference = models.CharField(max_length=200, blank=True, default="")
    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    owner = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        db_table = "check_safety_injury_claim"
        ordering = ["-created_at"]
        verbose_name = "Safety Injury Claim"
        verbose_name_plural = "Safety Injury Claims"
        indexes = [
            models.Index(fields=["status"], name="sic_status_idx"),
            models.Index(fields=["owner"], name="sic_owner_idx"),
            models.Index(fields=["safety_event"], name="sic_event_idx"),
            models.Index(fields=["claim_type"], name="sic_type_idx"),
        ]

    def __str__(self):
        return f"Claim: {self.claimant_name} ({self.status})"


class SafetyMedicalCase(TimeStampedModel):
    safety_event = models.ForeignKey(
        "SafetyEvent", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="medical_cases",
    )
    injury_claim = models.ForeignKey(
        "SafetyInjuryClaim", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="medical_cases",
    )
    affected_person = models.ForeignKey(
        "administration.UserProfile", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="medical_cases",
    )
    case_number = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(
        max_length=30, choices=MEDICAL_STATUS_CHOICES, default=MEDICAL_STATUS_DRAFT,
    )
    care_type = models.CharField(max_length=50, choices=CARE_TYPE_CHOICES)
    visit_required = models.BooleanField(default=False)
    visit_date = models.DateTimeField(null=True, blank=True)
    work_restriction = models.BooleanField(default=False)
    restriction_summary = models.TextField(blank=True, default="")
    return_to_work_date = models.DateTimeField(null=True, blank=True)
    confidential_notes = models.TextField(blank=True, default="")
    owner = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        db_table = "check_safety_medical_case"
        ordering = ["-created_at"]
        verbose_name = "Safety Medical Case"
        verbose_name_plural = "Safety Medical Cases"
        indexes = [
            models.Index(fields=["status"], name="smc_status_idx"),
            models.Index(fields=["owner"], name="smc_owner_idx"),
            models.Index(fields=["safety_event"], name="smc_event_idx"),
            models.Index(fields=["injury_claim"], name="smc_claim_idx"),
            models.Index(fields=["care_type"], name="smc_care_type_idx"),
            models.Index(fields=["affected_person"], name="smc_person_idx"),
        ]

    def __str__(self):
        return f"Medical: {self.care_type} ({self.status})"


class SafetyEnvironmentalReport(TimeStampedModel):
    safety_event = models.ForeignKey(
        "SafetyEvent", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="environmental_reports",
    )
    report_type = models.CharField(max_length=50, choices=ENV_REPORT_TYPE_CHOICES)
    status = models.CharField(
        max_length=30, choices=ENV_REPORT_STATUS_CHOICES, default=ENV_REPORT_STATUS_DRAFT,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    material_involved = models.CharField(max_length=255, blank=True, default="")
    estimated_quantity = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    unit = models.CharField(max_length=50, blank=True, default="")
    containment_action = models.TextField(blank=True, default="")
    cleanup_required = models.BooleanField(default=False)
    reported_externally = models.BooleanField(default=False)
    external_reference = models.CharField(max_length=200, blank=True, default="")
    occurred_at = models.DateTimeField(null=True, blank=True)
    reported_at = models.DateTimeField(auto_now_add=True)
    target_type = models.CharField(max_length=100, blank=True, default="")
    target_id = models.IntegerField(null=True, blank=True)
    location_text = models.CharField(max_length=500, blank=True, default="")
    owner = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        db_table = "check_safety_env_report"
        ordering = ["-created_at"]
        verbose_name = "Safety Environmental Report"
        verbose_name_plural = "Safety Environmental Reports"
        indexes = [
            models.Index(fields=["status"], name="ser_status_idx"),
            models.Index(fields=["owner"], name="ser_owner_idx"),
            models.Index(fields=["safety_event"], name="ser_event_idx"),
            models.Index(fields=["report_type"], name="ser_type_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"


class SafetyCAPA(TimeStampedModel):
    source_type = models.CharField(max_length=50)
    source_id = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    problem_statement = models.TextField(blank=True, default="")
    root_cause = models.TextField(blank=True, default="")
    containment_action = models.TextField(blank=True, default="")
    corrective_action = models.TextField(blank=True, default="")
    preventive_action = models.TextField(blank=True, default="")
    owner = models.CharField(max_length=255, blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    effectiveness_check_required = models.BooleanField(default=False)
    effectiveness_result = models.CharField(max_length=20, null=True, blank=True)
    status = models.CharField(
        max_length=30, choices=CAPA_STATUS_CHOICES, default=CAPA_STATUS_DRAFT,
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "check"
        db_table = "check_safety_capa"
        ordering = ["-created_at"]
        verbose_name = "Safety CAPA"
        verbose_name_plural = "Safety CAPAs"
        indexes = [
            models.Index(fields=["status"], name="capa_status_idx"),
            models.Index(fields=["owner"], name="capa_owner_idx"),
            models.Index(fields=["due_date"], name="capa_due_idx"),
            models.Index(fields=["source_type", "source_id"], name="capa_source_idx"),
        ]

    def __str__(self):
        return f"CAPA: {self.title} ({self.status})"
