# Generated manually to add the Profile model used by the system profile page.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0002_schema_update"),
    ]

    operations = [
        migrations.CreateModel(
            name="Profile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=200)),
                ("role", models.CharField(max_length=200)),
                ("email", models.EmailField(max_length=200)),
                ("phone", models.CharField(blank=True, default="", max_length=50)),
                ("location", models.CharField(blank=True, default="", max_length=200)),
                ("timezone", models.CharField(blank=True, default="", max_length=100)),
                ("language", models.CharField(blank=True, default="", max_length=100)),
                ("about", models.TextField(blank=True, default="")),
                ("work_history", models.JSONField(blank=True, default=list)),
                ("education", models.JSONField(blank=True, default=list)),
            ],
        ),
    ]
