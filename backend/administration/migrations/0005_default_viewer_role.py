from django.db import migrations, models


def create_default_role(apps, schema_editor):
    Role = apps.get_model("administration", "Role")
    Permission = apps.get_model("administration", "Permission")
    RolePermission = apps.get_model("administration", "RolePermission")

    role, _ = Role.objects.get_or_create(
        code="viewer",
        defaults={
            "name": "Viewer",
            "description": "Default read-only access for all users.",
            "is_system_role": True,
            "is_active": True,
        },
    )

    default_permissions = [
        ("view_admin_departments", "View Administrative Departments", "administration", "view"),
        ("view_user_profiles", "View User Profiles", "administration", "view"),
        ("view_roles", "View Roles", "administration", "view"),
        ("view_permissions", "View Permissions", "administration", "view"),
    ]

    for code, name, module, action in default_permissions:
        perm, _ = Permission.objects.get_or_create(
            code=code,
            defaults={"name": name, "module": module, "action": action, "description": f"Allows viewing {name.lower()}.", "is_active": True},
        )
        RolePermission.objects.get_or_create(role=role, permission=perm)


def reverse_default_role(apps, schema_editor):
    Role = apps.get_model("administration", "Role")
    Permission = apps.get_model("administration", "Permission")
    RolePermission = apps.get_model("administration", "RolePermission")

    RolePermission.objects.filter(role__code="viewer").delete()
    Permission.objects.filter(code__in=["view_admin_departments", "view_user_profiles", "view_roles", "view_permissions"]).delete()
    Role.objects.filter(code="viewer").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("administration", "0004_switch_dept_fk_to_reference_value"),
    ]

    operations = [
        migrations.RunPython(create_default_role, reverse_default_role),
    ]
