from django.db import migrations, models
import django.db.models.deletion


def repair_assignments_and_backfill_plant(apps, schema_editor):
    Assignment = apps.get_model("manufacturing", "ProductionLineDepartmentAssignment")

    for assignment in Assignment.objects.select_related("production_line", "department"):
        line_plant_id = assignment.production_line.plant_id
        department_plant_id = assignment.department.plant_id
        if line_plant_id != department_plant_id:
            assignment.delete()
            continue
        assignment.plant_id = line_plant_id
        assignment.save(update_fields=["plant"])


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0029_resourcegroup_department_required_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="productionline",
            name="plant",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="production_lines",
                to="manufacturing.plant",
            ),
        ),
        migrations.AlterField(
            model_name="resource",
            name="resource_group",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="resources",
                to="manufacturing.resourcegroup",
            ),
        ),
        migrations.AlterField(
            model_name="resource",
            name="code",
            field=models.CharField(max_length=50),
        ),
        migrations.AddField(
            model_name="productionlinedepartmentassignment",
            name="plant",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="line_department_assignments",
                to="manufacturing.plant",
            ),
        ),
        migrations.RunPython(repair_assignments_and_backfill_plant, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="productionlinedepartmentassignment",
            name="plant",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="line_department_assignments",
                to="manufacturing.plant",
            ),
        ),
        migrations.AlterField(
            model_name="productionlinedepartmentassignment",
            name="production_line",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="department_assignments",
                to="manufacturing.productionline",
            ),
        ),
        migrations.AlterField(
            model_name="productionlinedepartmentassignment",
            name="department",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="line_assignments",
                to="manufacturing.department",
            ),
        ),
        migrations.AddIndex(
            model_name="productionline",
            index=models.Index(fields=["plant", "code"], name="mfg_line_plant_code_idx"),
        ),
        migrations.AddIndex(
            model_name="productionline",
            index=models.Index(fields=["plant"], name="mfg_line_plant_idx"),
        ),
        migrations.AddConstraint(
            model_name="productionline",
            constraint=models.UniqueConstraint(fields=("plant", "code"), name="uq_line_plant_code"),
        ),
        migrations.AddIndex(
            model_name="productionlinedepartmentassignment",
            index=models.Index(fields=["plant"], name="mfg_pld_plant_idx"),
        ),
        migrations.AddIndex(
            model_name="productionlinedepartmentassignment",
            index=models.Index(fields=["production_line"], name="mfg_pld_line_idx"),
        ),
        migrations.AddIndex(
            model_name="productionlinedepartmentassignment",
            index=models.Index(fields=["department"], name="mfg_pld_dept_idx"),
        ),
        migrations.AddIndex(
            model_name="resource",
            index=models.Index(fields=["resource_group", "code"], name="mfg_res_group_code_idx"),
        ),
        migrations.AddIndex(
            model_name="resource",
            index=models.Index(fields=["resource_group"], name="mfg_res_group_idx"),
        ),
        migrations.AddConstraint(
            model_name="resource",
            constraint=models.UniqueConstraint(fields=("resource_group", "code"), name="uq_resource_group_code"),
        ),
    ]
