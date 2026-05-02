"""Custom exceptions for the execution domain."""


class ExecutionError(Exception):
    """Base exception for execution-related failures."""


class ExecutionValidationError(ExecutionError):
    """Raised when execution data is invalid."""
