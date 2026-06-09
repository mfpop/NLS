import typing
import strawberry
from datetime import datetime

from manufacturing.models import (
    CapacityPlan, CapacityPlanInput as CapacityPlanInputModel,
    CapacityPlanResult as CapacityPlanResultModel, CapacityScenario,
    LaborRequirement, OperatorAssignment,
)
from manufacturing.models.capacity import CapacitySnapshot
from api.common.errors import MutationError
from api.utils.converters import _iso

@strawberry.type
class CapacityWarningNode:
    message: str


@strawberry.type
class CapacityLoadRowNode:
    level: str
    area: str
    available_capacity_minutes: float = strawberry.field(name="availableCapacityMinutes")
    required_capacity_minutes: float = strawberry.field(name="requiredCapacityMinutes")
    utilization_percent: float = strawberry.field(name="utilizationPercent")
    gap_minutes: float = strawberry.field(name="gapMinutes")
    status: str

    @classmethod
    def from_dict(cls, data: dict) -> "CapacityLoadRowNode":
        return cls(
            level=data.get("level", ""),
            area=data.get("area", ""),
            available_capacity_minutes=float(data.get("availableCapacityMinutes", 0) or 0),
            required_capacity_minutes=float(data.get("requiredCapacityMinutes", 0) or 0),
            utilization_percent=float(data.get("utilizationPercent", 0) or 0),
            gap_minutes=float(data.get("gapMinutes", 0) or 0),
            status=data.get("status", "MISSING_DATA"),
        )


@strawberry.type
class CapacityConstraintNode:
    severity: str
    source: str
    type: str
    message: str
    affected: str
    recommended_action: str = strawberry.field(name="recommendedAction")
    action: str

    @classmethod
    def from_dict(cls, data: dict) -> "CapacityConstraintNode":
        return cls(
            severity=data.get("severity", "WARNING"),
            source=data.get("source", ""),
            type=data.get("type", ""),
            message=data.get("message", ""),
            affected=data.get("affected", ""),
            recommended_action=data.get("recommendedAction", ""),
            action=data.get("action", ""),
        )


@strawberry.type
class CapacityYamazumiItemNode:
    step_id: str = strawberry.field(name="stepId")
    sequence: int
    department_name: str = strawberry.field(name="departmentName")
    resource_group_name: str = strawberry.field(name="resourceGroupName")
    resource_name: str = strawberry.field(name="resourceName")
    standard_work_name: str = strawberry.field(name="standardWorkName")
    operator: int
    cycle_time_seconds: float = strawberry.field(name="cycleTimeSeconds")
    manual_time_seconds: float = strawberry.field(name="manualTimeSeconds")
    auto_time_seconds: float = strawberry.field(name="autoTimeSeconds")
    setup_inclusive_seconds: float = strawberry.field(name="setupInclusiveSeconds")
    work_content_seconds: float = strawberry.field(name="workContentSeconds")
    takt_time_seconds: float = strawberry.field(name="taktTimeSeconds")
    load_percent: float = strawberry.field(name="loadPercent")
    is_bottleneck: bool = strawberry.field(name="isBottleneck")
    is_overloaded: bool = strawberry.field(name="isOverloaded")

    @classmethod
    def from_dict(cls, data: dict) -> "CapacityYamazumiItemNode":
        return cls(
            step_id=str(data.get("stepId", "")),
            sequence=int(data.get("sequence", 0) or 0),
            department_name=data.get("departmentName", ""),
            resource_group_name=data.get("resourceGroupName", ""),
            resource_name=data.get("resourceName", ""),
            standard_work_name=data.get("standardWorkName", ""),
            operator=int(data.get("operator", 1) or 1),
            cycle_time_seconds=float(data.get("cycleTimeSeconds", 0) or 0),
            manual_time_seconds=float(data.get("manualTimeSeconds", 0) or 0),
            auto_time_seconds=float(data.get("autoTimeSeconds", 0) or 0),
            setup_inclusive_seconds=float(data.get("setupInclusiveSeconds", 0) or 0),
            work_content_seconds=float(data.get("workContentSeconds", 0) or 0),
            takt_time_seconds=float(data.get("taktTimeSeconds", 0) or 0),
            load_percent=float(data.get("loadPercent", 0) or 0),
            is_bottleneck=bool(data.get("isBottleneck", False)),
            is_overloaded=bool(data.get("isOverloaded", False)),
        )


