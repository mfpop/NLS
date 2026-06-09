"""GraphQL inputs for planning entities.

CapacityPlan, CapacityScenario, WorkSchedule, WorkShift,
CapacityProfile, and related planning inputs.
"""

import typing
import strawberry


# ── Capacity Plan ──

@strawberry.input
class CapacityPlanCreateInput:
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    product_model_id: strawberry.ID = strawberry.field(name="productModelId")
    routing_version_id: strawberry.ID = strawberry.field(name="routingVersionId")
    planning_horizon_start: str = strawberry.field(name="planningHorizonStart")
    planning_horizon_end: str = strawberry.field(name="planningHorizonEnd")


@strawberry.input
class CapacityPlanInputUpdateInput:
    capacity_plan_id: strawberry.ID = strawberry.field(name="capacityPlanId")
    planned_quantity: int = strawberry.field(name="plannedQuantity")
    efficiency_factor: float = strawberry.field(name="efficiencyFactor")


@strawberry.input
class CapacityScenarioInput:
    capacity_plan_id: strawberry.ID = strawberry.field(name="capacityPlanId")
    name: str
    assumptions_json: strawberry.scalars.JSON = strawberry.field(name="assumptionsJson")


# ── Work Schedule ──

@strawberry.input
class WorkScheduleInput:
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    name: str
    timezone: str = "UTC"
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)


@strawberry.input
class WorkScheduleUpdateInput:
    name: typing.Optional[str] = None
    timezone: typing.Optional[str] = None
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=None)


@strawberry.input
class WorkShiftInput:
    schedule_id: str = strawberry.field(name="scheduleId")
    name: str
    weekday: int
    start_time: str = strawberry.field(name="startTime")
    end_time: str = strawberry.field(name="endTime")
    paid_minutes: int = strawberry.field(name="paidMinutes")
    break_minutes: int = 0


@strawberry.input
class WorkShiftUpdateInput:
    name: typing.Optional[str] = None
    weekday: typing.Optional[int] = None
    start_time: typing.Optional[str] = strawberry.field(name="startTime", default=None)
    end_time: typing.Optional[str] = strawberry.field(name="endTime", default=None)
    paid_minutes: typing.Optional[int] = strawberry.field(name="paidMinutes", default=None)
    break_minutes: typing.Optional[int] = None


@strawberry.input
class CapacityProfileInput:
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    capacity_mode: typing.Optional[str] = strawberry.field(name="capacityMode", default="INHERITED")
    manual_capacity: typing.Optional[float] = strawberry.field(name="manualCapacity", default=None)
    capacity_uom: typing.Optional[str] = strawberry.field(name="capacityUom", default="")
    efficiency_factor: typing.Optional[float] = strawberry.field(name="efficiencyFactor", default=1.0)
    oee_factor: typing.Optional[float] = strawberry.field(name="oeeFactor", default=None)
    takt_factor: typing.Optional[float] = strawberry.field(name="taktFactor", default=None)


@strawberry.input
class CapacityProfileUpdateInput:
    capacity_mode: typing.Optional[str] = strawberry.field(name="capacityMode", default=None)
    manual_capacity: typing.Optional[float] = strawberry.field(name="manualCapacity", default=None)
    capacity_uom: typing.Optional[str] = strawberry.field(name="capacityUom", default=None)
    efficiency_factor: typing.Optional[float] = strawberry.field(name="efficiencyFactor", default=None)
    oee_factor: typing.Optional[float] = strawberry.field(name="oeeFactor", default=None)
    takt_factor: typing.Optional[float] = strawberry.field(name="taktFactor", default=None)


@strawberry.input
class CapacityRecalculationInput:
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    from_datetime: str = strawberry.field(name="fromDatetime")
    to_datetime: str = strawberry.field(name="toDatetime")
    trigger_type: typing.Optional[str] = strawberry.field(name="triggerType", default="SCHEDULE_CHANGED")


@strawberry.input
class LaborRequirementInput:
    plant_id: str = strawberry.field(name="plantId")
    resource_group_id: typing.Optional[str] = strawberry.field(name="resourceGroupId", default=None)
    routing_step_id: typing.Optional[str] = strawberry.field(name="routingStepId", default=None)
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId", default=None)
    operators_required: int = strawberry.field(name="operatorsRequired")
    labor_minutes_per_unit: float = strawberry.field(name="laborMinutesPerUnit")
    skill_required_id: typing.Optional[str] = strawberry.field(name="skillRequiredId", default=None)
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)


@strawberry.input
class LaborRequirementUpdateInput:
    operators_required: typing.Optional[int] = strawberry.field(name="operatorsRequired", default=None)
    labor_minutes_per_unit: typing.Optional[float] = strawberry.field(name="laborMinutesPerUnit", default=None)
    skill_required_id: typing.Optional[str] = strawberry.field(name="skillRequiredId", default=None)
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=None)


@strawberry.input
class OperatorAssignmentInput:
    plant_id: str = strawberry.field(name="plantId")
    operator_id: str = strawberry.field(name="operatorId")
    resource_group_id: typing.Optional[str] = strawberry.field(name="resourceGroupId", default=None)
    resource_id: typing.Optional[str] = strawberry.field(name="resourceId", default=None)
    schedule_assignment_id: str = strawberry.field(name="scheduleAssignmentId")
    skill_id: typing.Optional[str] = strawberry.field(name="skillId", default=None)
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)


@strawberry.input
class OperatorAssignmentUpdateInput:
    skill_id: typing.Optional[str] = strawberry.field(name="skillId", default=None)
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=None)
