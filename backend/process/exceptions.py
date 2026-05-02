"""Custom exceptions for the process domain."""


class ProcessDomainError(Exception):
    """Base exception for process-domain failures."""


class ProcessValidationError(ProcessDomainError):
    """Raised when process domain validation fails."""
