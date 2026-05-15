from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0031_referencevalue_is_configurable_and_more"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="referencevalue",
            constraint=models.CheckConstraint(
                condition=~models.Q(("code", "")),
                name="ref_value_code_not_empty",
            ),
        ),
        migrations.AddConstraint(
            model_name="referencevalue",
            constraint=models.CheckConstraint(
                condition=~models.Q(("name", "")),
                name="ref_value_name_not_empty",
            ),
        ),
        migrations.AddConstraint(
            model_name="referencevalue",
            constraint=models.CheckConstraint(
                condition=~models.Q(("description", "")),
                name="ref_value_description_not_empty",
            ),
        ),
        migrations.AddConstraint(
            model_name="referencevalue",
            constraint=models.CheckConstraint(
                condition=~models.Q(("usage_context", "")),
                name="ref_value_usage_context_not_empty",
            ),
        ),
    ]
