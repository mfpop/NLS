import json
import strawberry
import typing
from typing import Optional
from strawberry.types import Info
from django.db import transaction
from django.core.exceptions import ValidationError

from api.common.errors import MutationError
from api.types.manufacturing import (
    CapacityPlanNode, CapacityPlanPayload, CapacityPlanCreateInput, CapacityPlanInputUpdateInput,
    CapacityScenarioNode, CapacityScenarioPayload, CapacityScenarioInput,
    WorkScheduleNode, WorkSchedulePayload, WorkScheduleInput, WorkScheduleUpdateInput,
    WorkShiftNode, WorkShiftPayload, WorkShiftInput, WorkShiftUpdateInput,
    CapacityProfileNode, CapacityProfilePayload, CapacityProfileInput, CapacityProfileUpdateInput,
    CapacityRecalculationJobNode, CapacityRecalculationPayload, CapacityRecalculationInput,
    CapacitySnapshotNode,
    LaborRequirementInput, LaborRequirementNode, LaborRequirementPayload,
    LaborRequirementUpdateInput, OperatorAssignmentInput, OperatorAssignmentNode,
    OperatorAssignmentPayload, OperatorAssignmentUpdateInput,
    MutationError,
)
from manufacturing.models import ProductionLine
from manufacturing.domain.capacity_service import (
    CapacityPlanService, CapacityValidationError, ScenarioSimulationService, NewCapacityService,
)
from manufacturing.domain.line_resource_group_service import ProductionLineResourceGroupService, LineResourceGroupError


def _user(info: Info):
    return info.context.user


def _parse_dt(value: Optional[str]):
    if not value:
        return None
    from datetime import datetime
    return datetime.fromisoformat(value)


def _validation_payload(payload_cls, exc: Exception):
    if isinstance(exc, ValidationError):
        return payload_cls(ok=False, errors=[MutationError(field="_form", code="VALIDATION", message="; ".join(exc.messages))])
    return payload_cls(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])


