from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0069_add_product_variant_part_number"),
    ]

    operations = [
        migrations.DeleteModel(
            name="ErpImportPatternFieldMapping",
        ),
        migrations.DeleteModel(
            name="ErpImportPattern",
        ),
        migrations.CreateModel(
            name="StructureDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("document_type", models.CharField(max_length=50)),
                ("target_type", models.CharField(max_length=50)),
                ("target_id", models.IntegerField()),
                ("title", models.CharField(max_length=500)),
                ("code", models.CharField(max_length=100)),
                ("content", models.TextField(blank=True, default="")),
                ("revision", models.CharField(default="1.0", max_length=20)),
                ("status", models.CharField(default="DRAFT", max_length=20)),
                ("owner", models.CharField(blank=True, default="", max_length=200)),
                ("effective_from", models.DateField(blank=True, null=True)),
                ("effective_to", models.DateField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name": "Structure Document",
                "verbose_name_plural": "Structure Documents",
                "db_table": "manufacturing_structure_document",
                "indexes": [
                    models.Index(fields=["document_type", "target_type", "target_id"], name="mfg_sd_doc_tgt_idx"),
                    models.Index(fields=["document_type", "status", "is_active"], name="mfg_sd_doc_status_idx"),
                    models.Index(fields=["target_type", "target_id", "status"], name="mfg_sd_tgt_status_idx"),
                    models.Index(fields=["code"], name="mfg_sd_code_idx"),
                ],
            },
        ),
    ]
