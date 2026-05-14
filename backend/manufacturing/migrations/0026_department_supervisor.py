from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0025_remove_productionline_product_model_id_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="department",
            name="supervisor",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
    ]
