"""Add Manufacturing Engineering Request model.

Migration 0003 — adds the MER model for engineering change, tooling,
process improvement, and equipment modification requests.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("improvement", "0002_add_kaizen_action_a3_pdca_models"),
    ]

    operations = [
        migrations.CreateModel(
            name="ManufacturingEngineeringRequest",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("mer_code", models.CharField(blank=True, default="", max_length=50)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("request_type", models.CharField(
                    choices=[
                        ("ENGINEERING_CHANGE", "Engineering Change"),
                        ("TOOLING", "Tooling Request"),
                        ("PROCESS_IMPROVEMENT", "Process Improvement"),
                        ("EQUIPMENT_MODIFICATION", "Equipment Modification"),
                    ],
                    default="ENGINEERING_CHANGE",
                    max_length=50,
                )),
                ("category", models.CharField(
                    blank=True,
                    choices=[
                        ("SAFETY", "Safety"),
                        ("QUALITY", "Quality"),
                        ("COST", "Cost Reduction"),
                        ("DELIVERY", "Delivery"),
                        ("PRODUCTIVITY", "Productivity"),
                        ("MAINTENANCE", "Maintenance"),
                        ("OTHER", "Other"),
                    ],
                    default="",
                    max_length=50,
                )),
                ("priority", models.CharField(
                    choices=[
                        ("LOW", "Low"),
                        ("MEDIUM", "Medium"),
                        ("HIGH", "High"),
                        ("CRITICAL", "Critical"),
                    ],
                    default="MEDIUM",
                    max_length=20,
                )),
                ("target_type", models.CharField(blank=True, default="", max_length=100)),
                ("target_id", models.IntegerField(blank=True, null=True)),
                ("submitted_by", models.CharField(blank=True, default="", max_length=255)),
                ("assigned_to", models.CharField(blank=True, default="", max_length=255)),
                ("reviewer", models.CharField(blank=True, default="", max_length=255)),
                ("status", models.CharField(
                    choices=[
                        ("SUBMITTED", "Submitted"),
                        ("UNDER_REVIEW", "Under Review"),
                        ("APPROVED", "Approved"),
                        ("IN_PROGRESS", "In Progress"),
                        ("COMPLETED", "Completed"),
                        ("REJECTED", "Rejected"),
                        ("CANCELLED", "Cancelled"),
                    ],
                    default="SUBMITTED",
                    max_length=30,
                )),
                ("review_notes", models.TextField(blank=True, default="")),
                ("rejection_reason", models.TextField(blank=True, default="")),
                ("impact_cost", models.TextField(blank=True, default="")),
                ("impact_quality", models.TextField(blank=True, default="")),
                ("impact_delivery", models.TextField(blank=True, default="")),
                ("impact_safety", models.TextField(blank=True, default="")),
                ("estimated_cost", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("actual_cost", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("start_date", models.DateField(blank=True, null=True)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("completed_date", models.DateField(blank=True, null=True)),
                ("result_summary", models.TextField(blank=True, default="")),
                ("lessons_learned", models.TextField(blank=True, default="")),
                ("linked_kaizen", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="source_mers",
                    to="improvement.kaizen",
                )),
                ("linked_a3", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="source_mers",
                    to="improvement.a3pdca",
                )),
            ],
            options={
                "app_label": "improvement",
                "ordering": ["-created_at"],
            },
        ),
    ]
