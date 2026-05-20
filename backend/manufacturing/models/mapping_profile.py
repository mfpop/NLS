from django.db import models
from shared.models.base import TimeStampedModel


class ImportProfile(TimeStampedModel):
    name = models.CharField(max_length=200)
    domain = models.CharField(max_length=50, default="PLANT_STRUCTURE")
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=False)
    created_by = models.CharField(max_length=200, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    profile_file_path = models.CharField(max_length=512, blank=True, default="", help_text="Profile file path under erp_data/structure/")
    source_template_path = models.CharField(max_length=512, blank=True, default="", help_text="Template file path under erp_data/patterns/")

    class Meta:
        db_table = "erp_import_profile"
        ordering = ["-is_active", "name"]
        verbose_name = "Import Profile"
        verbose_name_plural = "Import Profiles"

    def __str__(self):
        return f"{self.name} v{self.version}"


class ImportFieldMapping(TimeStampedModel):
    profile = models.ForeignKey(
        ImportProfile, on_delete=models.CASCADE, related_name="field_mappings"
    )
    entity_type = models.CharField(max_length=100)
    source_column = models.CharField(max_length=200)
    target_field = models.CharField(max_length=200)
    transform_rule = models.TextField(blank=True, null=True)
    is_required = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = "erp_import_field_mapping"
        ordering = ["entity_type", "sort_order", "source_column"]
        unique_together = [("profile", "entity_type", "source_column")]
        verbose_name = "Import Field Mapping"
        verbose_name_plural = "Import Field Mappings"

    def __str__(self):
        return f"{self.entity_type}.{self.source_column} -> {self.target_field}"
