"""Validation helpers for the improvement domain."""

from improvement.exceptions import ImprovementValidationError


def validate_kaizen_title(title: str) -> str:
    normalized = title.strip()
    if not normalized:
        raise ImprovementValidationError("title must not be empty")
    return normalized
