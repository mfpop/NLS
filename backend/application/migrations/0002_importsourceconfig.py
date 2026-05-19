from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("application", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ImportSourceConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120)),
                (
                    "source_type",
                    models.CharField(
                        choices=[("EXCEL", "Excel"), ("CSV", "CSV"), ("ERP_EXPORT", "ERP export")],
                        max_length=16,
                    ),
                ),
                (
                    "domain",
                    models.CharField(
                        choices=[
                            ("PLANT_STRUCTURE", "Plant structure"),
                            ("MATERIALS", "Materials"),
                            ("BOM", "BOM"),
                            ("ROUTING", "Routing"),
                            ("SCHEDULES", "Schedules"),
                            ("INVENTORY", "Inventory"),
                        ],
                        max_length=32,
                    ),
                ),
                ("path", models.CharField(max_length=512)),
                ("file_pattern", models.CharField(max_length=120)),
                ("archive_path", models.CharField(blank=True, default="", max_length=512)),
                ("error_path", models.CharField(blank=True, default="", max_length=512)),
                ("is_active", models.BooleanField(default=True)),
                ("is_archived", models.BooleanField(default=False)),
                ("last_checked_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "ordering": ["domain", "name"],
            },
        ),
        migrations.AddIndex(
            model_name="importsourceconfig",
            index=models.Index(fields=["domain", "is_active"], name="import_src_domain_active_idx"),
        ),
        migrations.AddIndex(
            model_name="importsourceconfig",
            index=models.Index(fields=["is_archived"], name="import_src_archived_idx"),
        ),
    ]
