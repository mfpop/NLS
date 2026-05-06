# Generated manually to sync manufacturing DB schema with current models.
#
# Changes vs 0001_initial:
#   ProductionLine : +code, +departments M2M, plant FK nullable→non-null (kept nullable to preserve data)
#   ResourceGroup  : +code
#   Resource       : -department FK, -plant FK, -production_line FK; resource_group FK now non-null
#   Department     : -plant FK

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0001_initial"),
    ]

    operations = [
        # ── 1. Add code to ProductionLine ──────────────────────────────────────
        migrations.AddField(
            model_name="productionline",
            name="code",
            field=models.CharField(
                blank=True, default="", max_length=20, verbose_name="Line Code"
            ),
        ),

        # ── 2. Add departments M2M to ProductionLine ───────────────────────────
        migrations.AddField(
            model_name="productionline",
            name="departments",
            field=models.ManyToManyField(
                blank=True,
                related_name="production_lines",
                to="manufacturing.department",
            ),
        ),

        # ── 3. Add code to ResourceGroup ──────────────────────────────────────
        migrations.AddField(
            model_name="resourcegroup",
            name="code",
            field=models.CharField(
                blank=True, default="", max_length=50, verbose_name="Group Code"
            ),
        ),

        # ── 4. Remove stale FKs from Resource ────────────────────────────────
        migrations.RemoveField(
            model_name="resource",
            name="department",
        ),
        migrations.RemoveField(
            model_name="resource",
            name="plant",
        ),
        migrations.RemoveField(
            model_name="resource",
            name="production_line",
        ),

        # ── 5. Make resource.resource_group non-nullable ──────────────────────
        #    (existing rows with NULL resource_group will be left; run a
        #     data migration or fix data manually before enforcing NOT NULL)
        migrations.AlterField(
            model_name="resource",
            name="resource_group",
            field=models.ForeignKey(
                null=True,          # keep nullable so existing data is safe
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="resources",
                to="manufacturing.resourcegroup",
            ),
        ),

        # ── 6. Remove stale plant FK from Department ──────────────────────────
        migrations.RemoveField(
            model_name="department",
            name="plant",
        ),
    ]
