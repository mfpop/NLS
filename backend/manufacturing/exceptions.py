"""Custom exceptions for the manufacturing domain."""


class ManufacturingError(Exception):
    """Base exception for manufacturing-related failures."""


class ManufacturingValidationError(ManufacturingError):
    """Raised when manufacturing validation rules are violated."""
