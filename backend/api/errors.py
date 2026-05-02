"""API-level error classes for GraphQL operations."""


class ApiError(Exception):
    """Base API error for GraphQL-facing failures."""


class ValidationError(ApiError):
    """Raised when GraphQL payload validation fails."""


class PermissionDeniedError(ApiError):
    """Raised when the caller does not have permission to execute an action."""
