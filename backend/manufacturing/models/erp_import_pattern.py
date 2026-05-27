from django.db import models
from shared.models.base import TimeStampedModel


class ErpImportPattern(TimeStampedModel):
    SCOPE_CHOICES = [
        ("PLANT_STRUCTURE", "Plant Structure"),
        ("PRODUCT_MASTER", "Product Master"),
        ("MATERIALS", "Materials"),
        ("WAREHOUSE_BINS", "Warehouse Bins"),
        ("ROUTING", "Routing"),
        ("SCHEDULES", "Schedules"),
        ("CAPACITY", "Capacity"),
        ("QUALITY", "Quality"),
        ("CUSTOM", "Custom"),
    ]
    DATA_TYPE_CHOICES = [
        ("string", "String"),
        ("number", "Number"),
        ("boolean", "Boolean"),
        ("date", "Date"),
        ("reference", "Reference"),
    ]

    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, default="")
    scope = models.CharField(max_length=50, choices=SCOPE_CHOICES, default="CUSTOM")
    destination_entity = models.CharField(max_length=100, help_text="Target LeanSync entity (e.g. Plant, Department, Material)")
    is_active = models.BooleanField(default=True)
    created_by = models.CharField(max_length=200, blank=True, default="")
    source_file_pattern = models.CharField(max_length=512, blank=True, default="", help_text="Expected file name pattern (glob)")
    source_file_type = models.CharField(max_length=20, blank=True, default="", help_text="Derived file extension from source_file_pattern (e.g. xlsx, csv)")
    plant_selection = models.JSONField(
        blank=True, null=True, default=dict,
        help_text='Plant scope: {"mode": "all"} or {"mode": "selected", "plantIds": [1,2,3]}',
    )
    department_selection = models.JSONField(
        blank=True, null=True, default=dict,
        help_text='Department scope: {"mode": "all"} or {"mode": "selected", "departmentIds": [1,2,3]}',
    )
    resource_group_selection = models.JSONField(
        blank=True, null=True, default=dict,
        help_text='Resource group scope: {"mode": "all"} or {"mode": "selected", "resourceGroupIds": [1,2,3]}',
    )
    source_schema = models.JSONField(
        blank=True, null=True, default=list,
        help_text='Extracted source fields: [{"fieldName": "Code", "dataType": "string"}, ...]',
    )

    class Meta:
        db_table = "erp_import_pattern"
        ordering = ["-is_active", "name"]
        verbose_name = "ERP Import Pattern"
        verbose_name_plural = "ERP Import Patterns"

    def __str__(self):
        return f"{self.name} → {self.destination_entity}"


class ErpImportPatternFieldMapping(TimeStampedModel):
    DATA_TYPE_CHOICES = ErpImportPattern.DATA_TYPE_CHOICES

    pattern = models.ForeignKey(
        ErpImportPattern, on_delete=models.CASCADE, related_name="field_mappings"
    )
    source_name = models.CharField(max_length=200, help_text="Source field name from the file")
    source_data_type = models.CharField(max_length=50, choices=DATA_TYPE_CHOICES, default="string")
    destination_name = models.CharField(max_length=200, help_text="Destination Nexus field name")
    destination_data_type = models.CharField(max_length=50, choices=DATA_TYPE_CHOICES, default="string")
    is_required = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = "erp_import_pattern_field_mapping"
        ordering = ["pattern", "sort_order", "source_name"]
        unique_together = [("pattern", "source_name")]
        verbose_name = "ERP Import Pattern Field Mapping"
        verbose_name_plural = "ERP Import Pattern Field Mappings"

    def __str__(self):
        return f"{self.source_name} ({self.source_data_type}) → {self.destination_name} ({self.destination_data_type})"
