"""Shared mutation payload helpers for GraphQL responses.

All domain mutation payloads should use these base types for consistency.
"""

import typing
import strawberry

from api.common.errors import MutationError


@strawberry.type
class BasePayload:
    """Minimal mutation return type with ok flag and optional errors."""
    ok: bool = True
    errors: typing.Optional[list[MutationError]] = None