@strawberry.type
class CapacityYamazumiNode:
    metric: str
    takt_time_seconds: float = strawberry.field(name="taktTimeSeconds")
    balance_loss_percent: float = strawberry.field(name="balanceLossPercent")
    items: list[CapacityYamazumiItemNode]

    @classmethod
    def from_dict(cls, data: dict) -> "CapacityYamazumiNode":
        return cls(
            metric=data.get("metric", "SETUP_INCLUSIVE"),
            takt_time_seconds=float(data.get("taktTimeSeconds", 0) or 0),
            balance_loss_percent=float(data.get("balanceLossPercent", 0) or 0),
            items=[CapacityYamazumiItemNode.from_dict(item) for item in data.get("items", [])],
        )


@strawberry.type
class CapacityPlanInputNode:
    id: strawberry.ID
    capacity_plan_id: strawberry.ID = strawberry.field(name="capacityPlanId")
    planned_quantity: int = strawberry.field(name="plannedQuantity")
    available_time_minutes: float = strawberry.field(name="availableTimeMinutes")
    break_time_minutes: float = strawberry.field(name="breakTimeMinutes")
    planned_downtime_minutes: float = strawberry.field(name="plannedDowntimeMinutes")
    net_available_time_minutes: float = strawberry.field(name="netAvailableTimeMinutes")
    operators_available: int = strawberry.field(name="operatorsAvailable")
    efficiency_factor: float = strawberry.field(name="efficiencyFactor")
    takt_time_seconds: float = strawberry.field(name="taktTimeSeconds")

    @classmethod
    def from_db(cls, obj: CapacityPlanInputModel) -> "CapacityPlanInputNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            capacity_plan_id=strawberry.ID(str(obj.capacity_plan_id)),
            planned_quantity=obj.planned_quantity,
            available_time_minutes=obj.available_time_minutes,
            break_time_minutes=obj.break_time_minutes,
            planned_downtime_minutes=obj.planned_downtime_minutes,
            net_available_time_minutes=obj.net_available_time_minutes,
            operators_available=obj.operators_available,
            efficiency_factor=obj.efficiency_factor,
            takt_time_seconds=obj.takt_time_seconds,
        )


