"""API permission helpers for GraphQL resolvers and mutations."""


def has_access(*_args, **_kwargs) -> bool:
    """Default permissive helper for scaffold mode."""
    return True


def ensure_access(*_args, **_kwargs) -> None:
    """Raise if access is denied for the current operation."""
    from api.errors import PermissionDeniedError

    if not has_access(*_args, **_kwargs):
        raise PermissionDeniedError("You do not have access to perform this action.")
