"""Validation helpers for the process domain."""

from process.exceptions import ProcessValidationError


def validate_version(version: int) -> int:
    if version < 1:
        raise ProcessValidationError("version must be >= 1")
    return version