@strawberry.type
class CapacityPlanResultNode:
    id: strawberry.ID
    capacity_plan_id: strawberry.ID = strawberry.field(name="capacityPlanId")
    total_work_content_seconds: float = strawberry.field(name="totalWorkContentSeconds")
    required_capacity_minutes: float = strawberry.field(name="requiredCapacityMinutes")
    available_capacity_minutes: float = strawberry.field(name="availableCapacityMinutes")
    capacity_utilization_percent: float = strawberry.field(name="capacityUtilizationPercent")
    bottleneck_step_id: typing.Optional[strawberry.ID] = strawberry.field(name="bottleneckStepId", default=None)
    bottleneck_step_name: str = strawberry.field(name="bottleneckStepName")
    bottleneck_resource_id: typing.Optional[strawberry.ID] = strawberry.field(name="bottleneckResourceId", default=None)
    bottleneck_resource_name: str = strawberry.field(name="bottleneckResourceName")
    balance_loss_percent: float = strawberry.field(name="balanceLossPercent")
    operators_required: int = strawberry.field(name="operatorsRequired")
    feasibility_status: str = strawberry.field(name="feasibilityStatus")
    warnings: list[CapacityWarningNode]
    load_rows: list[CapacityLoadRowNode] = strawberry.field(name="loadRows")
    yamazumi: CapacityYamazumiNode
    constraints: list[CapacityConstraintNode]

    @classmethod
    def from_db(cls, obj: CapacityPlanResultModel) -> "CapacityPlanResultNode":
        bottleneck_step_name = ""
        if obj.bottleneck_step:
            bottleneck_step_name = obj.bottleneck_step.standard_work.name if obj.bottleneck_step.standard_work else f"Step {obj.bottleneck_step.sequence}"
        return cls(
            id=strawberry.ID(str(obj.id)),
            capacity_plan_id=strawberry.ID(str(obj.capacity_plan_id)),
            total_work_content_seconds=obj.total_work_content_seconds,
            required_capacity_minutes=obj.required_capacity_minutes,
            available_capacity_minutes=obj.available_capacity_minutes,
            capacity_utilization_percent=obj.capacity_utilization_percent,
            bottleneck_step_id=strawberry.ID(str(obj.bottleneck_step_id)) if obj.bottleneck_step_id else None,
            bottleneck_step_name=bottleneck_step_name,
            bottleneck_resource_id=strawberry.ID(str(obj.bottleneck_resource_id)) if obj.bottleneck_resource_id else None,
            bottleneck_resource_name=obj.bottleneck_resource.name if obj.bottleneck_resource else "",
            balance_loss_percent=obj.balance_loss_percent,
            operators_required=obj.operators_required,
            feasibility_status=obj.feasibility_status,
            warnings=[CapacityWarningNode(message=message) for message in (obj.warnings_json or [])],
            load_rows=[CapacityLoadRowNode.from_dict(row) for row in (obj.load_rows_json or [])],
            yamazumi=CapacityYamazumiNode.from_dict(obj.yamazumi_json or {}),
            constraints=[CapacityConstraintNode.from_dict(row) for row in (obj.constraints_json or [])],
        )


@strawberry.type
class CapacityScenarioNode:
    id: strawberry.ID
    capacity_plan_id: strawberry.ID = strawberry.field(name="capacityPlanId")
    name: str
    assumptions_json: strawberry.scalars.JSON = strawberry.field(name="assumptionsJson")
    result_json: strawberry.scalars.JSON = strawberry.field(name="resultJson")
    is_baseline: bool = strawberry.field(name="isBaseline")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: CapacityScenario) -> "CapacityScenarioNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            capacity_plan_id=strawberry.ID(str(obj.capacity_plan_id)),
            name=obj.name,
            assumptions_json=obj.assumptions_json,
            result_json=obj.result_json,
            is_baseline=obj.is_baseline,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class CapacityPlanNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    production_line_name: str = strawberry.field(name="productionLineName")
    product_model_id: strawberry.ID = strawberry.field(name="productModelId")
    product_model_name: str = strawberry.field(name="productModelName")
    routing_version_id: strawberry.ID = strawberry.field(name="routingVersionId")
    routing_version: str = strawberry.field(name="routingVersion")
    planning_horizon_start: str = strawberry.field(name="planningHorizonStart")
    planning_horizon_end: str = strawberry.field(name="planningHorizonEnd")
    status: str
    created_by_name: str = strawberry.field(name="createdByName")
    updated_by_name: str = strawberry.field(name="updatedByName")
    calculated_at: typing.Optional[str] = strawberry.field(name="calculatedAt", default=None)
    approved_at: typing.Optional[str] = strawberry.field(name="approvedAt", default=None)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")
    inputs: typing.Optional[CapacityPlanInputNode] = None
    result: typing.Optional[CapacityPlanResultNode] = None
    warnings: list[CapacityWarningNode] = strawberry.field(default_factory=list)
    constraints: list[CapacityConstraintNode] = strawberry.field(default_factory=list)

    @classmethod
    def from_db(cls, obj: CapacityPlan) -> "CapacityPlanNode":
        result = getattr(obj, "result", None)
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            plant_name=obj.plant.name if obj.plant else "",
            production_line_id=strawberry.ID(str(obj.production_line_id)),
            production_line_name=obj.production_line.name if obj.production_line else "",
            product_model_id=strawberry.ID(str(obj.product_model_id)),
            product_model_name=obj.product_model.name if obj.product_model else "",
            routing_version_id=strawberry.ID(str(obj.routing_version_id)),
            routing_version=obj.routing_version.version if obj.routing_version else "",
            planning_horizon_start=obj.planning_horizon_start.isoformat(),
            planning_horizon_end=obj.planning_horizon_end.isoformat(),
            status=obj.status,
            created_by_name=obj.created_by.get_full_name() or obj.created_by.username if obj.created_by else "",
            updated_by_name=obj.updated_by.get_full_name() or obj.updated_by.username if obj.updated_by else "",
            calculated_at=_iso(obj.calculated_at),
            approved_at=_iso(obj.approved_at),
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
            inputs=CapacityPlanInputNode.from_db(obj.inputs) if hasattr(obj, "inputs") else None,
            result=CapacityPlanResultNode.from_db(result) if result else None,
            warnings=[CapacityWarningNode(message=message) for message in (result.warnings_json if result else [])],
            constraints=[CapacityConstraintNode.from_dict(row) for row in (result.constraints_json if result else [])],
        )


