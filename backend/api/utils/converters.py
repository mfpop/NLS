"""Shared converter utilities for GraphQL type mapping.

Used across all GraphQL domain modules to keep resolver code thin.
"""

import typing
from datetime import datetime

from manufacturing.models import ReferenceValue


def iso_format(dt: typing.Optional[datetime]) -> str:
    """Format a datetime to ISO string, returning empty string for None."""
    return dt.isoformat() if dt else ""


def _iso(dt: typing.Optional[datetime]) -> str:
    """Alias for iso_format — consistent with existing codebase convention."""
    return iso_format(dt)


def resolve_ref(ref_id: typing.Optional[str]) -> typing.Optional[ReferenceValue]:
    """Resolve a reference value by ID, returning None if not found."""
    if not ref_id:
        return None
    try:
        return ReferenceValue.objects.get(id=ref_id)
    except ReferenceValue.DoesNotExist:
        return None


def ref_val(obj) -> typing.Any:
    """Convert a ReferenceValue model to its GraphQL node, handling None.

    Uses lazy import to avoid circular dependencies.
    """
    if obj is None:
        return None
    # Avoid circular import by importing here
    from api.types.manufacturing import ReferenceValueNode as _RefValNode
    return _RefValNode.from_db(obj)


def parse_dt(value: typing.Optional[str]) -> typing.Optional[datetime]:
    """Parse an ISO datetime string, returning None if empty/invalid."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None
