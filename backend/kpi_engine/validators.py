"""Validation helpers for the KPI engine domain."""

from kpi_engine.exceptions import KpiValidationError


def validate_ratio(value: float, field_name: str) -> float:
    if value < 0 or value > 1:
        raise KpiValidationError(f"{field_name} must be between 0 and 1")
    return value