@strawberry.type
class CapacityPlanPayload:
    ok: bool
    plan: typing.Optional[CapacityPlanNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class CapacityScenarioPayload:
    ok: bool
    scenario: typing.Optional[CapacityScenarioNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class WorkScheduleNode:
    id: strawberry.ID
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    name: str
    timezone: str
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "WorkScheduleNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            scope_type=obj.scope_type,
            scope_id=obj.scope_id,
            name=obj.name,
            timezone=obj.timezone,
            effective_from=obj.effective_from.isoformat() if obj.effective_from else "",
            effective_to=obj.effective_to.isoformat() if obj.effective_to else None,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class WorkShiftNode:
    id: strawberry.ID
    schedule_id: strawberry.ID = strawberry.field(name="scheduleId")
    name: str
    weekday: int
    start_time: str = strawberry.field(name="startTime")
    end_time: str = strawberry.field(name="endTime")
    crosses_midnight: bool = strawberry.field(name="crossesMidnight")
    paid_minutes: int = strawberry.field(name="paidMinutes")
    break_minutes: int = strawberry.field(name="breakMinutes")
    net_minutes: int = strawberry.field(name="netMinutes")
    is_active: bool = strawberry.field(name="isActive")

    @classmethod
    def from_db(cls, obj) -> "WorkShiftNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            schedule_id=strawberry.ID(str(obj.schedule_id)),
            name=obj.name,
            weekday=obj.weekday,
            start_time=obj.start_time.isoformat() if obj.start_time else "",
            end_time=obj.end_time.isoformat() if obj.end_time else "",
            crosses_midnight=obj.crosses_midnight,
            paid_minutes=obj.paid_minutes,
            break_minutes=obj.break_minutes,
            net_minutes=obj.net_minutes,
            is_active=obj.is_active,
        )


@strawberry.type
class CapacityProfileNode:
    id: strawberry.ID
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    capacity_mode: str = strawberry.field(name="capacityMode")
    manual_capacity: typing.Optional[float] = strawberry.field(name="manualCapacity", default=None)
    capacity_uom: str = strawberry.field(name="capacityUom")
    efficiency_factor: float = strawberry.field(name="efficiencyFactor")
    oee_factor: typing.Optional[float] = strawberry.field(name="oeeFactor", default=None)
    takt_factor: typing.Optional[float] = strawberry.field(name="taktFactor", default=None)
    is_active: bool = strawberry.field(name="isActive")

    @classmethod
    def from_db(cls, obj) -> "CapacityProfileNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            scope_type=obj.scope_type,
            scope_id=obj.scope_id,
            capacity_mode=obj.capacity_mode,
            manual_capacity=obj.manual_capacity,
            capacity_uom=obj.capacity_uom,
            efficiency_factor=obj.efficiency_factor,
            oee_factor=obj.oee_factor,
            takt_factor=obj.takt_factor,
            is_active=obj.is_active,
        )


