from manufacturing.models import Plant, ProductionLine, Department, ResourceGroup, Resource
from django.core.cache import cache


COUNTS_CACHE_KEY = "manufacturing:structure_counts:v1"
HEALTH_CACHE_KEY = "manufacturing:system_health:v1"
CACHE_TTL_SECONDS = 30


def get_structure_counts():
    """Get counts for all entity types."""
    cached = cache.get(COUNTS_CACHE_KEY)
    if cached is not None:
        return cached

    result = {
        "plants": Plant.objects.count(),
        "lines": ProductionLine.objects.count(),
        "depts": Department.objects.count(),
        "groups": ResourceGroup.objects.count(),
        "resources": Resource.objects.count(),
        "active_lines": ProductionLine.objects.filter(status="ACTIVE").count(),
    }

    cache.set(COUNTS_CACHE_KEY, result, CACHE_TTL_SECONDS)
    return result


def get_system_health():
    """Get system health indicators."""
    cached = cache.get(HEALTH_CACHE_KEY)
    if cached is not None:
        return cached

    result = {
        "running_lines": ProductionLine.objects.filter(status="ACTIVE").count(),
        "resources_down": 0,
        "high_utilization_resources": 0,
    }

    cache.set(HEALTH_CACHE_KEY, result, CACHE_TTL_SECONDS)
    return result
