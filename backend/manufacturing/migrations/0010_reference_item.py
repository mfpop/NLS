# Generated manually: create ReferenceItem model for all reference data.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0009_reference_table_group"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReferenceItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("table_type", models.CharField(choices=[
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
                ], db_index=True, max_length=50, verbose_name="Table Type")),
                ("code", models.CharField(max_length=50, verbose_name="Code")),
                ("name", models.CharField(max_length=200, verbose_name="Name")),
                ("description", models.TextField(blank=True, default="")),
                ("is_active", models.BooleanField(default=True, verbose_name="Active")),
                ("sort_order", models.IntegerField(default=0, verbose_name="Sort Order")),
            ],
            options={
                "db_table": "manufacturing_reference_item",
                "ordering": ["table_type", "sort_order", "name"],
                "verbose_name": "Reference Item",
                "verbose_name_plural": "Reference Items",
            },
        ),
        migrations.AddConstraint(
            model_name="referenceitem",
            constraint=models.UniqueConstraint(fields=("table_type", "code"), name="uq_ref_item_type_code"),
        ),
    ]
