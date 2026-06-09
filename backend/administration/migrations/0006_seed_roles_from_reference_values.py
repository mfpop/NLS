from django.db import migrations


def seed_roles_from_reference_values(apps, schema_editor):
    Role = apps.get_model("administration", "Role")
    ReferenceCategory = apps.get_model("manufacturing", "ReferenceCategory")
    ReferenceValue = apps.get_model("manufacturing", "ReferenceValue")

    try:
        role_category = ReferenceCategory.objects.get(code="role")
    except ReferenceCategory.DoesNotExist:
        return

    role_values = ReferenceValue.objects.filter(category=role_category, is_active=True).order_by("sort_order", "name")

    for value in role_values:
        Role.objects.get_or_create(
            code=value.code,
            defaults={
                "name": value.name,
                "description": value.description or "",
                "is_system_role": False,
                "is_active": True,
            },
        )


def noop_reverse(apps, schema_editor):
    # Keep seeded roles to avoid deleting user-managed role assignments.
    return


class Migration(migrations.Migration):
    dependencies = [
        ("administration", "0005_default_viewer_role"),
        ("manufacturing", "0073_audit_control_area"),
    ]

    operations = [
        migrations.RunPython(seed_roles_from_reference_values, noop_reverse),
    ]
