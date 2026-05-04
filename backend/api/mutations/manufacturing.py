import strawberry
from typing import Optional

from api.permissions import ensure_access
from api.validators import require_non_empty
from api.types.manufacturing import (
    PlantInput, PlantNode, PlantMutationResult,
    DeletePlantResult, FieldError, DepartmentNode,
    ProductionLineNode, ResourceGroupNode, ResourceNode, ReferenceTableNode,
)
from manufacturing.models import (
    Plant, Department, ProductionLine,
    ResourceGroup, Resource, ReferenceTable,
)


@strawberry.type
class ManufacturingMutation:
    @strawberry.mutation
    def create_plant(self, input: PlantInput) -> PlantMutationResult:
        ensure_access(action="create_plant")
        errors = []

        if not input.name.strip():
            errors.append(FieldError(field="name", message="Plant name is required"))
        if not input.code.strip():
            errors.append(FieldError(field="code", message="Plant code is required"))
        if Plant.objects.filter(code=input.code.strip()).exists():
            errors.append(FieldError(field="code", message=f'Code "{input.code}" is already in use'))

        if errors:
            return PlantMutationResult(errors=errors)

        plant = Plant.objects.create(
            code=input.code.strip(),
            name=input.name.strip(),
            status=input.status or "active",
            building=input.building or "",
            address=input.address or "",
            timezone=input.timezone or "",
            default_calendar_id=input.default_calendar_id,
            default_schedule_id=input.default_schedule_id,
            manager_name=input.manager_name or "",
            manager_email=input.manager_email or "",
            description=input.description or "",
        )
        return PlantMutationResult(plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def update_plant(self, id: str, input: PlantInput) -> PlantMutationResult:
        ensure_access(action="update_plant")
        try:
            plant = Plant.objects.get(id=id)
        except Plant.DoesNotExist:
            return PlantMutationResult(errors=[FieldError(field="id", message="Plant not found")])

        errors = []
        if not input.name.strip():
            errors.append(FieldError(field="name", message="Plant name is required"))
        if not input.code.strip():
            errors.append(FieldError(field="code", message="Plant code is required"))
        if Plant.objects.filter(code=input.code.strip()).exclude(id=id).exists():
            errors.append(FieldError(field="code", message=f'Code "{input.code}" is already in use'))

        if errors:
            return PlantMutationResult(errors=errors)

        plant.code = input.code.strip()
        plant.name = input.name.strip()
        plant.status = input.status or plant.status
        plant.building = input.building or ""
        plant.address = input.address or ""
        plant.timezone = input.timezone or ""
        if input.default_calendar_id is not None:
            plant.default_calendar_id = input.default_calendar_id
        if input.default_schedule_id is not None:
            plant.default_schedule_id = input.default_schedule_id
        plant.manager_name = input.manager_name or ""
        plant.manager_email = input.manager_email or ""
        plant.description = input.description or ""
        plant.save()

        return PlantMutationResult(plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def toggle_plant_status(self, id: str) -> PlantMutationResult:
        ensure_access(action="toggle_plant_status")
        try:
            plant = Plant.objects.get(id=id)
        except Plant.DoesNotExist:
            return PlantMutationResult(errors=[FieldError(field="id", message="Plant not found")])

        plant.status = "inactive" if plant.status == "active" else "active"
        plant.save()
        return PlantMutationResult(plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def delete_plant(self, id: str) -> DeletePlantResult:
        ensure_access(action="delete_plant")
        try:
            plant = Plant.objects.get(id=id)
        except Plant.DoesNotExist:
            return DeletePlantResult(
                success=False, in_use=False,
                message="Plant not found",
                errors=[FieldError(field="id", message="Plant not found")]
            )

        if plant.department_count > 0 or plant.line_count > 0 or plant.group_count > 0 or plant.resource_count > 0:
            return DeletePlantResult(
                success=False, in_use=True,
                message="Plant is in use. Disable instead."
            )

        plant.delete()
        return DeletePlantResult(success=True, in_use=False, message="Plant deleted.")

    @strawberry.mutation
    def rename_plant(self, plant_code: str, name: str) -> str:
        ensure_access(action="rename_plant")
        cleaned_name = require_non_empty(name, "name")
        return f"Plant {plant_code} renamed to {cleaned_name}"
