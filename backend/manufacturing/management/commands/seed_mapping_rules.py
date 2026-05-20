from django.core.management.base import BaseCommand
from manufacturing.models import MappingRule

PLANT_STRUCTURE_RULES = [
    # Company
    {"source_field": "Company", "destination_field": "company.code", "is_required": True},
    {"source_field": "company_code", "destination_field": "company.code", "is_required": True},
    {"source_field": "company name", "destination_field": "company.name", "is_required": False},
    {"source_field": "company_name", "destination_field": "company.name", "is_required": False},
    {"source_field": "CompanyName", "destination_field": "company.name", "is_required": False},

    # Plant
    {"source_field": "Plant", "destination_field": "plant.code", "is_required": True},
    {"source_field": "plant_code", "destination_field": "plant.code", "is_required": True},
    {"source_field": "plant code", "destination_field": "plant.code", "is_required": True},
    {"source_field": "PlantCode", "destination_field": "plant.code", "is_required": True},
    {"source_field": "PlantName", "destination_field": "plant.name", "is_required": False},
    {"source_field": "plant name", "destination_field": "plant.name", "is_required": False},
    {"source_field": "plant_name", "destination_field": "plant.name", "is_required": False},

    # Resource Group
    {"source_field": "ResourceGrpID", "destination_field": "resourceGroup.code", "is_required": True},
    {"source_field": "resource group id", "destination_field": "resourceGroup.code", "is_required": True},
    {"source_field": "resource_group_id", "destination_field": "resourceGroup.code", "is_required": True},
    {"source_field": "ResourceGroupID", "destination_field": "resourceGroup.code", "is_required": True},
    {"source_field": "ResourceGroupId", "destination_field": "resourceGroup.code", "is_required": True},
    {"source_field": "DescriptionGrpID", "destination_field": "resourceGroup.name", "is_required": False},
    {"source_field": "ResourceGrpName", "destination_field": "resourceGroup.name", "is_required": False},
    {"source_field": "resource group name", "destination_field": "resourceGroup.name", "is_required": False},
    {"source_field": "resource_group_name", "destination_field": "resourceGroup.name", "is_required": False},

    # Resource
    {"source_field": "ResourceID", "destination_field": "resource.code", "is_required": True},
    {"source_field": "resource id", "destination_field": "resource.code", "is_required": True},
    {"source_field": "resource_id", "destination_field": "resource.code", "is_required": True},
    {"source_field": "ResourceCode", "destination_field": "resource.code", "is_required": True},
    {"source_field": "ResourceName", "destination_field": "resource.name", "is_required": False},
    {"source_field": "Description", "destination_field": "resource.name", "is_required": True},
    {"source_field": "description", "destination_field": "resource.name", "is_required": True},
    {"source_field": "ResourceDesc", "destination_field": "resource.name", "is_required": False},
    {"source_field": "resource_name", "destination_field": "resource.name", "is_required": False},
    {"source_field": "resource description", "destination_field": "resource.name", "is_required": False},
    {"source_field": "resource_description", "destination_field": "resource.name", "is_required": False},

    # Department
    {"source_field": "Department", "destination_field": "department.code", "is_required": True},
    {"source_field": "department_code", "destination_field": "department.code", "is_required": True},
    {"source_field": "department code", "destination_field": "department.code", "is_required": True},
    {"source_field": "DepartmentCode", "destination_field": "department.code", "is_required": True},
    {"source_field": "DepartmentName", "destination_field": "department.name", "is_required": False},
    {"source_field": "department name", "destination_field": "department.name", "is_required": False},
    {"source_field": "department_name", "destination_field": "department.name", "is_required": False},

    # Production Line
    {"source_field": "ProductionLine", "destination_field": "productionLine.code", "is_required": False},
    {"source_field": "LineCode", "destination_field": "productionLine.code", "is_required": False},
    {"source_field": "line_code", "destination_field": "productionLine.code", "is_required": False},
    {"source_field": "line code", "destination_field": "productionLine.code", "is_required": False},
    {"source_field": "LineName", "destination_field": "productionLine.name", "is_required": False},
    {"source_field": "line_name", "destination_field": "productionLine.name", "is_required": False},

    # Calendar/Schedule
    {"source_field": "CalendarGrpID", "destination_field": "schedule.code", "is_required": False},
    {"source_field": "CalendarID", "destination_field": "schedule.code", "is_required": False},
    {"source_field": "calendar_id", "destination_field": "schedule.code", "is_required": False},

    # Material flow / bins
    {"source_field": "Input Bin", "destination_field": "sourceBin.code", "is_required": False},
    {"source_field": "input_bin", "destination_field": "sourceBin.code", "is_required": False},
    {"source_field": "input bin", "destination_field": "sourceBin.code", "is_required": False},
    {"source_field": "InputBin", "destination_field": "sourceBin.code", "is_required": False},
    {"source_field": "Output Bin", "destination_field": "destinationBin.code", "is_required": False},
    {"source_field": "output_bin", "destination_field": "destinationBin.code", "is_required": False},
    {"source_field": "output bin", "destination_field": "destinationBin.code", "is_required": False},
    {"source_field": "OutputBin", "destination_field": "destinationBin.code", "is_required": False},
    {"source_field": "Backflush Bin", "destination_field": "backflushBin.code", "is_required": False},
    {"source_field": "backflush_bin", "destination_field": "backflushBin.code", "is_required": False},

    # Routing
    {"source_field": "OpCode", "destination_field": "routingStep.operationCode", "is_required": False},
    {"source_field": "op_code", "destination_field": "routingStep.operationCode", "is_required": False},
    {"source_field": "OperationCode", "destination_field": "routingStep.operationCode", "is_required": False},
    {"source_field": "Operation Description", "destination_field": "routingStep.description", "is_required": False},
    {"source_field": "operation_description", "destination_field": "routingStep.description", "is_required": False},
    {"source_field": "Move Hours", "destination_field": "routingStep.moveHours", "is_required": False},
    {"source_field": "move_hours", "destination_field": "routingStep.moveHours", "is_required": False},
    {"source_field": "Queue Hours", "destination_field": "routingStep.queueHours", "is_required": False},
    {"source_field": "queue_hours", "destination_field": "routingStep.queueHours", "is_required": False},

    # Status
    {"source_field": "Status", "destination_field": "entity.status", "is_required": False},
    {"source_field": "status", "destination_field": "entity.status", "is_required": False},
]


