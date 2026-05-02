"""Domain rules for manufacturing plant hierarchy integrity."""


def is_valid_hierarchy(plant_code: str, department_code: str) -> bool:
    return bool(plant_code.strip()) and bool(department_code.strip())
