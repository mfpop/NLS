import strawberry
import typing
from strawberry.types import Info
from django.db import transaction
from api.permissions import ensure_access
from api.types.manufacturing import (
    CapacityPlanNode, CapacityPlanPayload, CapacityPlanCreateInput, CapacityPlanInputUpdateInput,
    CapacityScenarioNode, CapacityScenarioPayload, CapacityScenarioInput,
    CapacityProfileNode, CapacityProfilePayload, CapacityProfileInput, CapacityProfileUpdateInput,
    CapacityRecalculationJobNode, CapacityRecalculationPayload, CapacityRecalculationInput,
    CapacitySnapshotNode, LaborRequirementInput, LaborRequirementNode, LaborRequirementPayload,
    LaborRequirementUpdateInput, OperatorAssignmentInput, OperatorAssignmentNode,
    OperatorAssignmentPayload, OperatorAssignmentUpdateInput,
    MutationError,
)
from manufacturing.domain.capacity_service import (
    CapacityPlanService, CapacityValidationError, ScenarioSimulationService,
)


def _user(info):
    return info.context.user


def _parse_dt(value):
    if not value:
        return None
    from datetime import datetime
    return datetime.fromisoformat(value)


def _validation_payload(payload_cls, exc: Exception):
    from django.core.exceptions import ValidationError
    if isinstance(exc, ValidationError):
        return payload_cls(ok=False, errors=[MutationError(field="_form", code="VALIDATION", message="; ".join(exc.messages))])
    return payload_cls(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])