def _normalize(name: str) -> str:
    return name.strip().lower().replace(" ", "").replace("_", "").replace("-", "")


def get_normalized_rules() -> dict[str, list[dict]]:
    norm: dict[str, list[dict]] = {}
    for rule in PLANT_STRUCTURE_RULES:
        key = _normalize(rule["source_field"])
        if key not in norm:
            norm[key] = []
        norm[key].append(rule)
    return norm


NORMALIZED_RULES = get_normalized_rules()


def find_matching_rule(column_name: str) -> list[dict] | None:
    key = _normalize(column_name)
    return NORMALIZED_RULES.get(key)


class Command(BaseCommand):
    help = "Seed PLANT_STRUCTURE mapping rules"

    def handle(self, *args, **options):
        domain = "PLANT_STRUCTURE"
        created = 0
        skipped = 0
        for rule in PLANT_STRUCTURE_RULES:
            exists = MappingRule.objects.filter(
                domain=domain,
                source_field__iexact=rule["source_field"],
                destination_field=rule["destination_field"],
            ).exists()
            if not exists:
                MappingRule.objects.create(
                    domain=domain,
                    source_field=rule["source_field"],
                    destination_field=rule["destination_field"],
                    is_required=rule.get("is_required", False),
                    is_active=True,
                )
                created += 1
            else:
                skipped += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} mapping rules ({skipped} skipped)"))
