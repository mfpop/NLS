"""Custom exceptions for the check domain."""


class CheckError(Exception):
    """Base exception for check-related failures."""


class CheckValidationError(CheckError):
    """Raised when check domain validation fails."""


class InvalidTargetError(CheckValidationError):
    """Raised when an invalid target_type is provided."""


class InvalidStatusTransitionError(CheckValidationError):
    """Raised when an invalid status transition is attempted."""


class ProblemNotFoundError(CheckError):
    """Raised when a problem is not found."""


class ActionNotFoundError(CheckError):
    """Raised when an action is not found."""


class ProductionCheckNotFoundError(CheckError):
    """Raised when a production check is not found."""


class QualityCheckNotFoundError(CheckError):
    """Raised when a quality check is not found."""


class DMRNotFoundError(CheckError):
    """Raised when a DMR is not found."""


class RMANotFoundError(CheckError):
    """Raised when an RMA is not found."""


class SafetyCheckNotFoundError(CheckError):
    """Raised when a safety check is not found."""


class SafetyIncidentNotFoundError(CheckError):
    """Raised when a safety incident is not found."""


class MaterialCheckNotFoundError(CheckError):
    """Raised when a material check is not found."""


class MaterialIssueNotFoundError(CheckError):
    """Raised when a material issue is not found."""
