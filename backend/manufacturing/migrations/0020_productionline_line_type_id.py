import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0019_company_default_calendar_id_company_week_start_day_id_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="productionline",
            name="line_type_id",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="manufacturing.referencevalue"),
        ),
    ]
