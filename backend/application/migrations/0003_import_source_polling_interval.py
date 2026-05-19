from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("application", "0002_importsourceconfig"),
    ]

    operations = [
        migrations.AddField(
            model_name="importsourceconfig",
            name="polling_interval_minutes",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
