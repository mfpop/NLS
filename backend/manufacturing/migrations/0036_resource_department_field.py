from django.db import migrations, models
import django.db.models.deletion


def backfill_resource_departments(apps, schema_editor):
    Resource = apps.get_model("manufacturing", "Resource")
    for resource in Resource.objects.select_related("resource_group__department"):
        if resource.resource_group_id and resource.resource_group.department_id:
            resource.department_id = resource.resource_group.department_id
            resource.save(update_fields=["department"])


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0035_resource_group_detail_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="resource",
            name="department",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="resources",
                to="manufacturing.department",
            ),
        ),
        migrations.RunPython(backfill_resource_departments, migrations.RunPython.noop),
    ]
