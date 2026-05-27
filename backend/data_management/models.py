from django.db import models
from shared.models.base import TimeStampedModel


# ─── DEPRECATED ────────────────────────────────────────────────────
# ErpPattern is no longer the active source of truth for the import flow.
# The active model is manufacturing.ErpImportPattern.
# This model is kept for migration compatibility only.
class ErpPattern(TimeStampedModel):
    FILE_TYPE_CHOICES = [
        ("xlsx", "Excel (.xlsx)"),
        ("xls", "Excel (.xls)"),
        ("csv", "CSV"),
        ("tsv", "TSV"),
        ("xml", "XML"),
        ("json", "JSON"),
    ]

    name = models.CharField(max_length=200, unique=True)
    source_file_type = models.CharField(
        max_length=20, choices=FILE_TYPE_CHOICES, default="xlsx",
        help_text="Expected source file format",
    )
    destination_entity = models.CharField(
        max_length=100,
        help_text="Target entity name (e.g. Plant, Department, Material)",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        db_table = "dm_erp_pattern"
        ordering = ["-is_active", "name"]
        verbose_name = "ERP Pattern"
        verbose_name_plural = "ERP Patterns"
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name} \u2192 {self.destination_entity}"


class ErpPatternMapping(TimeStampedModel):
    DATA_TYPE_CHOICES = [
        ("string", "String"),
        ("number", "Number"),
        ("boolean", "Boolean"),
        ("date", "Date"),
        ("reference", "Reference"),
    ]

    pattern = models.ForeignKey(
        ErpPattern,
        on_delete=models.CASCADE,
        related_name="field_mappings",
    )
    source_name = models.CharField(max_length=200, help_text="Source field name from the file")
    source_data_type = models.CharField(max_length=50, choices=DATA_TYPE_CHOICES, default="string")
    destination_name = models.CharField(max_length=200, help_text="Target field name")
    destination_data_type = models.CharField(max_length=50, choices=DATA_TYPE_CHOICES, default="string")
    is_required = models.BooleanField(default=False)
    transform_rule = models.TextField(
        blank=True, null=True, default=None,
        help_text="Optional transformation rule (JSON or expression)",
    )
    order = models.IntegerField(default=0)

    class Meta:
        db_table = "dm_erp_pattern_mapping"
        ordering = ["pattern", "order", "source_name"]
        verbose_name = "ERP Pattern Mapping"
        verbose_name_plural = "ERP Pattern Mappings"
        constraints = [
            models.UniqueConstraint(
                fields=["pattern", "source_name"],
                name="uq_dm_pattern_mapping_source",
            ),
        ]
        indexes = [
            models.Index(fields=["pattern", "order"]),
        ]

    def __str__(self):
        return f"{self.source_name} ({self.source_data_type}) \u2192 {self.destination_name} ({self.destination_data_type})"


class ErpSourceFile(TimeStampedModel):
    STATUS_CHOICES = [
        ("UPLOADED", "Uploaded"),
        ("VALIDATED", "Validated"),
        ("IMPORTED", "Imported"),
        ("FAILED", "Failed"),
        ("DELETED", "Deleted"),
    ]
    FILE_TYPE_CHOICES = [
        ("xlsx", "Excel (.xlsx)"),
        ("xls", "Excel (.xls)"),
        ("csv", "CSV"),
        ("tsv", "TSV"),
        ("xml", "XML"),
        ("json", "JSON"),
    ]

    original_name = models.CharField(max_length=512, help_text="Original uploaded filename")
    stored_name = models.CharField(max_length=512, help_text="Storage filename")
    file_path = models.CharField(max_length=1024, help_text="Full path to file in storage")
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES, default="xlsx")
    uploaded_by = models.CharField(max_length=200, blank=True, default="")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="UPLOADED")

    class Meta:
        db_table = "dm_erp_source_file"
        ordering = ["-uploaded_at"]
        verbose_name = "ERP Source File"
        verbose_name_plural = "ERP Source Files"
        indexes = [
            models.Index(fields=["stored_name"]),
            models.Index(fields=["status"]),
            models.Index(fields=["uploaded_at"]),
        ]

    def __str__(self):
        return self.original_name


class ErpImportLog(TimeStampedModel):
    STATUS_CHOICES = [
        ("READY", "Ready"),
        ("IMPORTED", "Imported"),
        ("FAILED", "Failed"),
    ]

    pattern = models.ForeignKey(
        ErpPattern,
        on_delete=models.PROTECT,
        related_name="import_logs",
    )
    source_file = models.ForeignKey(
        ErpSourceFile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="import_logs",
    )
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="READY")
    rows_total = models.IntegerField(default=0)
    rows_added = models.IntegerField(default=0)
    rows_updated = models.IntegerField(default=0)
    rows_not_updated = models.IntegerField(default=0)
    rows_failed = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    source_file_name = models.CharField(max_length=512, blank=True, default="", help_text="Snapshot of source file name at import time")
    pattern_name_snapshot = models.CharField(max_length=200, blank=True, default="", help_text="Snapshot of pattern name at import time")
    destination_entity_snapshot = models.CharField(max_length=100, blank=True, default="", help_text="Snapshot of destination entity at import time")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "dm_erp_import_log"
        ordering = ["-started_at"]
        verbose_name = "ERP Import Log"
        verbose_name_plural = "ERP Import Logs"
        indexes = [
            models.Index(fields=["pattern", "status"]),
            models.Index(fields=["started_at"]),
        ]

    def __str__(self):
        return f"{self.pattern.name} [{self.status}]"
