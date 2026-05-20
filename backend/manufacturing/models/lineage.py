from django.db import models
from shared.models.base import TimeStampedModel


class ErpScope(models.TextChoices):
    PLANT_STRUCTURE = "PLANT_STRUCTURE", "Plant Structure"
    PRODUCT_MASTER = "PRODUCT_MASTER", "Product Master Data"
    MATERIALS = "MATERIALS", "Materials"
    WAREHOUSE_BINS = "WAREHOUSE_BINS", "Warehouse / Bins"
    ROUTING = "ROUTING", "Routing"
    SCHEDULES = "SCHEDULES", "Schedules"
    CAPACITY = "CAPACITY", "Capacity"
    QUALITY = "QUALITY", "Quality"
    CUSTOM = "CUSTOM", "Custom"


class ErpSourceType(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    EXCEL = "EXCEL", "Excel"
    CSV = "CSV", "CSV"
    ERP_EXPORT = "ERP_EXPORT", "ERP Export"
    API = "API", "API"


class ErpDefinitionStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    DEPRECATED = "DEPRECATED", "Deprecated"


class ErpRelationshipType(models.TextChoices):
    ONE_TO_ONE = "ONE_TO_ONE", "1:1"
    BELONGS_TO = "BELONGS_TO", "Belongs To"
    HAS_MANY = "HAS_MANY", "Has Many"
    HAS_ONE = "HAS_ONE", "Has One"
    MANY_TO_MANY = "MANY_TO_MANY", "Many to Many"
    REFERENCE = "REFERENCE", "Reference"


class ValidationSeverity(models.TextChoices):
    ERROR = "ERROR", "Error"
    WARNING = "WARNING", "Warning"
    INFO = "INFO", "Info"


class ErpSourceDefinition(TimeStampedModel):
    name = models.CharField(max_length=200)
    scope = models.CharField(max_length=40, choices=ErpScope.choices)
    source_type = models.CharField(max_length=20, choices=ErpSourceType.choices, default=ErpSourceType.MANUAL)
    destination_table = models.CharField(max_length=120, blank=True, default="")
    expected_file_pattern = models.CharField(max_length=200, blank=True, default="")
    active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=ErpDefinitionStatus.choices, default=ErpDefinitionStatus.DRAFT)
    schema_json = models.JSONField(default=dict, blank=True)
    row_count = models.IntegerField(default=0)
    last_imported_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "erp_source_definition"
        ordering = ["scope", "name"]
        indexes = [
            models.Index(fields=["scope", "active"], name="erp_src_scope_active_idx"),
            models.Index(fields=["status"], name="erp_src_status_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_scope_display()})"


class ErpDefinitionField(TimeStampedModel):
    source_definition = models.ForeignKey(
        ErpSourceDefinition, on_delete=models.CASCADE, related_name="fields"
    )
    field_name = models.CharField(max_length=120)
    data_type = models.CharField(max_length=40, blank=True, default="string")
    required = models.BooleanField(default=False)
    primary_key = models.BooleanField(default=False)
    foreign_key = models.BooleanField(default=False)
    nexus_field = models.CharField(max_length=120, blank=True, default="")
    aliases_json = models.JSONField(default=list, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "erp_definition_field"
        ordering = ["source_definition", "field_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["source_definition", "field_name"],
                name="uq_erp_def_field_name",
            ),
        ]
        indexes = [
            models.Index(fields=["source_definition"], name="erp_def_field_src_idx"),
            models.Index(fields=["primary_key"], name="erp_def_field_pk_idx"),
        ]

    def __str__(self):
        return f"{self.source_definition.name}.{self.field_name}"


class ErpRelationshipDefinition(TimeStampedModel):
    source_definition = models.ForeignKey(
        ErpSourceDefinition, on_delete=models.CASCADE, related_name="relationships"
    )
    source_field = models.CharField(max_length=120)
    target_source_definition = models.ForeignKey(
        ErpSourceDefinition, on_delete=models.CASCADE, related_name="incoming_relationships"
    )
    target_field = models.CharField(max_length=120)
    relationship_type = models.CharField(max_length=20, choices=ErpRelationshipType.choices)
    required = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "erp_relationship_definition"
        ordering = ["source_definition", "source_field"]
        indexes = [
            models.Index(fields=["source_definition"], name="erp_rel_src_idx"),
            models.Index(fields=["target_source_definition"], name="erp_rel_target_idx"),
        ]

    def __str__(self):
        return f"{self.source_definition.name}.{self.source_field} -> {self.target_source_definition.name}.{self.target_field}"


class ErpImportBatch(TimeStampedModel):
    class Mode(models.TextChoices):
        FULL = "FULL", "Full"
        APPEND = "APPEND", "Append"
        OVERWRITE = "OVERWRITE", "Overwrite"

    class BatchStatus(models.TextChoices):
        IMPORTING = "IMPORTING", "Importing"
        STAGED = "STAGED", "Staged"
        VALIDATED = "VALIDATED", "Validated"
        FAILED = "FAILED", "Failed"
        APPLIED = "APPLIED", "Applied"

    source_definition = models.ForeignKey(
        ErpSourceDefinition, on_delete=models.CASCADE, related_name="import_batches"
    )
    file_name = models.CharField(max_length=500)
    file_hash = models.CharField(max_length=64, blank=True, default="")
    imported_by = models.CharField(max_length=200, blank=True, default="")
    imported_at = models.DateTimeField(auto_now_add=True)
    mode = models.CharField(max_length=20, choices=Mode.choices, default=Mode.FULL)
    status = models.CharField(max_length=20, choices=BatchStatus.choices, default=BatchStatus.IMPORTING)
    row_count = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")

    class Meta:
        db_table = "erp_import_batch"
        ordering = ["-imported_at"]
        indexes = [
            models.Index(fields=["source_definition"], name="erp_batch_src_idx"),
            models.Index(fields=["status"], name="erp_batch_status_idx"),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.get_status_display()})"


class ErpStagingRow(TimeStampedModel):
    batch = models.ForeignKey(
        ErpImportBatch, on_delete=models.CASCADE, related_name="staging_rows"
    )
    source_definition = models.ForeignKey(
        ErpSourceDefinition, on_delete=models.CASCADE, related_name="staging_rows"
    )
    row_number = models.IntegerField()
    raw_data_json = models.JSONField(default=dict)
    normalized_data_json = models.JSONField(default=dict, blank=True)
    validation_status = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        db_table = "erp_staging_row"
        ordering = ["batch", "row_number"]
        indexes = [
            models.Index(fields=["batch"], name="erp_staging_batch_idx"),
            models.Index(fields=["source_definition"], name="erp_staging_src_idx"),
        ]

    def __str__(self):
        return f"Row {self.row_number} ({self.batch.file_name})"


class ErpValidationResult(TimeStampedModel):
    scope = models.CharField(max_length=40, choices=ErpScope.choices)
    source_definition = models.ForeignKey(
        ErpSourceDefinition, on_delete=models.CASCADE, related_name="validation_results"
    )
    destination_table = models.CharField(max_length=120, blank=True, default="")
    severity = models.CharField(max_length=16, choices=ValidationSeverity.choices)
    entity = models.CharField(max_length=120, blank=True, default="")
    field_name = models.CharField(max_length=120, blank=True, default="")
    row_number = models.IntegerField(null=True, blank=True)
    rule_code = models.CharField(max_length=60)
    message = models.TextField()
    recommended_action = models.TextField(blank=True, default="")

    class Meta:
        db_table = "erp_validation_result"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["source_definition"], name="erp_val_src_idx"),
            models.Index(fields=["severity"], name="erp_val_severity_idx"),
            models.Index(fields=["scope"], name="erp_val_scope_idx"),
        ]

    def __str__(self):
        return f"[{self.get_severity_display()}] {self.rule_code}: {self.message[:60]}"


class ErpImportLog(TimeStampedModel):
    batch = models.ForeignKey(
        ErpImportBatch, on_delete=models.CASCADE, related_name="logs"
    )
    event_type = models.CharField(max_length=60)
    message = models.TextField(blank=True, default="")
    user = models.CharField(max_length=200, blank=True, default="")
    metadata_json = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "erp_import_log"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["batch"], name="erp_log_batch_idx"),
        ]

    def __str__(self):
        return f"[{self.event_type}] {self.message[:60]}"
