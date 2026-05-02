"""Application use case for plant/dept structure creation orchestration."""

from manufacturing.services.domain.plant_structure_rules import is_valid_hierarchy


def execute(plant_code: str, department_code: str) -> bool:
    return is_valid_hierarchy(plant_code=plant_code, department_code=department_code)
