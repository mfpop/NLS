"""Custom exceptions for the execution domain."""


class ExecutionError(Exception):
    """Base exception for execution-related failures."""


class ExecutionValidationError(ExecutionError):
    """Raised when execution data is invalid."""


class InvalidStatusTransitionError(ExecutionValidationError):
    """Raised when an invalid status transition is attempted."""


# ── Gemba exceptions ──

class GembaSessionNotFoundError(ExecutionError):
    """Raised when a Gemba Walk session is not found."""


class GembaObservationNotFoundError(ExecutionError):
    """Raised when a Gemba observation is not found."""


class GembaSessionAlreadyActiveError(ExecutionValidationError):
    """Raised when an active session already exists for line+shift+date."""


class GembaSessionCompletedError(ExecutionValidationError):
    """Raised when trying to modify a completed or cancelled session."""


class GembaObservationAlreadyConvertedError(ExecutionValidationError):
    """Raised when trying to convert an already-converted observation."""


class GembaValidationError(ExecutionValidationError):
    """Raised when Gemba domain validation fails."""


class GembaPermissionError(ExecutionError):
    """Raised when user lacks permission for Gemba actions."""