@strawberry.type
class CapacitySnapshotNode:
    id: strawberry.ID
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    from_datetime: str = strawberry.field(name="fromDatetime")
    to_datetime: str = strawberry.field(name="toDatetime")
    available_minutes: float = strawberry.field(name="availableMinutes")
    theoretical_capacity: float = strawberry.field(name="theoreticalCapacity")
    effective_capacity: float = strawberry.field(name="effectiveCapacity")
    bottleneck_capacity: typing.Optional[float] = strawberry.field(name="bottleneckCapacity", default=None)
    capacity_uom: str = strawberry.field(name="capacityUom")
    machine_capacity_units: float = strawberry.field(name="machineCapacityUnits")
    labor_capacity_units: float = strawberry.field(name="laborCapacityUnits")
    effective_capacity_units: float = strawberry.field(name="effectiveCapacityUnits")
    constraint_reason: str = strawberry.field(name="constraintReason")
    machine_available_minutes: float = strawberry.field(name="machineAvailableMinutes")
    labor_available_minutes: float = strawberry.field(name="laborAvailableMinutes")
    operators_required: float = strawberry.field(name="operatorsRequired")
    operators_available: float = strawberry.field(name="operatorsAvailable")
    snapshot_type: str = strawberry.field(name="snapshotType")
    status: str
    version: int
    calculated_at: str = strawberry.field(name="calculatedAt")
    missing_reasons: list[str] = strawberry.field(name="missingReasons")

    @classmethod
    def from_db(cls, obj) -> "CapacitySnapshotNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            scope_type=obj.scope_type,
            scope_id=obj.scope_id,
            from_datetime=obj.from_datetime.isoformat() if obj.from_datetime else "",
            to_datetime=obj.to_datetime.isoformat() if obj.to_datetime else "",
            available_minutes=obj.available_minutes,
            theoretical_capacity=obj.theoretical_capacity,
            effective_capacity=obj.effective_capacity,
            bottleneck_capacity=obj.bottleneck_capacity,
            capacity_uom=obj.capacity_uom,
            machine_capacity_units=obj.machine_capacity_units,
            labor_capacity_units=obj.labor_capacity_units,
            effective_capacity_units=obj.effective_capacity_units,
            constraint_reason=obj.constraint_reason,
            machine_available_minutes=obj.machine_available_minutes,
            labor_available_minutes=obj.labor_available_minutes,
            operators_required=obj.operators_required,
            operators_available=obj.operators_available,
            snapshot_type=obj.snapshot_type,
            status=obj.status,
            version=obj.version,
            calculated_at=_iso(obj.calculated_at),
            missing_reasons=obj.missing_reasons or [],
        )


@strawberry.type
class CapacityResultNode:
    snapshot: CapacitySnapshotNode
    schedule: typing.Optional[WorkScheduleNode] = None
    profile: typing.Optional[CapacityProfileNode] = None


@strawberry.type
class PaginatedCapacitySnapshotResponse:
    items: list[CapacitySnapshotNode]
    total: int
    limit: int
    offset: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class CapacityRecalculationJobNode:
    id: strawberry.ID
    trigger_type: str = strawberry.field(name="triggerType")
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    from_datetime: str = strawberry.field(name="fromDatetime")
    to_datetime: str = strawberry.field(name="toDatetime")
    status: str
    error_message: str = strawberry.field(name="errorMessage")
    created_at: str = strawberry.field(name="createdAt")
    started_at: typing.Optional[str] = strawberry.field(name="startedAt", default=None)
    completed_at: typing.Optional[str] = strawberry.field(name="completedAt", default=None)

    @classmethod
    def from_db(cls, obj) -> "CapacityRecalculationJobNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            trigger_type=obj.trigger_type,
            scope_type=obj.scope_type,
            scope_id=obj.scope_id,
            from_datetime=obj.from_datetime.isoformat() if obj.from_datetime else "",
            to_datetime=obj.to_datetime.isoformat() if obj.to_datetime else "",
            status=obj.status,
            error_message=obj.error_message,
            created_at=_iso(obj.created_at),
            started_at=_iso(obj.started_at),
            completed_at=_iso(obj.completed_at),
        )


