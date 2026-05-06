# Generated manually to add the Company model for organization-level settings.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0006_profile_user_userrole"),
    ]

    operations = [
        migrations.CreateModel(
            name="Company",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=20, unique=True, verbose_name="Company Code")),
                ("name", models.CharField(max_length=200, verbose_name="Company Name")),
                ("address", models.CharField(blank=True, default="", max_length=500)),
                ("phone", models.CharField(blank=True, default="", max_length=50)),
                ("email", models.EmailField(blank=True, default="", max_length=200)),
                ("website", models.URLField(blank=True, default="", max_length=500)),
                ("tax_id", models.CharField(blank=True, default="", max_length=50, verbose_name="Tax ID")),
                ("description", models.TextField(blank=True, default="")),
            ],
            options={
                "db_table": "manufacturing_company",
                "ordering": ["name"],
                "verbose_name": "Company",
                "verbose_name_plural": "Companies",
            },
        ),
    ]
