from manufacturing.models import Plant, ProductionLine, Department, ResourceGroup, Resource


def get_structure_counts():
    """Get counts for all entity types."""
    return {
        "plants": Plant.objects.count(),
        "lines": ProductionLine.objects.count(),
        "depts": Department.objects.count(),
        "groups": ResourceGroup.objects.count(),
        "resources": Resource.objects.count(),
        "active_lines": ProductionLine.objects.filter(status="ACTIVE").count(),
    }


def get_system_health():
    """Get system health indicators."""
    return {
        "running_lines": ProductionLine.objects.filter(status="ACTIVE").count(),
        "resources_down": 0,
        "high_utilization_resources": 0,
    }
