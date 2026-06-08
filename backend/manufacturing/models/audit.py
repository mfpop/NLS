from django.db import models
from shared.models.base import TimeStampedModel


class AuditType(models.TextChoices):
    FIVE_S = "FIVE_S", "5S"
    SAFETY = "SAFETY", "Safety"
    QUALITY = "QUALITY", "Quality"
    PROCESS_CHECK = "PROCESS_CHECK", "Process Check"
    STANDARD_WORK_CHECK = "STANDARD_WORK_CHECK", "Standard Work Check"
    TPM_EQUIPMENT_CHECK = "TPM_EQUIPMENT_CHECK", "TPM / Equipment Check"
    KANBAN_PULL_CHECK = "KANBAN_PULL_CHECK", "Kanban / Pull System Check"
    QC_PRODUCT_CHECK = "QC_PRODUCT_CHECK", "Product Quality Check"
    QC_PROCESS_AUDIT = "QC_PROCESS_AUDIT", "Process Quality Audit"
    QC_FIRST_PIECE = "QC_FIRST_PIECE", "First Piece Check"
    QC_FINAL_INSPECTION = "QC_FINAL_INSPECTION", "Final Inspection Audit"
    QC_DMR_REVIEW = "QC_DMR_REVIEW", "DMR Review Check"
    QC_RMA_REVIEW = "QC_RMA_REVIEW", "RMA Review Check"


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


class TemplateStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    ARCHIVED = "ARCHIVED", "Archived"


class ModuleScope(models.TextChoices):
    PRODUCTION_CONTROL = "PRODUCTION_CONTROL", "Production Control"
    QUALITY_CONTROL = "QUALITY_CONTROL", "Quality Control"
    SAFETY_CONTROL = "SAFETY_CONTROL", "Safety Control"
    MATERIAL_CONTROL = "MATERIAL_CONTROL", "Material Control"


class ResponseType(models.TextChoices):
    PASS_FAIL_NA = "PASS_FAIL_NA", "Pass / Fail / N/A"
    YES_NO_NA = "YES_NO_NA", "Yes / No / N/A"
    SCORE_1_5 = "SCORE_1_5", "Score 1-5"
    TEXT = "TEXT", "Text"
    NUMBER = "NUMBER", "Number"


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


class ControlArea(models.TextChoices):
    PRODUCTION = "PRODUCTION", "Production"
    QUALITY = "QUALITY", "Quality"
    SAFETY = "SAFETY", "Safety"
    MATERIAL = "MATERIAL", "Material"


class Audit(TimeStampedModel):
    template = models.ForeignKey(
        "AuditTemplate", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="audits",
    )
    control_area = models.CharField(
        max_length=30, choices=ControlArea.choices, default=ControlArea.PRODUCTION,
    )
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
            models.Index(fields=["template"], name="mfg_audit_template_idx"),
        ]

    def __str__(self):
        return f"[{self.audit_type}] {self.title} ({self.status})"


class AuditTemplate(TimeStampedModel):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    audit_type = models.CharField(max_length=50, choices=AuditType.choices)
    module_scope = models.CharField(
        max_length=30, choices=ModuleScope.choices,
        default=ModuleScope.PRODUCTION_CONTROL,
    )
    target_types = models.JSONField(default=list, blank=True)
    version = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20, choices=TemplateStatus.choices,
        default=TemplateStatus.DRAFT,
    )
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = "manufacturing_audit_template"
        verbose_name = "Audit Template"
        verbose_name_plural = "Audit Templates"

    def __str__(self):
        return f"[{self.code}] {self.name} v{self.version} ({self.status})"


class AuditTemplateCategory(TimeStampedModel):
    template = models.ForeignKey(
        AuditTemplate, on_delete=models.CASCADE, related_name="categories"
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    sequence = models.IntegerField(default=0)
    is_required = models.BooleanField(default=True)

    class Meta:
        db_table = "manufacturing_audit_template_category"
        verbose_name = "Audit Template Section"
        verbose_name_plural = "Audit Template Sections"
        ordering = ["template", "sequence"]
        unique_together = [("template", "code")]

    def __str__(self):
        return f"{self.code} — {self.name}"


class AuditTemplateQuestion(TimeStampedModel):
    category = models.ForeignKey(
        AuditTemplateCategory, on_delete=models.CASCADE, related_name="questions"
    )
    code = models.CharField(max_length=50)
    question = models.CharField(max_length=1000)
    response_type = models.CharField(
        max_length=20, choices=ResponseType.choices,
        default=ResponseType.SCORE_1_5,
    )
    is_required = models.BooleanField(default=True)
    weight = models.IntegerField(default=1)
    sequence = models.IntegerField(default=0)
    help_text = models.CharField(max_length=500, blank=True, default="")
    # Legacy fields for backward compatibility
    max_score = models.IntegerField(default=5)
    allow_na = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "manufacturing_audit_template_question"
        verbose_name = "Audit Template Question"
        verbose_name_plural = "Audit Template Questions"
        ordering = ["category", "sequence"]
        unique_together = [("category", "code")]

    def __str__(self):
        return f"Q{self.sequence} — {self.question[:60]}"


class AuditChecklistItem(TimeStampedModel):
    audit = models.ForeignKey(
        Audit, on_delete=models.CASCADE, related_name="checklist_items"
    )
    template_question = models.ForeignKey(
        AuditTemplateQuestion, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="checklist_items",
    )
    question = models.CharField(max_length=1000)
    score = models.IntegerField(null=True, blank=True)
    is_na = models.BooleanField(default=False)
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
            models.Index(fields=["audit", "template_question"], name="mfg_aci_tq_idx"),
        ]

    def __str__(self):
        return f"{self.question[:60]} — {self.score if self.score is not None else '?'}"


class AuditAnswer(TimeStampedModel):
    audit = models.ForeignKey(
        Audit, on_delete=models.CASCADE, related_name="answers"
    )
    template_question = models.ForeignKey(
        AuditTemplateQuestion, on_delete=models.CASCADE,
        related_name="answers",
    )
    answer_value = models.CharField(max_length=500, blank=True, default="")
    comment = models.TextField(blank=True, default="")
    evidence_url = models.URLField(max_length=500, blank=True, default="")
    finding_required = models.BooleanField(default=False)

    class Meta:
        db_table = "manufacturing_audit_answer"
        verbose_name = "Audit Answer"
        verbose_name_plural = "Audit Answers"
        unique_together = [("audit", "template_question")]
        indexes = [
            models.Index(fields=["audit"], name="mfg_aa_audit_idx"),
            models.Index(fields=["template_question"], name="mfg_aa_tq_idx"),
        ]

    def __str__(self):
        return f"Answer for Q{self.template_question_id} — {self.answer_value[:40]}"


class AuditFinding(TimeStampedModel):
    audit = models.ForeignKey(
        Audit, on_delete=models.CASCADE, related_name="findings"
    )
    answer = models.ForeignKey(
        AuditAnswer, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="findings",
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
            models.Index(fields=["answer"], name="mfg_af_answer_idx"),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.description[:60]} ({self.status})"
