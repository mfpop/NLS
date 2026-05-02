"""Validation helpers for the execution domain."""

from execution.exceptions import ExecutionValidationError


def validate_quantity(quantity: int) -> int:
    if quantity <= 0:
        raise ExecutionValidationError("quantity must be > 0")
    return quantity
