from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('manufacturing', '0013_productmodel_referencecategory_resourcetype_schedule_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='plant',
            name='city',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='plant',
            name='state',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='plant',
            name='country',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
    ]
