from api.types.manufacturing import PlantInput, MutationError


def validate_plant_input(input: PlantInput) -> list[MutationError]:
    errors = []
    if not input.code or not input.code.strip():
        errors.append(MutationError(field="code", code="REQUIRED", message="Plant code is required"))
    if not input.name or not input.name.strip():
        errors.append(MutationError(field="name", code="REQUIRED", message="Plant name is required"))
    return errors
