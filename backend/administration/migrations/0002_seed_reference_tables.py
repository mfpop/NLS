from django.db import migrations


ADMIN_DEPARTMENTS = [
    ("production_control", "Production Control", "Manufacturing execution, scheduling, and shop floor coordination."),
    ("quality", "Quality", "Inspection, testing, audits, and quality systems (QMS)."),
    ("maintenance", "Maintenance", "Equipment reliability, TPM, and facility maintenance."),
    ("logistics", "Logistics", "Material flow, warehousing, inventory, and supply chain."),
    ("engineering", "Engineering", "Process improvement, industrial engineering, and project management."),
    ("lean_ci", "Lean / Continuous Improvement", "Kaizen, VSM, 5S, standard work, and CI culture."),
    ("safety_ehs", "Safety / EHS", "Environmental, health, and safety programs and compliance."),
    ("hr", "Human Resources", "Staffing, training, development, and employee relations."),
    ("finance", "Finance", "Costing, budgeting, and financial controls."),
    ("it", "Information Technology", "Systems, applications, and digital infrastructure."),
    ("procurement", "Procurement", "Supplier management, purchasing, and material sourcing."),
    ("engineering_rnd", "R&D / Product Development", "New product introduction, design, and prototyping."),
    ("plant_management", "Plant Management", "Plant leadership, strategy, and general management."),
    ("warehouse", "Warehouse", "Finished goods, raw material storage, and inventory accuracy."),
    ("shipping_receiving", "Shipping / Receiving", "Inbound and outbound material handling and documentation."),
]


def seed_admin_departments(apps, schema_editor):
    ReferenceCategory = apps.get_model("manufacturing", "ReferenceCategory")
    ReferenceValue = apps.get_model("manufacturing", "ReferenceValue")

    cat, _ = ReferenceCategory.objects.get_or_create(
        code="admin_department",
        defaults={"name": "Administrative Department", "description": "Departments for user organization and access scoping."},
    )

    for i, (code, name, desc) in enumerate(ADMIN_DEPARTMENTS):
        ReferenceValue.objects.get_or_create(
            category=cat,
            code=code,
            defaults={
                "name": name,
                "description": desc,
                "usage_context": "Used for user organization and administrative department scoping.",
                "sort_order": i + 1,
                "is_active": True,
                "is_system_managed": False,
                "is_configurable": True,
            },
        )


def reverse_seed(apps, schema_editor):
    ReferenceCategory = apps.get_model("manufacturing", "ReferenceCategory")
    ReferenceValue = apps.get_model("manufacturing", "ReferenceValue")
    try:
        cat = ReferenceCategory.objects.get(code="admin_department")
        ReferenceValue.objects.filter(category=cat).delete()
        cat.delete()
    except ReferenceCategory.DoesNotExist:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ("administration", "0001_initial"),
        ("manufacturing", "0073_audit_control_area"),
    ]

    operations = [
        migrations.RunPython(seed_admin_departments, reverse_seed),
    ]
