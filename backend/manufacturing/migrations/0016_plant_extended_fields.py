from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('manufacturing', '0015_company_city_state_country'),
    ]

    operations = [
        migrations.AddField(model_name='plant', name='zipcode', field=models.CharField(blank=True, default='', max_length=20)),
        migrations.AddField(model_name='plant', name='latitude', field=models.CharField(blank=True, default='', max_length=50)),
        migrations.AddField(model_name='plant', name='longitude', field=models.CharField(blank=True, default='', max_length=50)),
        migrations.AddField(model_name='plant', name='plant_type', field=models.CharField(blank=True, default='', max_length=100)),
        migrations.AddField(model_name='plant', name='operating_since', field=models.CharField(blank=True, default='', max_length=50)),
        migrations.AddField(model_name='plant', name='manager_phone', field=models.CharField(blank=True, default='', max_length=50)),
        migrations.AddField(model_name='plant', name='default_calendar', field=models.CharField(blank=True, default='', max_length=200)),
        migrations.AddField(model_name='plant', name='default_shift_model', field=models.CharField(blank=True, default='', max_length=200)),
        migrations.AddField(model_name='plant', name='week_start_day', field=models.CharField(blank=True, default='', max_length=50)),
        migrations.AddField(model_name='plant', name='default_schedule', field=models.CharField(blank=True, default='', max_length=200)),
        migrations.AddField(model_name='plant', name='manufacturing_focus', field=models.TextField(blank=True, default='')),
    ]
