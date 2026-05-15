"""Compatibility wrapper — delegates to StructureService."""

from manufacturing.domain.structure_service import StructureService, StructureServiceError


def is_valid_hierarchy(plant_code: str, department_code: str) -> bool:
    return bool(plant_code.strip()) and bool(department_code.strip())
