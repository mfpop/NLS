# Generated manually: add group field to ReferenceTable.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0008_company_fields_and_config"),
    ]

    operations = [
        migrations.AddField(
            model_name="referencetable",
            name="group",
            field=models.CharField(blank=True, choices=[
                ("organization", "Organization"),
                ("manufacturing", "Manufacturing"),
                ("material_flow", "Material Flow"),
                ("lean_quality", "Lean / Quality"),
                ("people", "People"),
            ], default="", max_length=50, verbose_name="Group"),
        ),
    ]
