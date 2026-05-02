"""API-level validators shared by GraphQL schema modules."""


def validate_payload(_payload) -> None:
    """Default payload validator for extension points."""
    return None


def require_non_empty(value: str, field_name: str) -> str:
    """Ensure text fields are not empty after trimming."""
    from api.errors import ValidationError

    normalized = value.strip()
    if not normalized:
        raise ValidationError(f"{field_name} must not be empty.")
    return normalized
