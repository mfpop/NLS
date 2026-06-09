"""Utilities for converting domain service results into GraphQL responses.

Reduces boilerplate in mutation resolvers by providing consistent
error-to-payload conversion.
"""

import typing
import json
from django.core.exceptions import ValidationError as DjangoValidationError

from api.common.errors import MutationError


def service_error_to_mutation_errors(
    exc: Exception,
    default_field: str = "_form",
) -> list[MutationError]:
    """Convert a domain service exception into a list of MutationError.

    Supports:
    - ValidationError (Django) — field-level messages
    - Structured errors with .field, .code, .message attributes
    - Plain Exception — generic error
    """
    if hasattr(exc, "field") and hasattr(exc, "code") and hasattr(exc, "message"):
        details = getattr(exc, "details", None)
        detail_str = json.dumps(details) if details and isinstance(details, (dict, list)) else str(details) if details else None
        return [MutationError(field=exc.field, code=exc.code, message=exc.message, details=detail_str)]

    if isinstance(exc, DjangoValidationError):
        msgs = exc.messages if hasattr(exc, "messages") else [str(exc)]
        return [MutationError(field=default_field, code="VALIDATION", message="; ".join(msgs))]

    return [MutationError(field=default_field, code="ERROR", message=str(exc))]


def make_payload(payload_cls: typing.Any, ok: bool = True, errors: typing.Optional[list] = None, **kwargs):
    """Construct a standard mutation payload from a service result.

    Passes all kwargs directly to the payload class constructor.
    Example:
        return make_payload(PlantPayload, plant=plant_obj)
        return make_payload(PlantPayload, ok=False, errors=some_errors)
    """
    return payload_cls(ok=ok, errors=errors, **kwargs)
