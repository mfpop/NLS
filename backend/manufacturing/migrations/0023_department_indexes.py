from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0022_routing_routingstep_and_more"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="department",
            index=models.Index(fields=["code"], name="mfg_dept_code_idx"),
        ),
        migrations.AddIndex(
            model_name="department",
            index=models.Index(fields=["status"], name="mfg_dept_status_idx"),
        ),
        migrations.AddIndex(
            model_name="department",
            index=models.Index(fields=["name"], name="mfg_dept_name_idx"),
        ),
    ]
