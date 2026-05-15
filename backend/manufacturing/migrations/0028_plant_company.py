from django.db import migrations, models
import django.db.models.deletion


def assign_plant_companies(apps, schema_editor):
    Company = apps.get_model("manufacturing", "Company")
    Plant = apps.get_model("manufacturing", "Plant")

    company = Company.objects.order_by("id").first()
    if company is None:
        company = Company.objects.create(code="DEFAULT", name="Default Company", status="ACTIVE")

    Plant.objects.filter(company_id__isnull=True).update(company_id=company.id)


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0027_department_plant"),
    ]

    operations = [
        migrations.AddField(
            model_name="plant",
            name="company",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="plants",
                to="manufacturing.company",
            ),
        ),
        migrations.RunPython(assign_plant_companies, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="plant",
            name="company",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="plants",
                to="manufacturing.company",
            ),
        ),
        migrations.AlterField(
            model_name="plant",
            name="code",
            field=models.CharField(max_length=50),
        ),
        migrations.AddConstraint(
            model_name="plant",
            constraint=models.UniqueConstraint(fields=("company", "code"), name="uq_plant_company_code"),
        ),
    ]