@strawberry.type
class LaborRequirementNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    resource_group_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceGroupId", default=None)
    routing_step_id: typing.Optional[strawberry.ID] = strawberry.field(name="routingStepId", default=None)
    product_model_id: typing.Optional[strawberry.ID] = strawberry.field(name="productModelId", default=None)
    operators_required: int = strawberry.field(name="operatorsRequired")
    labor_minutes_per_unit: float = strawberry.field(name="laborMinutesPerUnit")
    skill_required_id: typing.Optional[strawberry.ID] = strawberry.field(name="skillRequiredId", default=None)
    is_active: bool = strawberry.field(name="isActive")
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "LaborRequirementNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            resource_group_id=strawberry.ID(str(obj.resource_group_id)) if obj.resource_group_id else None,
            routing_step_id=strawberry.ID(str(obj.routing_step_id)) if obj.routing_step_id else None,
            product_model_id=strawberry.ID(str(obj.product_model_id)) if obj.product_model_id else None,
            operators_required=obj.operators_required,
            labor_minutes_per_unit=obj.labor_minutes_per_unit,
            skill_required_id=strawberry.ID(str(obj.skill_required_id)) if obj.skill_required_id else None,
            is_active=obj.is_active,
            effective_from=obj.effective_from.isoformat() if obj.effective_from else "",
            effective_to=obj.effective_to.isoformat() if obj.effective_to else None,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class OperatorAssignmentNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    operator_id: strawberry.ID = strawberry.field(name="operatorId")
    resource_group_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceGroupId", default=None)
    resource_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceId", default=None)
    schedule_assignment_id: strawberry.ID = strawberry.field(name="scheduleAssignmentId")
    skill_id: typing.Optional[strawberry.ID] = strawberry.field(name="skillId", default=None)
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "OperatorAssignmentNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            operator_id=strawberry.ID(str(obj.operator_id)),
            resource_group_id=strawberry.ID(str(obj.resource_group_id)) if obj.resource_group_id else None,
            resource_id=strawberry.ID(str(obj.resource_id)) if obj.resource_id else None,
            schedule_assignment_id=strawberry.ID(str(obj.schedule_assignment_id)),
            skill_id=strawberry.ID(str(obj.skill_id)) if obj.skill_id else None,
            effective_from=obj.effective_from.isoformat() if obj.effective_from else "",
            effective_to=obj.effective_to.isoformat() if obj.effective_to else None,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


# ── Work Schedule Payloads ──

@strawberry.type
class WorkSchedulePayload:
    ok: bool
    schedule: typing.Optional[WorkScheduleNode] = None
    recalculation_job: typing.Optional[CapacityRecalculationJobNode] = strawberry.field(name="recalculationJob", default=None)
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class WorkShiftPayload:
    ok: bool
    shift: typing.Optional[WorkShiftNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class CapacityProfilePayload:
    ok: bool
    profile: typing.Optional[CapacityProfileNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class CapacityRecalculationPayload:
    ok: bool
    jobs: typing.Optional[list[CapacityRecalculationJobNode]] = None
    snapshot: typing.Optional[CapacitySnapshotNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class LaborRequirementPayload:
    ok: bool
    labor_requirement: typing.Optional[LaborRequirementNode] = strawberry.field(name="laborRequirement", default=None)
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class OperatorAssignmentPayload:
    ok: bool
    operator_assignment: typing.Optional[OperatorAssignmentNode] = strawberry.field(name="operatorAssignment", default=None)
    errors: typing.Optional[list[MutationError]] = None


# ── Work Schedule Inputs ──
