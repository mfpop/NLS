from django.db import models
from shared.models.base import TimeStampedModel


class ReferenceItem(TimeStampedModel):
    TABLE_TYPES = [
        ("production_calendar", "Production Calendar"),
        ("shift_pattern", "Shift Pattern"),
        ("language", "Language"),
        ("timezone", "Timezone"),
        ("manufacturing_type", "Manufacturing Type"),
        ("work_center_type", "Work Center Type"),
        ("machine_type", "Machine Type"),
        ("operation_code", "Operation Code"),
        ("routing_type", "Routing Type"),
        ("material_category", "Material Category"),
        ("inventory_type", "Inventory Type"),
        ("kanban_type", "Kanban Type"),
        ("container_type", "Container Type"),
        ("unit_type", "Unit Type"),
        ("downtime_code", "Downtime Code"),
        ("defect_code", "Defect Code"),
        ("scrap_reason", "Scrap Reason"),
        ("kaizen_category", "Kaizen Category"),
        ("skill_type", "Skill Type"),
        ("role", "Role"),
        ("shift_team", "Shift Team"),
    ]

    table_type = models.CharField(max_length=50, choices=TABLE_TYPES, db_index=True, verbose_name="Table Type")
    code = models.CharField(max_length=50, verbose_name="Code")
    name = models.CharField(max_length=200, verbose_name="Name")
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    sort_order = models.IntegerField(default=0, verbose_name="Sort Order")

    class Meta:
        db_table = "manufacturing_reference_item"
        ordering = ["table_type", "sort_order", "name"]
        verbose_name = "Reference Item"
        verbose_name_plural = "Reference Items"
        constraints = [
            models.UniqueConstraint(fields=["table_type", "code"], name="uq_ref_item_type_code"),
        ]

    def __str__(self):
        return f"[{self.get_table_type_display()}] {self.code} — {self.name}"
