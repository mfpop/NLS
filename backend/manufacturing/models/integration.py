from django.db import models
from shared.models.base import TimeStampedModel


class ImportJob(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        FILE_ATTACHED = "FILE_ATTACHED", "File Attached"
        FILE_MISSING = "FILE_MISSING", "File Missing"
        PREVIEWED = "PREVIEWED", "Previewed"
        VALIDATED = "VALIDATED", "Validated"
        COMPARED = "COMPARED", "Compared"
        READY_TO_APPLY = "READY_TO_APPLY", "Ready to Apply"
        APPLIED = "APPLIED", "Applied"
        ARCHIVED = "ARCHIVED", "Archived"
        PREVIEW_FAILED = "PREVIEW_FAILED", "Preview Failed"
        VALIDATION_FAILED = "VALIDATION_FAILED", "Validation Failed"
        COMPARE_FAILED = "COMPARE_FAILED", "Compare Failed"
        APPLY_FAILED = "APPLY_FAILED", "Apply Failed"
        CANCELLED = "CANCELLED", "Cancelled"
        FAILED = "FAILED", "Failed"
        # Legacy compat
        PENDING = "PENDING", "Pending"
        RUNNING = "RUNNING", "Running"
        COMPLETED = "COMPLETED", "Completed"
        PARTIAL_SUCCESS = "PARTIAL_SUCCESS", "Partial Success"

    source_config = models.ForeignKey(
        "application.ImportSourceConfig", on_delete=models.CASCADE, related_name="import_jobs"
    )
    file_name = models.CharField(max_length=500, blank=True, default="")
    file_path = models.CharField(max_length=500, blank=True, default="")
    file_size = models.BigIntegerField(null=True, blank=True)
    file_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    records_processed = models.IntegerField(default=0)
    records_created = models.IntegerField(default=0)
    records_updated = models.IntegerField(default=0)
    records_failed = models.IntegerField(default=0)
    error_summary = models.TextField(blank=True, null=True)
    triggered_by = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        db_table = "integration_import_job"
        ordering = ["-created_at"]
        verbose_name = "Import Job"
        verbose_name_plural = "Import Jobs"
        indexes = [
            models.Index(fields=["status"], name="intg_job_status_idx"),
            models.Index(fields=["source_config"], name="intg_job_source_idx"),
            models.Index(fields=["source_config", "file_hash", "status"], name="intg_job_src_hash_status_idx"),
            models.Index(fields=["source_config", "file_name", "status"], name="intg_job_src_name_status_idx"),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.get_status_display()})"


class ImportValidationError(TimeStampedModel):
    import_job = models.ForeignKey(
        ImportJob, on_delete=models.CASCADE, related_name="validation_errors"
    )
    sheet_name = models.CharField(max_length=200, blank=True, null=True)
    row_number = models.IntegerField(blank=True, null=True)
    entity_type = models.CharField(max_length=100)
    field_name = models.CharField(max_length=100, blank=True, null=True)
    error_code = models.CharField(max_length=50)
    message = models.TextField()
    raw_value = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "integration_import_validation_error"
        ordering = ["-created_at"]
        verbose_name = "Import Validation Error"
        verbose_name_plural = "Import Validation Errors"
        indexes = [
            models.Index(fields=["import_job"], name="intg_err_job_idx"),
            models.Index(fields=["entity_type"], name="intg_err_entity_idx"),
            models.Index(fields=["error_code"], name="intg_err_code_idx"),
        ]

    def __str__(self):
        return f"[{self.error_code}] {self.message[:60]}"


class MappingRule(TimeStampedModel):
    domain = models.CharField(max_length=50)
    source_field = models.CharField(max_length=200)
    destination_field = models.CharField(max_length=200)
    transform_rule = models.TextField(blank=True, null=True)
    is_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "integration_mapping_rule"
        ordering = ["domain", "source_field"]
        verbose_name = "Mapping Rule"
        verbose_name_plural = "Mapping Rules"
        indexes = [
            models.Index(fields=["domain"], name="intg_map_domain_idx"),
            models.Index(fields=["is_active"], name="intg_map_active_idx"),
        ]

    def __str__(self):
        return f"{self.source_field} -> {self.destination_field}"


class ImportCompareResult(TimeStampedModel):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        UNCHANGED = "UNCHANGED", "Unchanged"
        CONFLICT = "CONFLICT", "Conflict"
        DEACTIVATE = "DEACTIVATE", "Deactivate"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"

    import_job = models.ForeignKey(
        ImportJob, on_delete=models.CASCADE, related_name="compare_results"
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    entity_type = models.CharField(max_length=100)
    stable_key = models.CharField(max_length=200, db_index=True)
    current_value = models.JSONField(default=dict)
    incoming_value = models.JSONField(default=dict)
    diff = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        db_table = "integration_import_compare_result"
        ordering = ["stable_key"]
        indexes = [
            models.Index(fields=["import_job"], name="intg_cmp_job_idx"),
            models.Index(fields=["action"], name="intg_cmp_action_idx"),
        ]

    def __str__(self):
        return f"[{self.action}] {self.entity_type}:{self.stable_key}"


class ImportAuditLog(TimeStampedModel):
    import_job = models.ForeignKey(
        ImportJob, on_delete=models.CASCADE, related_name="audit_logs"
    )
    action = models.CharField(max_length=50)
    user = models.CharField(max_length=200, blank=True, default="")
    message = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = "integration_import_audit_log"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["import_job"], name="intg_audit_job_idx"),
            models.Index(fields=["action"], name="intg_audit_action_idx"),
        ]

    def __str__(self):
        return f"[{self.action}] {self.message[:60]}"
