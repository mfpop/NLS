from django.db import migrations, models
import django.db.models.deletion


def assign_resource_group_departments(apps, schema_editor):
    ResourceGroup = apps.get_model("manufacturing", "ResourceGroup")
    Department = apps.get_model("manufacturing", "Department")
    default_dept = Department.objects.order_by("id").first()
    if default_dept:
        ResourceGroup.objects.filter(department__isnull=True).update(department_id=default_dept.id)


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0028_plant_company"),
    ]

    operations = [
        migrations.RunPython(assign_resource_group_departments, migrations.RunPython.noop, elidable=False),
        migrations.AlterField(
            model_name="resourcegroup",
            name="department",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="resource_groups",
                to="manufacturing.department",
            ),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="resourcegroup",
            name="code",
            field=models.CharField(max_length=50),
        ),
        migrations.AddConstraint(
            model_name="resourcegroup",
            constraint=models.UniqueConstraint(fields=("department", "code"), name="uq_resource_group_department_code"),
        ),
    ]
