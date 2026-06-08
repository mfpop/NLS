"""Validation helpers for the maintenance domain."""

from maintenance.exceptions import MaintenanceValidationError, InvalidTargetError
from maintenance.constants import APPROVED_TARGET_TYPES


def validate_non_empty(value: str, field_name: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise MaintenanceValidationError(f"{field_name} must not be empty")
    return normalized


def validate_target_type(target_type: str) -> str:
    normalized = target_type.strip()
    if normalized not in APPROVED_TARGET_TYPES:
        raise InvalidTargetError(
            f"Invalid target_type '{normalized}'. "
            f"Allowed: {', '.join(APPROVED_TARGET_TYPES)}"
        )
    return normalized
