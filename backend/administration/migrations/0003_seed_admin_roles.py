from django.db import migrations, models


ADMIN_ROLES = [
    # HR
    ("hr_manager", "HR Manager", "Oversees HR operations, policies, and employee relations."),
    ("hr_generalist", "HR Generalist", "Supports recruitment, onboarding, and employee administration."),
    ("training_coordinator", "Training Coordinator", "Manages training programs, certifications, and skill matrices."),
    # Finance
    ("finance_manager", "Finance Manager", "Manages budgeting, costing, and financial reporting."),
    ("cost_accountant", "Cost Accountant", "Tracks production costs, variance analysis, and inventory valuation."),
    ("accounts_payable", "Accounts Payable", "Processes vendor invoices and payment runs."),
    # IT
    ("it_manager", "IT Manager", "Oversees IT infrastructure, systems, and support."),
    ("system_administrator", "System Administrator", "Manages servers, networks, and system security."),
    ("application_support", "Application Support", "Supports MES, ERP, and manufacturing applications."),
    # Procurement
    ("procurement_manager", "Procurement Manager", "Manages supplier relationships and purchasing strategy."),
    ("buyer", "Buyer / Purchasing Agent", "Executes purchase orders and material sourcing."),
    ("supplier_quality", "Supplier Quality Engineer", "Audits and develops supplier quality performance."),
    # Safety / EHS
    ("ehs_manager", "EHS Manager", "Leads environmental, health, and safety programs."),
    ("safety_technician", "Safety Technician", "Conducts safety inspections, audits, and incident tracking."),
    ("industrial_hygienist", "Industrial Hygienist", "Monitors workplace hazards and exposure control."),
    # Engineering (admin)
    ("project_engineer", "Project Engineer", "Leads capital projects, installations, and process improvements."),
    ("continuous_improvement_mgr", "Continuous Improvement Manager", "Drives CI culture, Kaizen, and lean transformation."),
    ("data_analyst", "Data Analyst", "Supports decision-making with KPIs, dashboards, and reporting."),
    # Plant Leadership
    ("plant_director", "Plant Director", "Senior leadership accountable for plant performance and strategy."),
    ("operations_manager", "Operations Manager", "Oversees day-to-day manufacturing operations."),
    ("shift_supervisor", "Shift Supervisor", "Supervises production shifts and frontline teams."),
    # Administration
    ("office_manager", "Office Manager", "Manages administrative services, facilities, and front desk."),
    ("executive_assistant", "Executive Assistant", "Provides administrative support to plant leadership."),
    ("document_controller", "Document Controller", "Manages documentation, records, and compliance files."),
]


def seed_admin_roles(apps, schema_editor):
    ReferenceCategory = apps.get_model("manufacturing", "ReferenceCategory")
    ReferenceValue = apps.get_model("manufacturing", "ReferenceValue")

    try:
        cat = ReferenceCategory.objects.get(code="role")
    except ReferenceCategory.DoesNotExist:
        return

    existing = set(ReferenceValue.objects.filter(category=cat).values_list("code", flat=True))
    new_roles = [(code, name, desc) for code, name, desc in ADMIN_ROLES if code not in existing]

    max_order = ReferenceValue.objects.filter(category=cat).aggregate(m=models.Max("sort_order"))["m"] or 0

    for i, (code, name, desc) in enumerate(new_roles):
        ReferenceValue.objects.get_or_create(
            category=cat,
            code=code,
            defaults={
                "name": name,
                "description": desc,
                "usage_context": "Roles / job titles for user profiles and access assignments.",
                "sort_order": max_order + i + 1,
                "is_active": True,
                "is_system_managed": False,
                "is_configurable": True,
            },
        )


def reverse_seed(apps, schema_editor):
    ReferenceCategory = apps.get_model("manufacturing", "ReferenceCategory")
    ReferenceValue = apps.get_model("manufacturing", "ReferenceValue")
    try:
        cat = ReferenceCategory.objects.get(code="role")
        ReferenceValue.objects.filter(category=cat, code__in=[code for code, _, _ in ADMIN_ROLES]).delete()
    except ReferenceCategory.DoesNotExist:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ("administration", "0002_seed_reference_tables"),
    ]

    operations = [
        migrations.RunPython(seed_admin_roles, reverse_seed),
    ]
