from django.db import migrations


def seed_patterns(apps, schema_editor):
    ErpImportPattern = apps.get_model("manufacturing", "ErpImportPattern")
    ErpImportPatternFieldMapping = apps.get_model("manufacturing", "ErpImportPatternFieldMapping")

    # ── ResourceGroup Pattern ──
    rg_pattern, _ = ErpImportPattern.objects.get_or_create(
        name="ResourceGroup Import",
        defaults={
            "description": "Import resource groups from Excel",
            "scope": "PLANT_STRUCTURE",
            "destination_entity": "ResourceGroup",
            "source_file_pattern": "ResourceGroup*.xlsx",
        },
    )
    rg_fields = [
        ("ResourceGroupCode", "string", "resourceGroup.code", "string", True, 0),
        ("ResourceGroupName", "string", "resourceGroup.name", "string", True, 1),
        ("DepartmentCode", "string", "department.code", "string", True, 2),
        ("LeaderName", "string", "resourceGroup.leader", "string", False, 3),
        ("SupervisorName", "string", "resourceGroup.supervisor", "string", False, 4),
        ("MemberCount", "string", "resourceGroup.members", "number", False, 5),
        ("GroupType", "string", "resourceGroup.groupType", "string", False, 6),
        ("CapabilityType", "string", "resourceGroup.capabilityType", "string", False, 7),
        ("ShiftPatternCode", "string", "resourceGroup.shiftPattern", "string", False, 8),
        ("CapacityModel", "string", "resourceGroup.capacityModel", "string", False, 9),
        ("OeeTarget", "string", "resourceGroup.oeeTarget", "number", False, 10),
        ("IsBottleneck", "string", "resourceGroup.isBottleneck", "boolean", False, 11),
        ("IsConstraint", "string", "resourceGroup.isConstraint", "boolean", False, 12),
        ("OperationCode", "string", "resourceGroup.operationCode", "string", False, 13),
        ("StatusCode", "string", "resourceGroup.status", "string", False, 14),
    ]
    for i, (src_name, src_type, dest_name, dest_type, required, order) in enumerate(rg_fields):
        ErpImportPatternFieldMapping.objects.get_or_create(
            pattern=rg_pattern,
            source_name=src_name,
            defaults={
                "source_data_type": src_type,
                "destination_name": dest_name,
                "destination_data_type": dest_type,
                "is_required": required,
                "sort_order": order,
            },
        )

    # ── Resource Pattern ──
    res_pattern, _ = ErpImportPattern.objects.get_or_create(
        name="Resource Import",
        defaults={
            "description": "Import resources from Excel",
            "scope": "PLANT_STRUCTURE",
            "destination_entity": "Resource",
            "source_file_pattern": "Resources*.xlsx",
        },
    )
    res_fields = [
        ("ResourceCode", "string", "resource.code", "string", True, 0),
        ("ResourceName", "string", "resource.name", "string", True, 1),
        ("ResourceGroupCode", "string", "resourceGroup.code", "string", True, 2),
        ("ResourceType", "string", "resource.resourceType", "string", False, 3),
        ("StatusCode", "string", "resource.status", "string", False, 4),
        ("CalendarCode", "string", "resource.calendarCode", "string", False, 5),
        ("Capacity", "string", "resource.capacity", "number", False, 6),
        ("OperatorType", "string", "resource.operatorType", "string", False, 7),
        ("Description", "string", "resource.description", "string", False, 8),
    ]
    for i, (src_name, src_type, dest_name, dest_type, required, order) in enumerate(res_fields):
        ErpImportPatternFieldMapping.objects.get_or_create(
            pattern=res_pattern,
            source_name=src_name,
            defaults={
                "source_data_type": src_type,
                "destination_name": dest_name,
                "destination_data_type": dest_type,
                "is_required": required,
                "sort_order": order,
            },
        )


def reverse_patterns(apps, schema_editor):
    ErpImportPattern = apps.get_model("manufacturing", "ErpImportPattern")
    ErpImportPattern.objects.filter(name__in=["ResourceGroup Import", "Resource Import"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("manufacturing", "0062_erpimportpattern_department_selection_and_more"),
    ]
    operations = [
        migrations.RunPython(seed_patterns, reverse_patterns),
    ]
