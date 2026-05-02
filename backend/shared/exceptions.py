"""Shared exceptions reused across bounded contexts."""


class SharedDomainError(Exception):
    """Base shared exception for cross-domain failures."""


class ConfigurationError(SharedDomainError):
    """Raised when required environment or app configuration is missing."""
