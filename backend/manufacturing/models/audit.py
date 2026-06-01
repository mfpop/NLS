from django.db import models
from shared.models.base import TimeStampedModel


class AuditType(models.TextChoices):
    FIVE_S = "FIVE_S", "5S"
    SAFETY = "SAFETY", "Safety"
    QUALITY = "QUALITY", "Quality"
    PROCESS_CHECK = "PROCESS_CHECK", "Process Check"
    STANDARD_WORK_CHECK = "STANDARD_WORK_CHECK", "Standard Work Check"


class AuditTargetType(models.TextChoices):
    PLANT = "PLANT", "Plant"
    PRODUCTION_LINE = "PRODUCTION_LINE", "Production Line"
    DEPARTMENT = "DEPARTMENT", "Department"
    RESOURCE_GROUP = "RESOURCE_GROUP", "Resource Group"
    RESOURCE = "RESOURCE", "Resource"


class AuditStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    OPEN = "OPEN", "Open"
    COMPLETED = "COMPLETED", "Completed"
    ARCHIVED = "ARCHIVED", "Archived"


class ChecklistResult(models.TextChoices):
    PASS = "PASS", "Pass"
    FAIL = "FAIL", "Fail"
    N_A = "N_A", "N/A"


class Severity(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"


class FindingStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"


FORBIDDEN_TARGET_TYPES = {
    "DOCUMENT",
    "STRUCTURE_DOCUMENT",
    "WORK_INSTRUCTION",
    "STANDARD_WORK",
    "PROCEDURE",
    "MATERIAL_FLOW_STANDARD",
    "MATERIAL_BIN",
    "WAREHOUSE",
    "ROUTING",
    "ROUTING_STEP",
}

ALLOWED_AUDIT_TARGET_TYPES = {t.value for t in AuditTargetType}


class Audit(TimeStampedModel):
    audit_type = models.CharField(max_length=50, choices=AuditType.choices)
    target_type = models.CharField(max_length=50, choices=AuditTargetType.choices)
    target_id = models.IntegerField()
    title = models.CharField(max_length=500)
    auditor = models.CharField(max_length=200, blank=True, default="")
    audit_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=AuditStatus.choices, default=AuditStatus.DRAFT
    )
    score = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_audit"
        verbose_name = "Audit"
        verbose_name_plural = "Audits"
        indexes = [
            models.Index(fields=["audit_type", "status"], name="mfg_audit_type_status_idx"),
            models.Index(fields=["target_type", "target_id"], name="mfg_audit_target_idx"),
            models.Index(fields=["audit_date"], name="mfg_audit_date_idx"),
            models.Index(fields=["auditor"], name="mfg_audit_auditor_idx"),
        ]

    def __str__(self):
        return f"[{self.audit_type}] {self.title} ({self.status})"


class AuditChecklistItem(TimeStampedModel):
    audit = models.ForeignKey(
        Audit, on_delete=models.CASCADE, related_name="checklist_items"
    )
    question = models.CharField(max_length=1000)
    result = models.CharField(
        max_length=10, choices=ChecklistResult.choices, null=True, blank=True
    )
    comment = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_audit_checklist_item"
        verbose_name = "Audit Checklist Item"
        verbose_name_plural = "Audit Checklist Items"
        indexes = [
            models.Index(fields=["audit", "result"], name="mfg_aci_audit_result_idx"),
        ]

    def __str__(self):
        return f"{self.question[:60]} — {self.result or 'PENDING'}"


class AuditFinding(TimeStampedModel):
    audit = models.ForeignKey(
        Audit, on_delete=models.CASCADE, related_name="findings"
    )
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=Severity.choices)
    status = models.CharField(
        max_length=10, choices=FindingStatus.choices, default=FindingStatus.OPEN
    )
    owner = models.CharField(max_length=200, blank=True, default="")
    due_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "manufacturing_audit_finding"
        verbose_name = "Audit Finding"
        verbose_name_plural = "Audit Findings"
        indexes = [
            models.Index(fields=["audit", "status"], name="mfg_af_audit_status_idx"),
            models.Index(fields=["severity"], name="mfg_af_severity_idx"),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.description[:60]} ({self.status})"
