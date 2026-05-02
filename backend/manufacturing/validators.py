"""Validation helpers for the manufacturing domain."""

from manufacturing.exceptions import ManufacturingValidationError


def validate_hierarchy_name(name: str, field_name: str = "name") -> str:
    normalized = name.strip()
    if not normalized:
        raise ManufacturingValidationError(f"{field_name} must not be empty")
    return normalized