@strawberry.type
class PlanningMutation:
    @strawberry.mutation
    def create_capacity_plan(self, info: Info, input: CapacityPlanCreateInput) -> CapacityPlanPayload:
        try:
            plan = CapacityPlanService.create_plan({
                "plant_id": input.plant_id,
                "production_line_id": input.production_line_id,
                "product_model_id": input.product_model_id,
                "routing_version_id": input.routing_version_id,
                "planning_horizon_start": input.planning_horizon_start,
                "planning_horizon_end": input.planning_horizon_end,
            }, user=getattr(info.context, "user", None))
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])
        except Exception as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def update_capacity_plan_input(self, info: Info, input: CapacityPlanInputUpdateInput) -> CapacityPlanPayload:
        try:
            plan = CapacityPlanService.update_inputs(str(input.capacity_plan_id), {
                "planned_quantity": input.planned_quantity,
                "efficiency_factor": input.efficiency_factor,
            }, user=getattr(info.context, "user", None))
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def calculate_capacity_plan(self, info: Info, id: str) -> CapacityPlanPayload:
        try:
            plan = CapacityPlanService.calculate_plan(id, user=getattr(info.context, "user", None))
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def create_capacity_scenario(self, input: CapacityScenarioInput) -> CapacityScenarioPayload:
        try:
            plan = CapacityPlanService._get_plan(str(input.capacity_plan_id))
            scenario = ScenarioSimulationService.create(plan, input.name, input.assumptions_json or {})
            return CapacityScenarioPayload(ok=True, scenario=CapacityScenarioNode.from_db(scenario))
        except CapacityValidationError as e:
            return CapacityScenarioPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def approve_capacity_plan(self, info: Info, id: str) -> CapacityPlanPayload:
        try:
            plan = CapacityPlanService.approve_plan(id, user=getattr(info.context, "user", None))
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def archive_capacity_plan(self, info: Info, id: str) -> CapacityPlanPayload:
        try:
            plan = CapacityPlanService.archive_plan(id, user=getattr(info.context, "user", None))
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    # ── Product Family / Model Assignments ──

    @strawberry.mutation
    def create_work_schedule(self, info: Info, input: WorkScheduleInput) -> WorkSchedulePayload:
        from datetime import datetime
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from manufacturing.domain.capacity_cascade_service import CapacityCascadeService
        try:
            schedule = ScheduleService.create_schedule(
                scope_type=input.scope_type,
                scope_id=input.scope_id,
                name=input.name,
                effective_from=datetime.fromisoformat(input.effective_from),
                effective_to=datetime.fromisoformat(input.effective_to) if input.effective_to else None,
                timezone=input.timezone or "",
            )
            from_dt = datetime.fromisoformat(input.effective_from)
            to_dt = datetime.fromisoformat(input.effective_to) if input.effective_to else from_dt
            jobs = CapacityCascadeService.recalculate_from_scope(
                input.scope_type, input.scope_id, from_dt, to_dt,
                trigger_type="SCHEDULE_CHANGED",
            )
            return WorkSchedulePayload(
                ok=True,
                schedule=WorkScheduleNode.from_db(schedule),
                recalculation_job=CapacityRecalculationJobNode.from_db(jobs[0]) if jobs else None,
            )
        except ScheduleValidationError as e:
            return WorkSchedulePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def update_work_schedule(self, info: Info, id: str, input: WorkScheduleUpdateInput) -> WorkSchedulePayload:
        from datetime import datetime
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from manufacturing.domain.capacity_cascade_service import CapacityCascadeService
        try:
            kwargs = {}
            if input.name is not None:
                kwargs["name"] = input.name
            if input.timezone is not None:
                kwargs["timezone"] = input.timezone
            if input.effective_from is not None:
                kwargs["effective_from"] = datetime.fromisoformat(input.effective_from)
            if input.effective_to is not None:
                kwargs["effective_to"] = datetime.fromisoformat(input.effective_to)
            if input.is_active is not None:
                kwargs["is_active"] = input.is_active

            schedule = ScheduleService.update_schedule(id, **kwargs)
            jobs = CapacityCascadeService.recalculate_from_scope(
                schedule.scope_type, schedule.scope_id,
                schedule.effective_from, schedule.effective_to or schedule.effective_from,
                trigger_type="SCHEDULE_CHANGED",
            )
            return WorkSchedulePayload(
                ok=True,
                schedule=WorkScheduleNode.from_db(schedule),
                recalculation_job=CapacityRecalculationJobNode.from_db(jobs[0]) if jobs else None,
            )
        except ScheduleValidationError as e:
            return WorkSchedulePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def archive_work_schedule(self, info: Info, id: str) -> WorkSchedulePayload:
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from manufacturing.domain.capacity_cascade_service import CapacityCascadeService
        try:
            schedule = ScheduleService.archive_schedule(id)
            jobs = CapacityCascadeService.recalculate_from_scope(
                schedule.scope_type, schedule.scope_id,
                schedule.effective_from, schedule.effective_to or schedule.effective_from,
                trigger_type="SCHEDULE_CHANGED",
            )
            return WorkSchedulePayload(
                ok=True,
                schedule=WorkScheduleNode.from_db(schedule),
                recalculation_job=CapacityRecalculationJobNode.from_db(jobs[0]) if jobs else None,
            )
        except ScheduleValidationError as e:
            return WorkSchedulePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def create_work_shift(self, info: Info, input: WorkShiftInput) -> WorkShiftPayload:
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from datetime import time as dt_time
        try:
            parts_s = input.start_time.split(":")
            parts_e = input.end_time.split(":")
            start = dt_time(int(parts_s[0]), int(parts_s[1]))
            end = dt_time(int(parts_e[0]), int(parts_e[1]))
            shift = ScheduleService.create_shift(
                schedule_id=input.schedule_id,
                name=input.name,
                weekday=input.weekday,
                start_time=start,
                end_time=end,
                paid_minutes=input.paid_minutes,
                break_minutes=input.break_minutes,
            )
            return WorkShiftPayload(ok=True, shift=WorkShiftNode.from_db(shift))
        except ScheduleValidationError as e:
            return WorkShiftPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def create_capacity_profile(self, info: Info, input: CapacityProfileInput) -> CapacityProfilePayload:
        from manufacturing.domain.capacity_service import NewCapacityService, NewCapacityValidationError
        try:
            profile = NewCapacityService.create_profile(
                scope_type=input.scope_type,
                scope_id=input.scope_id,
                capacity_mode=input.capacity_mode or "INHERITED",
                manual_capacity=input.manual_capacity,
                capacity_uom=input.capacity_uom or "",
                efficiency_factor=input.efficiency_factor or 1.0,
                oee_factor=input.oee_factor,
                takt_factor=input.takt_factor,
            )
            return CapacityProfilePayload(ok=True, profile=CapacityProfileNode.from_db(profile))
        except NewCapacityValidationError as e:
            return CapacityProfilePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def update_capacity_profile(self, info: Info, id: str, input: CapacityProfileUpdateInput) -> CapacityProfilePayload:
        from manufacturing.domain.capacity_service import NewCapacityService, NewCapacityValidationError
        try:
            kwargs = {}
            if input.capacity_mode is not None:
                kwargs["capacity_mode"] = input.capacity_mode
            if input.manual_capacity is not None:
                kwargs["manual_capacity"] = input.manual_capacity
            if input.capacity_uom is not None:
                kwargs["capacity_uom"] = input.capacity_uom
            if input.efficiency_factor is not None:
                kwargs["efficiency_factor"] = input.efficiency_factor
            if input.oee_factor is not None:
                kwargs["oee_factor"] = input.oee_factor
            if input.takt_factor is not None:
                kwargs["takt_factor"] = input.takt_factor
            profile = NewCapacityService.update_profile(id, **kwargs)
            return CapacityProfilePayload(ok=True, profile=CapacityProfileNode.from_db(profile))
        except NewCapacityValidationError as e:
            return CapacityProfilePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def archive_capacity_profile(self, info: Info, id: str) -> CapacityProfilePayload:
        from manufacturing.domain.capacity_service import NewCapacityService, NewCapacityValidationError
        try:
            profile = NewCapacityService.archive_profile(id)
            return CapacityProfilePayload(ok=True, profile=CapacityProfileNode.from_db(profile))
        except NewCapacityValidationError as e:
            return CapacityProfilePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def recalculate_capacity(self, info: Info, input: CapacityRecalculationInput) -> CapacityRecalculationPayload:
        from manufacturing.domain.capacity_service import NewCapacityService
        from datetime import datetime
        try:
            from_dt = datetime.fromisoformat(input.from_datetime)
            to_dt = datetime.fromisoformat(input.to_datetime)
            snapshot = NewCapacityService.calculate_scope_capacity(input.scope_type, input.scope_id, from_dt, to_dt)
            return CapacityRecalculationPayload(
                ok=True,
                snapshot=CapacitySnapshotNode.from_db(snapshot),
            )
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

    @strawberry.mutation
    @transaction.atomic
    def create_labor_requirement(self, info: Info, input: LaborRequirementInput) -> LaborRequirementPayload:
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
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            req = NewCapacityService.update_labor_requirement(id, **{
                "operators_required": input.operators_required,
                "labor_minutes_per_unit": input.labor_minutes_per_unit,
                "skill_required_id": input.skill_required_id,
                "effective_from": _parse_dt(input.effective_from),
                "effective_to": _parse_dt(input.effective_to),
                "is_active": input.is_active,
            })
            return LaborRequirementPayload(ok=True, labor_requirement=LaborRequirementNode.from_db(req))
        except Exception as exc:
            return _validation_payload(LaborRequirementPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def archive_labor_requirement(self, info: Info, id: str) -> LaborRequirementPayload:
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            req = NewCapacityService.archive_labor_requirement(id)
            return LaborRequirementPayload(ok=True, labor_requirement=LaborRequirementNode.from_db(req))
        except Exception as exc:
            return _validation_payload(LaborRequirementPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def create_operator_assignment(self, info: Info, input: OperatorAssignmentInput) -> OperatorAssignmentPayload:
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            assignment = NewCapacityService.create_operator_assignment(
                plant_id=input.plant_id,
                operator_id=input.operator_id,
                resource_group_id=input.resource_group_id,
                resource_id=input.resource_id,
                schedule_assignment_id=input.schedule_assignment_id,
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
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            assignment = NewCapacityService.archive_operator_assignment(id)
            return OperatorAssignmentPayload(ok=True, operator_assignment=OperatorAssignmentNode.from_db(assignment))
        except Exception as exc:
            return _validation_payload(OperatorAssignmentPayload, exc)

    # ── Production Line Resource Group Assignments ──
