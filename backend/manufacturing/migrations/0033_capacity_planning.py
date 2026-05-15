from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("manufacturing", "0032_referencevalue_required_metadata_constraints"),
    ]

    operations = [
        migrations.CreateModel(
            name="CapacityPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("planning_horizon_start", models.DateField()),
                ("planning_horizon_end", models.DateField()),
                ("status", models.CharField(choices=[("DRAFT", "Draft"), ("CALCULATED", "Calculated"), ("HAS_WARNINGS", "Has Warnings"), ("APPROVED", "Approved"), ("ARCHIVED", "Archived")], db_index=True, default="DRAFT", max_length=20)),
                ("calculated_at", models.DateTimeField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("approved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="approved_capacity_plans", to=settings.AUTH_USER_MODEL)),
                ("calculated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="calculated_capacity_plans", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_capacity_plans", to=settings.AUTH_USER_MODEL)),
                ("plant", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="capacity_plans", to="manufacturing.plant")),
                ("product_model", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="capacity_plans_as_model", to="manufacturing.referencevalue")),
                ("production_line", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="capacity_plans", to="manufacturing.productionline")),
                ("routing_version", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="capacity_plans", to="manufacturing.routing")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="updated_capacity_plans", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "manufacturing_capacity_plan",
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="CapacityPlanInput",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("planned_quantity", models.PositiveIntegerField(default=0)),
                ("available_time_minutes", models.FloatField(default=0)),
                ("break_time_minutes", models.FloatField(default=0)),
                ("planned_downtime_minutes", models.FloatField(default=0)),
                ("net_available_time_minutes", models.FloatField(default=0)),
                ("operators_available", models.PositiveIntegerField(default=1)),
                ("efficiency_factor", models.FloatField(default=1.0)),
                ("takt_time_seconds", models.FloatField(default=0)),
                ("capacity_plan", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="inputs", to="manufacturing.capacityplan")),
            ],
            options={
                "db_table": "manufacturing_capacity_plan_input",
            },
        ),
        migrations.CreateModel(
            name="CapacityPlanResult",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("total_work_content_seconds", models.FloatField(default=0)),
                ("required_capacity_minutes", models.FloatField(default=0)),
                ("available_capacity_minutes", models.FloatField(default=0)),
                ("capacity_utilization_percent", models.FloatField(default=0)),
                ("balance_loss_percent", models.FloatField(default=0)),
                ("operators_required", models.PositiveIntegerField(default=0)),
                ("feasibility_status", models.CharField(choices=[("FEASIBLE", "Feasible"), ("WARNING", "Warning"), ("INFEASIBLE", "Infeasible"), ("MISSING_DATA", "Missing Data")], default="MISSING_DATA", max_length=20)),
                ("warnings_json", models.JSONField(blank=True, default=list)),
                ("load_rows_json", models.JSONField(blank=True, default=list)),
                ("yamazumi_json", models.JSONField(blank=True, default=dict)),
                ("constraints_json", models.JSONField(blank=True, default=list)),
                ("bottleneck_resource", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="manufacturing.resource")),
                ("bottleneck_step", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="manufacturing.routingstep")),
                ("capacity_plan", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="result", to="manufacturing.capacityplan")),
            ],
            options={
                "db_table": "manufacturing_capacity_plan_result",
            },
        ),
        migrations.CreateModel(
            name="CapacityScenario",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120)),
                ("assumptions_json", models.JSONField(blank=True, default=dict)),
                ("result_json", models.JSONField(blank=True, default=dict)),
                ("is_baseline", models.BooleanField(default=False)),
                ("capacity_plan", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="scenarios", to="manufacturing.capacityplan")),
            ],
            options={
                "db_table": "manufacturing_capacity_scenario",
                "ordering": ["-is_baseline", "-updated_at"],
            },
        ),
        migrations.AddIndex(model_name="capacityplan", index=models.Index(fields=["plant", "status"], name="cap_plan_plant_status_idx")),
        migrations.AddIndex(model_name="capacityplan", index=models.Index(fields=["production_line", "product_model"], name="cap_plan_line_model_idx")),
        migrations.AddIndex(model_name="capacityplan", index=models.Index(fields=["planning_horizon_start", "planning_horizon_end"], name="cap_plan_horizon_idx")),
        migrations.AddIndex(model_name="capacityscenario", index=models.Index(fields=["capacity_plan", "is_baseline"], name="cap_scenario_baseline_idx")),
    ]
