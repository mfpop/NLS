"""Custom exceptions for the improvement domain."""


class ImprovementError(Exception):
    """Base exception for improvement-related failures."""


class ImprovementValidationError(ImprovementError):
    """Raised when improvement domain validation fails."""
