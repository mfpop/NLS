import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0020_productionline_line_type_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="productionline",
            name="default_calendar_id",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="manufacturing.referencevalue"),
        ),
        migrations.AddField(
            model_name="productionline",
            name="week_start_day_id",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="manufacturing.referencevalue"),
        ),
        migrations.AddField(
            model_name="productionline",
            name="timezone_id",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="manufacturing.referencevalue"),
        ),
        migrations.AddField(
            model_name="productionline",
            name="production_family_id",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="manufacturing.referencevalue"),
        ),
        migrations.AddField(
            model_name="productionline",
            name="capacity_basis",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="productionline",
            name="capacity_uom_id",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="manufacturing.referencevalue"),
        ),
        migrations.AddField(
            model_name="productionline",
            name="bottleneck_resource_group",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="bottleneck_for_lines", to="manufacturing.resourcegroup"),
        ),
        migrations.AddField(
            model_name="productionline",
            name="product_models",
            field=models.ManyToManyField(blank=True, related_name="production_lines", to="manufacturing.productmodel"),
        ),
    ]
