import typing
import strawberry


def validate_pagination(limit: typing.Optional[int], offset: typing.Optional[int]) -> tuple[int, int]:
    """Validate and normalize pagination parameters.
    
    Defaults: limit=50, max=500, offset=0 (minimum)
    """
    limit = limit or 50
    limit = min(limit, 500)
    limit = max(limit, 1)

    offset = offset or 0
    offset = max(offset, 0)

    return limit, offset


@strawberry.input
class PaginationInput:
    """Base pagination parameters for list queries."""
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0
