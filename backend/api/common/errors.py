import typing
import strawberry


@strawberry.type
class MutationError:
    """Standard mutation error type used across all GraphQL domains."""
    field: typing.Optional[str]
    code: str
    message: str
    details: typing.Optional[str] = None
