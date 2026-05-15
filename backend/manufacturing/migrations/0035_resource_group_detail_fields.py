from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0034_material_flow_domain"),
    ]

    operations = [
        migrations.AddField(
            model_name="resourcegroup",
            name="supervisor",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AddField(
            model_name="resourcegroup",
            name="capability_type",
            field=models.CharField(
                choices=[
                    ("SHARED", "Shared"),
                    ("DEDICATED", "Dedicated"),
                    ("CONSTRAINT", "Constraint"),
                    ("PACEMAKER", "Pacemaker"),
                    ("MANUAL", "Manual"),
                    ("AUTOMATED", "Automated"),
                ],
                default="SHARED",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="resourcegroup",
            name="shift_pattern_id",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="manufacturing.referencevalue",
            ),
        ),
        migrations.AddField(
            model_name="resourcegroup",
            name="capacity_model",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="resourcegroup",
            name="oee_target",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="resourcegroup",
            name="is_bottleneck",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="resourcegroup",
            name="is_constraint",
            field=models.BooleanField(default=False),
        ),
    ]
