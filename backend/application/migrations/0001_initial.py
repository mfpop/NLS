from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ApplicationSetting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.CharField(max_length=80, unique=True)),
                ("value", models.JSONField(default=dict)),
                ("value_type", models.CharField(choices=[("STRING", "String"), ("BOOLEAN", "Boolean"), ("INTEGER", "Integer"), ("DECIMAL", "Decimal"), ("JSON", "JSON")], default="STRING", max_length=16)),
                ("category", models.CharField(max_length=40)),
                ("description", models.CharField(blank=True, default="", max_length=255)),
                ("is_system", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["category", "key"],
            },
        ),
        migrations.AddIndex(
            model_name="applicationsetting",
            index=models.Index(fields=["category"], name="app_setting_category_idx"),
        ),
    ]
