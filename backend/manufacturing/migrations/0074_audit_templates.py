from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("manufacturing", "0073_audit_control_area"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=50, unique=True)),
                ("name", models.CharField(max_length=200)),
                ("audit_type", models.CharField(max_length=50, choices=[
                    ("FIVE_S", "5S"), ("SAFETY", "Safety"), ("QUALITY", "Quality"),
                    ("PROCESS_CHECK", "Process Check"), ("STANDARD_WORK_CHECK", "Standard Work Check"),
                ])),
                ("version", models.IntegerField(default=1)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "db_table": "manufacturing_audit_template",
                "verbose_name": "Audit Template",
                "verbose_name_plural": "Audit Templates",
            },
        ),
        migrations.CreateModel(
            name="AuditTemplateCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=50)),
                ("name", models.CharField(max_length=200)),
                ("sequence", models.IntegerField(default=0)),
                ("is_required", models.BooleanField(default=True)),
                ("template", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="categories", to="manufacturing.audittemplate")),
            ],
            options={
                "db_table": "manufacturing_audit_template_category",
                "verbose_name": "Audit Template Category",
                "verbose_name_plural": "Audit Template Categories",
                "ordering": ["template", "sequence"],
                "unique_together": {("template", "code")},
            },
        ),
        migrations.CreateModel(
            name="AuditTemplateQuestion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=50)),
                ("question", models.CharField(max_length=1000)),
                ("sequence", models.IntegerField(default=0)),
                ("max_score", models.IntegerField(default=5)),
                ("allow_na", models.BooleanField(default=True)),
                ("is_active", models.BooleanField(default=True)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="questions", to="manufacturing.audittemplatecategory")),
            ],
            options={
                "db_table": "manufacturing_audit_template_question",
                "verbose_name": "Audit Template Question",
                "verbose_name_plural": "Audit Template Questions",
                "ordering": ["category", "sequence"],
                "unique_together": {("category", "code")},
            },
        ),
        migrations.AddField(
            model_name="auditchecklistitem",
            name="template_question",
            field=models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name="checklist_items", to="manufacturing.audittemplatequestion"),
        ),
        migrations.AddField(
            model_name="auditchecklistitem",
            name="score",
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="auditchecklistitem",
            name="is_na",
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name="auditchecklistitem",
            index=models.Index(fields=["audit", "template_question"], name="mfg_aci_tq_idx"),
        ),
    ]
