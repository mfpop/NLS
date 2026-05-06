# Generated manually: company manufacturing fields + config option model.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0007_company"),
    ]

    operations = [
        migrations.CreateModel(
            name="ConfigOption",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("category", models.CharField(choices=[
                    ("industry_type", "Industry Type"),
                    ("manufacturing_type", "Manufacturing Type"),
                    ("shift_model", "Shift Model"),
                    ("units", "Units"),
                    ("lean_methodology", "Lean Methodology"),
                    ("language", "Language"),
                    ("calendar", "Calendar"),
                    ("timezone", "Timezone"),
                ], max_length=50)),
                ("value", models.CharField(max_length=100)),
                ("label", models.CharField(max_length=200)),
                ("sort_order", models.IntegerField(default=0)),
            ],
            options={
                "db_table": "manufacturing_config_option",
                "ordering": ["category", "sort_order", "label"],
                "verbose_name": "Configuration Option",
                "verbose_name_plural": "Configuration Options",
                "unique_together": {("category", "value")},
            },
        ),
        migrations.AddField(
            model_name="company",
            name="default_language",
            field=models.CharField(blank=True, default="en", max_length=50),
        ),
        migrations.AddField(
            model_name="company",
            name="default_shift_model",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="company",
            name="default_timezone",
            field=models.CharField(blank=True, default="UTC", max_length=100),
        ),
        migrations.AddField(
            model_name="company",
            name="default_units",
            field=models.CharField(blank=True, default="Metric", max_length=50),
        ),
        migrations.AddField(
            model_name="company",
            name="industry_type",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="company",
            name="lean_methodology",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="company",
            name="manufacturing_type",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="company",
            name="production_calendar",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
    ]
