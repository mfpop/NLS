import strawberry
import typing
from strawberry.types import Info
from api.permissions import ensure_access
from api.types.manufacturing import (
    MutationError,
    ProductionLineAssignmentPayload,
)


def _user(info):
    return info.context.user


@strawberry.type
class ManufacturingResourcesMutation:
    @strawberry.mutation
    def assign_resource_group_to_production_line(
        self,
        production_line_id: str,
        resource_group_id: str,
        sequence: typing.Optional[int] = None,
    ) -> ProductionLineAssignmentPayload:
        from manufacturing.domain.line_resource_group_service import (
            ProductionLineResourceGroupService, LineResourceGroupError,
        )
        try:
            ProductionLineResourceGroupService.assign_resource_group_to_line(
                production_line_id, resource_group_id, sequence,
            )
            return ProductionLineAssignmentPayload(ok=True)
        except LineResourceGroupError as e:
            return ProductionLineAssignmentPayload(
                ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)],
            )


    @strawberry.mutation
    def remove_resource_group_from_production_line(
        self,
        production_line_id: str,
        resource_group_id: str,
    ) -> ProductionLineAssignmentPayload:
        from manufacturing.domain.line_resource_group_service import (
            ProductionLineResourceGroupService, LineResourceGroupError,
        )
        try:
            ProductionLineResourceGroupService.remove_resource_group_from_line(
                production_line_id, resource_group_id,
            )
            return ProductionLineAssignmentPayload(ok=True)
        except LineResourceGroupError as e:
            return ProductionLineAssignmentPayload(
                ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)],
            )


    @strawberry.mutation
    def reorder_production_line_resource_groups(
        self,
        production_line_id: str,
        ordered_resource_group_ids: list[str],
    ) -> ProductionLineAssignmentPayload:
        from manufacturing.domain.line_resource_group_service import (
            ProductionLineResourceGroupService, LineResourceGroupError,
        )
        try:
            ProductionLineResourceGroupService.reorder_assigned_resource_groups(
                production_line_id, ordered_resource_group_ids,
            )
            return ProductionLineAssignmentPayload(ok=True)
        except LineResourceGroupError as e:
            return ProductionLineAssignmentPayload(
                ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)],
            )


    @strawberry.mutation
    def activate_production_line_resource_group(
        self,
        production_line_id: str,
        resource_group_id: str,
    ) -> ProductionLineAssignmentPayload:
        from manufacturing.domain.line_resource_group_service import (
            ProductionLineResourceGroupService, LineResourceGroupError,
        )
        try:
            ProductionLineResourceGroupService.activate_line_resource_group(
                production_line_id, resource_group_id,
            )
            return ProductionLineAssignmentPayload(ok=True)
        except LineResourceGroupError as e:
            return ProductionLineAssignmentPayload(
                ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)],
            )


    @strawberry.mutation
    def deactivate_production_line_resource_group(
        self,
        production_line_id: str,
        resource_group_id: str,
    ) -> ProductionLineAssignmentPayload:
        from manufacturing.domain.line_resource_group_service import (
            ProductionLineResourceGroupService, LineResourceGroupError,
        )
        try:
            ProductionLineResourceGroupService.deactivate_line_resource_group(
                production_line_id, resource_group_id,
            )
            return ProductionLineAssignmentPayload(ok=True)
        except LineResourceGroupError as e:
            return ProductionLineAssignmentPayload(
                ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)],
            )

    # ── GPT Line Setup (bulk seed) ──


