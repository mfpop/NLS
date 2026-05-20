from dataclasses import dataclass, field


@dataclass
class DomainValidationError:
    field: str
    code: str
    message: str


def validate_plant_input(code: str, name: str) -> list[DomainValidationError]:
    errors: list[DomainValidationError] = []
    if not code or not code.strip():
        errors.append(DomainValidationError(field="code", code="REQUIRED", message="Plant code is required"))
    if not name or not name.strip():
        errors.append(DomainValidationError(field="name", code="REQUIRED", message="Plant name is required"))
    return errors
