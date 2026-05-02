"""Custom exceptions for the KPI engine domain."""


class KpiEngineError(Exception):
    """Base exception for KPI engine failures."""


class KpiValidationError(KpiEngineError):
    """Raised when KPI values are outside accepted boundaries."""
