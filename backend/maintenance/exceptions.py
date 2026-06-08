"""Custom exceptions for the maintenance domain."""


class MaintenanceError(Exception):
    """Base exception for maintenance-related failures."""


class MaintenanceValidationError(MaintenanceError):
    """Raised when maintenance domain validation fails."""


class InvalidTargetError(MaintenanceValidationError):
    """Raised when an invalid target_type is provided."""


class InvalidStatusTransitionError(MaintenanceValidationError):
    """Raised when an invalid status transition is attempted."""


class WorkOrderNotFoundError(MaintenanceError):
    """Raised when a work order is not found."""


class PreventiveMaintenanceNotFoundError(MaintenanceError):
    """Raised when a PM plan is not found."""


class BreakdownNotFoundError(MaintenanceError):
    """Raised when a breakdown is not found."""


class SparePartNotFoundError(MaintenanceError):
    """Raised when a spare part is not found."""


class SparePartUsageNotFoundError(MaintenanceError):
    """Raised when a spare part usage record is not found."""
