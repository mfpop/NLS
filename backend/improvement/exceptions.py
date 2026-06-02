"""Custom exceptions for the improvement domain."""


class ImprovementError(Exception):
    """Base exception for improvement-related failures."""


class ImprovementValidationError(ImprovementError):
    """Raised when improvement domain validation fails."""


class InvalidTargetError(ImprovementValidationError):
    """Raised when an invalid target_type is provided."""


class InvalidStatusTransitionError(ImprovementValidationError):
    """Raised when an invalid status transition is attempted."""


class SuggestionNotFoundError(ImprovementError):
    """Raised when a suggestion is not found."""


class KaizenNotFoundError(ImprovementError):
    """Raised when a kaizen is not found."""


class KaizenActionNotFoundError(ImprovementError):
    """Raised when a kaizen action is not found."""


class A3PDCANotFoundError(ImprovementError):
    """Raised when an A3/PDCA record is not found."""


class A3PDCAActionNotFoundError(ImprovementError):
    """Raised when an A3/PDCA action is not found."""


class KaizenAlreadyCompletedError(ImprovementValidationError):
    """Raised when trying to modify a completed or cancelled kaizen."""


class MERNotFoundError(ImprovementError):
    """Raised when a manufacturing engineering request is not found."""


class MERAlreadyCompletedError(ImprovementValidationError):
    """Raised when trying to modify a completed or cancelled MER."""
