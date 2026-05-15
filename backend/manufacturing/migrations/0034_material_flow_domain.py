from django.db import migrations, models
import django.db.models.deletion
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0033_capacity_planning"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="routing",
            constraint=models.UniqueConstraint(
                fields=("production_line", "product_model"),
                condition=Q(("status", "ACTIVE")),
                name="uq_line_model_active_routing",
            ),
        ),
        migrations.CreateModel(
            name="Material",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=50, unique=True)),
                ("name", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("material_state", models.CharField(choices=[("RAW_MATERIAL", "Raw Material"), ("WIP", "Work in Process"), ("FINISHED_GOOD", "Finished Good"), ("SCRAP", "Scrap")], default="RAW_MATERIAL", max_length=30)),
                ("status", models.CharField(choices=[("ACTIVE", "Active"), ("INACTIVE", "Inactive"), ("ARCHIVED", "Archived")], default="ACTIVE", max_length=20)),
                ("unit_of_measure", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="manufacturing.referencevalue")),
            ],
            options={
                "db_table": "manufacturing_material",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="InventoryLocation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=50)),
                ("name", models.CharField(max_length=200)),
                ("location_type", models.CharField(choices=[("WAREHOUSE", "Warehouse"), ("LINE_SIDE", "Line-side"), ("BUFFER", "Buffer"), ("SUPERMARKET", "Supermarket"), ("FIFO", "FIFO"), ("KANBAN", "Kanban"), ("WIP", "WIP"), ("FINISHED_GOODS", "Finished Goods")], default="WAREHOUSE", max_length=30)),
                ("description", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("ACTIVE", "Active"), ("INACTIVE", "Inactive"), ("ARCHIVED", "Archived")], default="ACTIVE", max_length=20)),
                ("plant", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="inventory_locations", to="manufacturing.plant")),
            ],
            options={
                "db_table": "manufacturing_inventory_location",
                "ordering": ["plant", "name"],
            },
        ),
        migrations.CreateModel(
            name="BOM",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("version", models.CharField(default="1.0", max_length=20)),
                ("status", models.CharField(choices=[("DRAFT", "Draft"), ("ACTIVE", "Active"), ("ARCHIVED", "Archived")], db_index=True, default="DRAFT", max_length=20)),
                ("notes", models.TextField(blank=True, default="")),
                ("product_model", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="boms", to="manufacturing.productmodel")),
            ],
            options={
                "db_table": "manufacturing_bom",
                "ordering": ["product_model", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="BOMItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("quantity", models.FloatField(default=1)),
                ("scrap_factor", models.FloatField(default=0)),
                ("notes", models.TextField(blank=True, default="")),
                ("bom", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="manufacturing.bom")),
                ("material", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="bom_items", to="manufacturing.material")),
            ],
            options={
                "db_table": "manufacturing_bom_item",
                "ordering": ["bom", "material__name"],
            },
        ),
        migrations.CreateModel(
            name="OperationInput",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("quantity", models.FloatField(default=1)),
                ("material_state", models.CharField(choices=[("RAW_MATERIAL", "Raw Material"), ("WIP", "Work in Process"), ("FINISHED_GOOD", "Finished Good"), ("SCRAP", "Scrap")], default="RAW_MATERIAL", max_length=30)),
                ("material", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="operation_inputs", to="manufacturing.material")),
                ("routing_step", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="material_inputs", to="manufacturing.routingstep")),
                ("source_location", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="operation_inputs", to="manufacturing.inventorylocation")),
            ],
            options={
                "db_table": "manufacturing_operation_input",
                "ordering": ["routing_step", "material__name"],
            },
        ),
        migrations.CreateModel(
            name="OperationOutput",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("quantity", models.FloatField(default=1)),
                ("material_state", models.CharField(choices=[("RAW_MATERIAL", "Raw Material"), ("WIP", "Work in Process"), ("FINISHED_GOOD", "Finished Good"), ("SCRAP", "Scrap")], default="WIP", max_length=30)),
                ("material", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="operation_outputs", to="manufacturing.material")),
                ("routing_step", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="material_outputs", to="manufacturing.routingstep")),
                ("target_location", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="operation_outputs", to="manufacturing.inventorylocation")),
            ],
            options={
                "db_table": "manufacturing_operation_output",
                "ordering": ["routing_step", "material__name"],
            },
        ),
        migrations.CreateModel(
            name="MaterialMovement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("quantity", models.FloatField(default=0)),
                ("movement_type", models.CharField(choices=[("RECEIVE", "Receive"), ("ISSUE", "Issue"), ("TRANSFER", "Transfer"), ("CONSUME", "Consume"), ("PRODUCE", "Produce"), ("SCRAP", "Scrap")], default="TRANSFER", max_length=30)),
                ("material_state", models.CharField(choices=[("RAW_MATERIAL", "Raw Material"), ("WIP", "Work in Process"), ("FINISHED_GOOD", "Finished Good"), ("SCRAP", "Scrap")], default="RAW_MATERIAL", max_length=30)),
                ("reference", models.CharField(blank=True, default="", max_length=120)),
                ("notes", models.TextField(blank=True, default="")),
                ("from_location", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="outgoing_movements", to="manufacturing.inventorylocation")),
                ("material", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="movements", to="manufacturing.material")),
                ("production_line", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="material_movements", to="manufacturing.productionline")),
                ("routing_step", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="material_movements", to="manufacturing.routingstep")),
                ("to_location", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="incoming_movements", to="manufacturing.inventorylocation")),
            ],
            options={
                "db_table": "manufacturing_material_movement",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="MaterialMovementRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("rule_type", models.CharField(choices=[("LINE_SIDE", "Line-side"), ("BUFFER", "Buffer"), ("SUPERMARKET", "Supermarket"), ("FIFO", "FIFO"), ("KANBAN", "Kanban"), ("NEXT_OPERATION", "Next Operation"), ("FINISHED_GOODS", "Finished Goods")], default="NEXT_OPERATION", max_length=30)),
                ("notes", models.TextField(blank=True, default="")),
                ("destination_location", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="movement_rules_as_destination", to="manufacturing.inventorylocation")),
                ("routing_step", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="material_movement_rule", to="manufacturing.routingstep")),
                ("source_location", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="movement_rules_as_source", to="manufacturing.inventorylocation")),
            ],
            options={
                "db_table": "manufacturing_material_movement_rule",
                "ordering": ["routing_step__routing", "routing_step__sequence"],
            },
        ),
        migrations.AddIndex(
            model_name="material",
            index=models.Index(fields=["material_state", "status"], name="mfg_mat_state_status_idx"),
        ),
        migrations.AddConstraint(
            model_name="inventorylocation",
            constraint=models.UniqueConstraint(fields=("plant", "code"), name="uq_inventory_location_plant_code"),
        ),
        migrations.AddIndex(
            model_name="inventorylocation",
            index=models.Index(fields=["plant", "location_type"], name="mfg_invloc_plant_type_idx"),
        ),
        migrations.AddConstraint(
            model_name="bom",
            constraint=models.UniqueConstraint(fields=("product_model",), condition=Q(("status", "ACTIVE")), name="uq_product_model_active_bom"),
        ),
        migrations.AddConstraint(
            model_name="bomitem",
            constraint=models.UniqueConstraint(fields=("bom", "material"), name="uq_bom_material"),
        ),
        migrations.AddIndex(
            model_name="materialmovement",
            index=models.Index(fields=["material", "created_at"], name="mfg_move_material_date_idx"),
        ),
        migrations.AddIndex(
            model_name="materialmovement",
            index=models.Index(fields=["production_line", "created_at"], name="mfg_move_line_date_idx"),
        ),
    ]
