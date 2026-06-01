from django.db import models
from shared.models.base import TimeStampedModel


class DocumentType(models.TextChoices):
    WORK_INSTRUCTION = "WORK_INSTRUCTION", "Work Instruction"
    STANDARD_WORK = "STANDARD_WORK", "Standard Work"
    PROCEDURE = "PROCEDURE", "Procedure"
    MATERIAL_FLOW_STANDARD = "MATERIAL_FLOW_STANDARD", "Material Flow Standard"


class TargetType(models.TextChoices):
    COMPANY = "COMPANY", "Company"
    PLANT = "PLANT", "Plant"
    PRODUCTION_LINE = "PRODUCTION_LINE", "Production Line"
    DEPARTMENT = "DEPARTMENT", "Department"
    RESOURCE_GROUP = "RESOURCE_GROUP", "Resource Group"
    RESOURCE = "RESOURCE", "Resource"


class DocumentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    APPROVED = "APPROVED", "Approved"
    ARCHIVED = "ARCHIVED", "Archived"


class LifecycleAction(models.TextChoices):
    CREATED = "CREATED", "Created"
    UPDATED = "UPDATED", "Updated"
    SUBMITTED = "SUBMITTED", "Submitted"
    APPROVED = "APPROVED", "Approved"
    ARCHIVED = "ARCHIVED", "Archived"
    REVISION_CREATED = "REVISION_CREATED", "Revision Created"
    CONTROLLED_COPY_CHANGED = "CONTROLLED_COPY_CHANGED", "Controlled Copy Changed"


class StructureDocument(TimeStampedModel):
    document_type = models.CharField(max_length=50, choices=DocumentType.choices)
    target_type = models.CharField(max_length=50, choices=TargetType.choices)
    target_id = models.IntegerField()
    title = models.CharField(max_length=500)
    code = models.CharField(max_length=100)
    content = models.TextField(blank=True, default="")
    revision = models.CharField(max_length=20, default="1.0")
    status = models.CharField(
        max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.DRAFT
    )
    owner = models.CharField(max_length=200, blank=True, default="")
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)
    review_date = models.DateField(null=True, blank=True)
    change_reason = models.TextField(blank=True, default="")
    is_controlled_copy = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "manufacturing_structure_document"
        verbose_name = "Structure Document"
        verbose_name_plural = "Structure Documents"
        indexes = [
            models.Index(
                fields=["document_type", "target_type", "target_id"],
                name="mfg_sd_doc_tgt_idx",
            ),
            models.Index(
                fields=["document_type", "status", "is_active"],
                name="mfg_sd_doc_status_idx",
            ),
            models.Index(
                fields=["target_type", "target_id", "status"],
                name="mfg_sd_tgt_status_idx",
            ),
            models.Index(fields=["code"], name="mfg_sd_code_idx"),
        ]

    def __str__(self):
        return f"[{self.document_type}] {self.code} — {self.title} ({self.status})"


class StructureDocumentRevisionHistory(TimeStampedModel):
    document = models.ForeignKey(
        StructureDocument, on_delete=models.CASCADE, related_name="revision_history"
    )
    document_type = models.CharField(max_length=50)
    target_type = models.CharField(max_length=50)
    target_id = models.IntegerField()
    code = models.CharField(max_length=100)
    title = models.CharField(max_length=500)
    revision = models.CharField(max_length=20)
    status_from = models.CharField(max_length=20, null=True, blank=True)
    status_to = models.CharField(max_length=20)
    content_snapshot = models.TextField(blank=True, default="")
    change_reason = models.TextField(blank=True, default="")
    changed_by = models.CharField(max_length=200, blank=True, default="")
    lifecycle_action = models.CharField(max_length=50, choices=LifecycleAction.choices)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "manufacturing_structure_document_revision_history"
        verbose_name = "Document Revision History"
        verbose_name_plural = "Document Revision Histories"
        ordering = ["-changed_at"]
        indexes = [
            models.Index(fields=["document"], name="mfg_sdrh_doc_idx"),
            models.Index(fields=["lifecycle_action"], name="mfg_sdrh_action_idx"),
        ]

    def __str__(self):
        return f"[{self.lifecycle_action}] {self.code} rev {self.revision}"


class StructureDocumentAuditTrail(TimeStampedModel):
    document = models.ForeignKey(
        StructureDocument, on_delete=models.CASCADE, related_name="audit_trail"
    )
    action = models.CharField(max_length=50)
    actor = models.CharField(max_length=200, blank=True, default="")
    occurred_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(blank=True, default=dict)
    reason = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_structure_document_audit_trail"
        verbose_name = "Document Audit Trail"
        verbose_name_plural = "Document Audit Trails"
        ordering = ["-occurred_at"]
        indexes = [
            models.Index(fields=["document"], name="mfg_sdat_doc_idx"),
            models.Index(fields=["action"], name="mfg_sdat_action_idx"),
        ]

    def __str__(self):
        return f"[{self.action}] doc {self.document_id}"
