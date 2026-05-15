from django.db import migrations, models
import django.db.models.deletion


def assign_department_plants(apps, schema_editor):
    Department = apps.get_model("manufacturing", "Department")
    Plant = apps.get_model("manufacturing", "Plant")
    Assignment = apps.get_model("manufacturing", "ProductionLineDepartmentAssignment")

    fallback_plant = Plant.objects.order_by("id").first()
    if fallback_plant is None:
        return

    for department in Department.objects.all():
        assignment = (
            Assignment.objects
            .filter(department_id=department.id, production_line__plant_id__isnull=False)
            .select_related("production_line")
            .order_by("id")
            .first()
        )
        department.plant_id = assignment.production_line.plant_id if assignment else fallback_plant.id
        department.save(update_fields=["plant"])


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0026_department_supervisor"),
    ]

    operations = [
        migrations.AddField(
            model_name="department",
            name="plant",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="departments",
                to="manufacturing.plant",
            ),
        ),
        migrations.RunPython(assign_department_plants, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="department",
            name="plant",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="departments",
                to="manufacturing.plant",
            ),
        ),
        migrations.AlterField(
            model_name="department",
            name="code",
            field=models.CharField(max_length=50),
        ),
        migrations.AddIndex(
            model_name="department",
            index=models.Index(fields=["plant", "code"], name="mfg_dept_plant_code_idx"),
        ),
        migrations.AddConstraint(
            model_name="department",
            constraint=models.UniqueConstraint(fields=("plant", "code"), name="uq_department_plant_code"),
        ),
    ]