@strawberry.type
class ManufacturingCapacityMutation:

    # ── Capacity Plan ──

    @strawberry.mutation
    @transaction.atomic
    def create_capacity_plan(self, info: Info, input: CapacityPlanCreateInput) -> CapacityPlanPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        try:
            plan = CapacityPlanService.create_plan(input)
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as exc:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    @transaction.atomic
    def update_capacity_plan_input(self, info: Info, id: str, input: CapacityPlanInputUpdateInput) -> CapacityPlanPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        try:
            plan = CapacityPlanService.update_plan_input(id, input)
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as exc:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    @transaction.atomic
    def calculate_capacity_plan(self, info: Info, id: str) -> CapacityPlanPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        try:
            plan = CapacityPlanService.calculate_plan(id)
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as exc:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    @transaction.atomic
    def create_capacity_scenario(self, info: Info, plan_id: str, name: str, input: CapacityPlanInputUpdateInput) -> CapacityScenarioPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        try:
            scenario = ScenarioSimulationService.create_scenario(plan_id, name, input)
            return CapacityScenarioPayload(ok=True, scenario=CapacityScenarioNode.from_db(scenario))
        except CapacityValidationError as exc:
            return CapacityScenarioPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    @transaction.atomic
    def approve_capacity_plan(self, info: Info, id: str) -> CapacityPlanPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        try:
            plan = CapacityPlanService.approve_plan(id)
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as exc:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    @transaction.atomic
    def archive_capacity_plan(self, info: Info, id: str) -> CapacityPlanPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        try:
            plan = CapacityPlanService.archive_plan(id)
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as exc:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    # ── Capacity Profile ──

    @strawberry.mutation
    @transaction.atomic
    def create_capacity_profile(self, info: Info, input: CapacityProfileInput) -> CapacityProfilePayload:
        ensure_access(user=_user(info), action="manage_capacity")
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            profile = NewCapacityService.create_profile(
                plant_id=input.plant_id,
                name=input.name,
                description=input.description or "",
                shift_model=input.shift_model or "8h",
                days_per_week=input.days_per_week or 5,
                hours_per_day=input.hours_per_day or 8,
                efficiency_factor=input.efficiency_factor or 1.0,
            )
            return CapacityProfilePayload(ok=True, profile=CapacityProfileNode.from_db(profile))
        except Exception as exc:
            return _validation_payload(CapacityProfilePayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def update_capacity_profile(self, info: Info, id: str, input: CapacityProfileUpdateInput) -> CapacityProfilePayload:
        ensure_access(user=_user(info), action="manage_capacity")
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            profile = NewCapacityService.update_profile(id, input)
            return CapacityProfilePayload(ok=True, profile=CapacityProfileNode.from_db(profile))
        except Exception as exc:
            return _validation_payload(CapacityProfilePayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def archive_capacity_profile(self, info: Info, id: str) -> CapacityProfilePayload:
        ensure_access(user=_user(info), action="manage_capacity")
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            profile = NewCapacityService.archive_profile(id)
            return CapacityProfilePayload(ok=True, profile=CapacityProfileNode.from_db(profile))
        except Exception as exc:
            return _validation_payload(CapacityProfilePayload, exc)

    # ── Capacity Recalculation ──

    @strawberry.mutation
    @transaction.atomic
    def recalculate_capacity(self, info: Info, input: CapacityRecalculationInput) -> CapacityRecalculationPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        from manufacturing.domain.capacity_service import NewCapacityService
        from datetime import datetime
        try:
            from_dt = datetime.fromisoformat(input.from_datetime)
            to_dt = datetime.fromisoformat(input.to_datetime)
            result = NewCapacityService.calculate_scope_capacity(
                input.scope_type, input.scope_id, from_dt, to_dt,
            )
            return CapacityRecalculationPayload(ok=True, snapshot=CapacitySnapshotNode.from_db(result))
        except Exception as e:
            return CapacityRecalculationPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def recalculate_resource_group_capacity(self, info: Info, resource_group_id: str, from_datetime: str, to_datetime: str) -> CapacitySnapshotNode:
        from manufacturing.domain.capacity_service import NewCapacityService
        from datetime import datetime
        try:
            from_dt = datetime.fromisoformat(from_datetime)
            to_dt = datetime.fromisoformat(to_datetime)
            snapshot = NewCapacityService.calculate_scope_capacity(
                "RESOURCE_GROUP", resource_group_id, from_dt, to_dt,
            )
            return CapacitySnapshotNode.from_db(snapshot)
        except Exception as e:
            raise e

    # ── Labor Requirement ──

    @strawberry.mutation
    @transaction.atomic
    def create_labor_requirement(self, info: Info, input: LaborRequirementInput) -> LaborRequirementPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            req = NewCapacityService.create_labor_requirement(
                plant_id=input.plant_id,
                resource_group_id=input.resource_group_id,
                routing_step_id=input.routing_step_id,
                product_model_id=input.product_model_id,
                operators_required=input.operators_required,
                labor_minutes_per_unit=input.labor_minutes_per_unit,
                skill_required_id=input.skill_required_id,
                effective_from=_parse_dt(input.effective_from),
                effective_to=_parse_dt(input.effective_to),
                is_active=True,
            )
            return LaborRequirementPayload(ok=True, labor_requirement=LaborRequirementNode.from_db(req))
        except Exception as exc:
            return _validation_payload(LaborRequirementPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def update_labor_requirement(self, info: Info, id: str, input: LaborRequirementUpdateInput) -> LaborRequirementPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            req = NewCapacityService.update_labor_requirement(
                id, operators_required=input.operators_required,
                labor_minutes_per_unit=input.labor_minutes_per_unit,
                skill_required_id=input.skill_required_id,
                effective_from=_parse_dt(input.effective_from),
                effective_to=_parse_dt(input.effective_to),
                is_active=input.is_active,
            )
            return LaborRequirementPayload(ok=True, labor_requirement=LaborRequirementNode.from_db(req))
        except Exception as exc:
            return _validation_payload(LaborRequirementPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def archive_labor_requirement(self, info: Info, id: str) -> LaborRequirementPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            req = NewCapacityService.archive_labor_requirement(id)
            return LaborRequirementPayload(ok=True, labor_requirement=LaborRequirementNode.from_db(req))
        except Exception as exc:
            return _validation_payload(LaborRequirementPayload, exc)

    # ── Operator Assignment ──

    @strawberry.mutation
    @transaction.atomic
    def create_operator_assignment(self, info: Info, input: OperatorAssignmentInput) -> OperatorAssignmentPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            assignment = NewCapacityService.create_operator_assignment(
                resource_group_id=input.resource_group_id,
                operator_id=input.operator_id,
                skill_id=input.skill_id,
                effective_from=_parse_dt(input.effective_from),
                effective_to=_parse_dt(input.effective_to),
                is_active=True,
            )
            return OperatorAssignmentPayload(ok=True, operator_assignment=OperatorAssignmentNode.from_db(assignment))
        except Exception as exc:
            return _validation_payload(OperatorAssignmentPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def update_operator_assignment(self, info: Info, id: str, input: OperatorAssignmentUpdateInput) -> OperatorAssignmentPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            assignment = NewCapacityService.update_operator_assignment(id, **{
                "skill_id": input.skill_id,
                "effective_from": _parse_dt(input.effective_from),
                "effective_to": _parse_dt(input.effective_to),
                "is_active": input.is_active,
            })
            return OperatorAssignmentPayload(ok=True, operator_assignment=OperatorAssignmentNode.from_db(assignment))
        except Exception as exc:
            return _validation_payload(OperatorAssignmentPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def archive_operator_assignment(self, info: Info, id: str) -> OperatorAssignmentPayload:
        ensure_access(user=_user(info), action="manage_capacity")
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            assignment = NewCapacityService.archive_operator_assignment(id)
            return OperatorAssignmentPayload(ok=True, operator_assignment=OperatorAssignmentNode.from_db(assignment))
        except Exception as exc:
            return _validation_payload(OperatorAssignmentPayload, exc)
