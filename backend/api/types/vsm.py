"""Strawberry types for the VSM (Value Stream Map) domain."""

from typing import Optional
from datetime import datetime
import strawberry


# ── Existing derived diagram types (kept for backward compat) ──


@strawberry.type
class VsmProcessNode:
    id: str
    sequence: int
    label: str
    resource_group_name: str = strawberry.field(name="resourceGroupName")
    cycle_time_seconds: float = strawberry.field(name="cycleTimeSeconds")
    changeover_seconds: float = strawberry.field(name="changeoverSeconds")
    uptime_percent: float = strawberry.field(name="uptimePercent")
    operator_count: int = strawberry.field(name="operatorCount")
    wip_before: int = strawberry.field(name="wipBefore")
    wip_after: int = strawberry.field(name="wipAfter")
    defect_rate: Optional[float] = strawberry.field(name="defectRate")
    is_bottleneck: bool = strawberry.field(name="isBottleneck")
    is_pacemaker: bool = strawberry.field(name="isPacemaker")
    is_active: bool = strawberry.field(name="isActive")


@strawberry.type
class VsmInventoryNode:
    id: str
    label: str
    type: str  # RM, WIP, FG, BUFFER, QUARANTINE
    quantity: int
    days_of_inventory: float = strawberry.field(name="daysOfInventory")


@strawberry.type
class VsmFlowLink:
    id: str
    from_id: str = strawberry.field(name="fromId")
    to_id: str = strawberry.field(name="toId")
    type: str  # PUSH, PULL, KANBAN, FIFO, SUPERMARKET
    label: str
    delivery_frequency: str = strawberry.field(name="deliveryFrequency", default="")


@strawberry.type
class VsmInformationFlow:
    id: str
    from_id: str = strawberry.field(name="fromId")
    to_id: str = strawberry.field(name="toId")
    label: str
    frequency: str
    flow_style: str = strawberry.field(
        name="flowStyle", default="MANUAL",
        description="MANUAL | ELECTRONIC | KANBAN",
    )
    method: str = strawberry.field(default="")
    transmission_type: str = strawberry.field(name="transmissionType", default="MANUAL")
    trigger_type: str = strawberry.field(name="triggerType", default="")
    controlled_process_id: str = strawberry.field(name="controlledProcessId", default="")
    notes: str = strawberry.field(default="")


@strawberry.type
class VsmProductionControl:
    id: str
    label: str
    scheduling_type: str = strawberry.field(name="schedulingType")
    scheduling_interval: str = strawberry.field(name="schedulingInterval")


@strawberry.type
class VsmTimelineEvent:
    step_name: str = strawberry.field(name="stepName")
    process_time_minutes: float = strawberry.field(name="processTimeMinutes")
    wait_time_minutes: float = strawberry.field(name="waitTimeMinutes")
    is_bottleneck: bool = strawberry.field(name="isBottleneck")


@strawberry.type
class VsmDiagramNode:
    line_id: str = strawberry.field(name="lineId")
    line_name: str = strawberry.field(name="lineName")
    product_name: str = strawberry.field(name="productName")
    process_nodes: list[VsmProcessNode] = strawberry.field(name="processNodes")
    inventory_nodes: list[VsmInventoryNode] = strawberry.field(name="inventoryNodes")
    flow_links: list[VsmFlowLink] = strawberry.field(name="flowLinks")
    information_flows: list[VsmInformationFlow] = strawberry.field(name="informationFlows")
    production_control: Optional[VsmProductionControl] = strawberry.field(name="productionControl")
    timeline: list[VsmTimelineEvent]
    supplier_name: str = strawberry.field(name="supplierName")
    customer_name: str = strawberry.field(name="customerName")
    total_lead_time_minutes: float = strawberry.field(name="totalLeadTimeMinutes")
    total_value_add_minutes: float = strawberry.field(name="totalValueAddMinutes")
    customer_demand_rate: Optional[float] = strawberry.field(name="customerDemandRate", default=None)
    customer_demand_period: str = strawberry.field(name="customerDemandPeriod", default="day")
    customer_demand_unit: str = strawberry.field(name="customerDemandUnit", default="units")
    available_minutes_per_shift: Optional[float] = strawberry.field(name="availableMinutesPerShift", default=450.0)
    chart_shifts_per_day: Optional[int] = strawberry.field(name="chartShiftsPerDay", default=1)
    break_time_per_shift: Optional[float] = strawberry.field(name="breakTimePerShift", default=0.0)
    planned_downtime_per_shift: Optional[float] = strawberry.field(name="plannedDowntimePerShift", default=0.0)
    working_days_per_week: Optional[int] = strawberry.field(name="workingDaysPerWeek", default=5)
    takt_time_seconds: Optional[float] = strawberry.field(name="taktTimeSeconds", default=None)
    last_updated_at: Optional[str] = strawberry.field(name="lastUpdatedAt")


# ── Chart model types (for the VSM chart engine) ──


@strawberry.type
class VsmChartProcessNode:
    id: strawberry.ID
    sequence: int
    name: str
    department_name: str = strawberry.field(name="departmentName")
    resource_group_name: str = strawberry.field(name="resourceGroupName")
    linked_department_id: Optional[str] = strawberry.field(name="linkedDepartmentId", default=None)
    linked_resource_group_id: Optional[str] = strawberry.field(name="linkedResourceGroupId", default=None)
    linked_resource_id: Optional[str] = strawberry.field(name="linkedResourceId", default=None)
    operator_count: int = strawberry.field(name="operatorCount")
    cycle_time_value: Optional[float] = strawberry.field(name="cycleTimeValue", default=None)
    cycle_time_unit: str = strawberry.field(name="cycleTimeUnit")
    changeover_time_value: Optional[float] = strawberry.field(name="changeoverTimeValue", default=None)
    changeover_time_unit: str = strawberry.field(name="changeoverTimeUnit")
    uptime_percent: Optional[float] = strawberry.field(name="uptimePercent", default=None)
    yield_percent: Optional[float] = strawberry.field(name="yieldPercent", default=None)
    wip: Optional[int] = None
    shifts_per_day: int = strawberry.field(name="shiftsPerDay")
    is_bottleneck: bool = strawberry.field(name="isBottleneck")
    is_pacemaker: bool = strawberry.field(name="isPacemaker")
    process_type: str = strawberry.field(name="processType", default="MANUFACTURING")
    value_add_type: str = strawberry.field(name="valueAddType", default="VALUE_ADD")
    cycle_time_vs_takt: Optional[str] = strawberry.field(
        name="cycleTimeVsTakt", default=None,
        description="'above' | 'below' | 'at' | null when no takt"
    )
    target_wip: Optional[int] = strawberry.field(name="targetWip", default=None)
    target_cycle_time_value: Optional[float] = strawberry.field(name="targetCycleTimeValue", default=None)
    notes: str


@strawberry.type
class VsmChartInventoryNode:
    id: strawberry.ID
    sequence: int
    label: str
    quantity: int
    wait_time_value: Optional[float] = strawberry.field(name="waitTimeValue", default=None)
    wait_time_unit: str = strawberry.field(name="waitTimeUnit")
    severity: str


@strawberry.type
class VsmChartInfoFlowNode:
    id: strawberry.ID
    from_type: str = strawberry.field(name="fromType")
    from_id: str = strawberry.field(name="fromId")
    to_type: str = strawberry.field(name="toType")
    to_id: str = strawberry.field(name="toId")
    label: str
    frequency: str
    flow_style: str = strawberry.field(name="flowStyle")
    method: str = strawberry.field(default="")
    transmission_type: str = strawberry.field(name="transmissionType", default="MANUAL")
    trigger_type: str = strawberry.field(name="triggerType", default="")
    controlled_process_id: str = strawberry.field(name="controlledProcessId", default="")
    notes: str = strawberry.field(default="")


@strawberry.type
class VsmChartMaterialFlowNode:
    id: strawberry.ID
    from_type: str = strawberry.field(name="fromType")
    from_id: str = strawberry.field(name="fromId")
    to_type: str = strawberry.field(name="toType")
    to_id: str = strawberry.field(name="toId")
    label: str
    flow_type: str = strawberry.field(name="flowType")
    delivery_frequency: str = strawberry.field(name="deliveryFrequency")
    equipment_type: str = strawberry.field(name="equipmentType", default="UNKNOWN")
    equipment_label: str = strawberry.field(name="equipmentLabel", default="")
    distance: Optional[float] = strawberry.field(default=None)
    distance_unit: str = strawberry.field(name="distanceUnit", default="m")
    trip_frequency: str = strawberry.field(name="tripFrequency", default="")
    batch_size: Optional[int] = strawberry.field(name="batchSize", default=None)
    handling_time: Optional[float] = strawberry.field(name="handlingTime", default=None)
    handling_time_unit: str = strawberry.field(name="handlingTimeUnit", default="min")
    transport_severity: str = strawberry.field(name="transportSeverity", default="UNKNOWN")
    transport_cost_level: str = strawberry.field(name="transportCostLevel", default="UNKNOWN")
    is_internal_transport: bool = strawberry.field(name="isInternalTransport", default=False)
    is_transportation_waste: bool = strawberry.field(name="isTransportationWaste", default=False)
    notes: str = strawberry.field(default="")


@strawberry.type
class VsmChartTimelineNode:
    id: strawberry.ID
    sequence: int
    process_id: Optional[str] = strawberry.field(name="processId", default=None)
    wait_time_value: Optional[float] = strawberry.field(name="waitTimeValue", default=None)
    wait_time_unit: str = strawberry.field(name="waitTimeUnit")
    process_time_value: Optional[float] = strawberry.field(name="processTimeValue", default=None)
    process_time_unit: str = strawberry.field(name="processTimeUnit")
    label: str


@strawberry.type
class VsmImprovementOpportunityNode:
    id: strawberry.ID
    process_id: Optional[str] = strawberry.field(name="processId", default=None)
    inventory_id: Optional[str] = strawberry.field(name="inventoryId", default=None)
    opportunity_type: str = strawberry.field(name="opportunityType")
    severity: str
    label: str
    message: str
    acknowledged: bool


@strawberry.type
class VsmChartNode:
    id: strawberry.ID
    name: str
    chart_type: str = strawberry.field(name="chartType")
    source_mode: str = strawberry.field(name="sourceMode")
    plant_id: Optional[str] = strawberry.field(name="plantId", default=None)
    production_line_id: Optional[str] = strawberry.field(name="productionLineId", default=None)
    department_id: Optional[str] = strawberry.field(name="departmentId", default=None)
    supplier_name: str = strawberry.field(name="supplierName")
    customer_name: str = strawberry.field(name="customerName")
    production_control_title: str = strawberry.field(name="productionControlTitle")
    control_method: str = strawberry.field(name="controlMethod")
    schedule_frequency: str = strawberry.field(name="scheduleFrequency")
    customer_demand_rate: Optional[float] = strawberry.field(name="customerDemandRate", default=None)
    customer_demand_period: str = strawberry.field(name="customerDemandPeriod", default="day")
    customer_demand_unit: str = strawberry.field(name="customerDemandUnit", default="units")
    available_minutes_per_shift: Optional[float] = strawberry.field(name="availableMinutesPerShift", default=450.0)
    chart_shifts_per_day: Optional[int] = strawberry.field(name="chartShiftsPerDay", default=1)
    break_time_per_shift: Optional[float] = strawberry.field(name="breakTimePerShift", default=0.0)
    planned_downtime_per_shift: Optional[float] = strawberry.field(name="plannedDowntimePerShift", default=0.0)
    working_days_per_week: Optional[int] = strawberry.field(name="workingDaysPerWeek", default=5)
    takt_time_seconds: Optional[float] = strawberry.field(name="taktTimeSeconds", default=None)
    status: str
    processes: list[VsmChartProcessNode]
    inventories: list[VsmChartInventoryNode]
    information_flows: list[VsmChartInfoFlowNode] = strawberry.field(name="informationFlows")
    material_flows: list[VsmChartMaterialFlowNode] = strawberry.field(name="materialFlows")
    timeline_segments: list[VsmChartTimelineNode] = strawberry.field(name="timelineSegments")
    improvement_opportunities: list[VsmImprovementOpportunityNode] = strawberry.field(
        name="improvementOpportunities", default_factory=list,
    )
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")


# ── Inputs ──


@strawberry.input
class CreateVsmChartInput:
    name: str
    chart_type: str = strawberry.field(name="chartType")
    source_mode: str = strawberry.field(name="sourceMode")
    plant_id: Optional[str] = strawberry.field(name="plantId", default=None)
    production_line_id: Optional[str] = strawberry.field(name="productionLineId", default=None)
    department_id: Optional[str] = strawberry.field(name="departmentId", default=None)
    supplier_name: Optional[str] = strawberry.field(name="supplierName", default=None)
    customer_name: Optional[str] = strawberry.field(name="customerName", default=None)
    production_control_title: Optional[str] = strawberry.field(name="productionControlTitle", default=None)
    control_method: Optional[str] = strawberry.field(name="controlMethod", default=None)
    schedule_frequency: Optional[str] = strawberry.field(name="scheduleFrequency", default=None)
    customer_demand_rate: Optional[float] = strawberry.field(name="customerDemandRate", default=None)
    customer_demand_period: Optional[str] = strawberry.field(name="customerDemandPeriod", default=None)
    customer_demand_unit: Optional[str] = strawberry.field(name="customerDemandUnit", default=None)
    available_minutes_per_shift: Optional[float] = strawberry.field(name="availableMinutesPerShift", default=None)
    chart_shifts_per_day: Optional[int] = strawberry.field(name="chartShiftsPerDay", default=None)
    break_time_per_shift: Optional[float] = strawberry.field(name="breakTimePerShift", default=None)
    planned_downtime_per_shift: Optional[float] = strawberry.field(name="plannedDowntimePerShift", default=None)
    working_days_per_week: Optional[int] = strawberry.field(name="workingDaysPerWeek", default=None)


@strawberry.input
class UpdateVsmChartInput:
    name: Optional[str] = None
    chart_type: Optional[str] = strawberry.field(name="chartType", default=None)
    supplier_name: Optional[str] = strawberry.field(name="supplierName", default=None)
    customer_name: Optional[str] = strawberry.field(name="customerName", default=None)
    production_control_title: Optional[str] = strawberry.field(name="productionControlTitle", default=None)
    control_method: Optional[str] = strawberry.field(name="controlMethod", default=None)
    schedule_frequency: Optional[str] = strawberry.field(name="scheduleFrequency", default=None)
    customer_demand_rate: Optional[float] = strawberry.field(name="customerDemandRate", default=None)
    customer_demand_period: Optional[str] = strawberry.field(name="customerDemandPeriod", default=None)
    customer_demand_unit: Optional[str] = strawberry.field(name="customerDemandUnit", default=None)
    available_minutes_per_shift: Optional[float] = strawberry.field(name="availableMinutesPerShift", default=None)
    chart_shifts_per_day: Optional[int] = strawberry.field(name="chartShiftsPerDay", default=None)
    break_time_per_shift: Optional[float] = strawberry.field(name="breakTimePerShift", default=None)
    planned_downtime_per_shift: Optional[float] = strawberry.field(name="plannedDowntimePerShift", default=None)
    working_days_per_week: Optional[int] = strawberry.field(name="workingDaysPerWeek", default=None)
    status: Optional[str] = None


@strawberry.input
class VsmChartProcessInput:
    id: Optional[str] = None  # set for update, omit for create
    sequence: int
    name: str
    department_name: Optional[str] = strawberry.field(name="departmentName", default="")
    resource_group_name: Optional[str] = strawberry.field(name="resourceGroupName", default="")
    linked_department_id: Optional[str] = strawberry.field(name="linkedDepartmentId", default=None)
    linked_resource_group_id: Optional[str] = strawberry.field(name="linkedResourceGroupId", default=None)
    linked_resource_id: Optional[str] = strawberry.field(name="linkedResourceId", default=None)
    operator_count: Optional[int] = strawberry.field(name="operatorCount", default=1)
    cycle_time_value: Optional[float] = strawberry.field(name="cycleTimeValue", default=None)
    cycle_time_unit: Optional[str] = strawberry.field(name="cycleTimeUnit", default="sec")
    changeover_time_value: Optional[float] = strawberry.field(name="changeoverTimeValue", default=None)
    changeover_time_unit: Optional[str] = strawberry.field(name="changeoverTimeUnit", default="sec")
    uptime_percent: Optional[float] = strawberry.field(name="uptimePercent", default=None)
    yield_percent: Optional[float] = strawberry.field(name="yieldPercent", default=None)
    wip: Optional[int] = None
    shifts_per_day: Optional[int] = strawberry.field(name="shiftsPerDay", default=1)
    is_bottleneck: Optional[bool] = strawberry.field(name="isBottleneck", default=False)
    is_pacemaker: Optional[bool] = strawberry.field(name="isPacemaker", default=False)
    target_wip: Optional[int] = strawberry.field(name="targetWip", default=None)
    target_cycle_time_value: Optional[float] = strawberry.field(name="targetCycleTimeValue", default=None)
    process_type: Optional[str] = strawberry.field(name="processType", default="MANUFACTURING")
    value_add_type: Optional[str] = strawberry.field(name="valueAddType", default="VALUE_ADD")
    notes: Optional[str] = ""


@strawberry.input
class VsmChartInventoryInput:
    id: Optional[str] = None
    sequence: int
    label: Optional[str] = ""
    quantity: int
    wait_time_value: Optional[float] = strawberry.field(name="waitTimeValue", default=None)
    wait_time_unit: Optional[str] = strawberry.field(name="waitTimeUnit", default="days")
    severity: Optional[str] = "NORMAL"


@strawberry.input
class VsmChartInfoFlowInput:
    id: Optional[str] = None
    from_type: str = strawberry.field(name="fromType")
    from_id: str = strawberry.field(name="fromId")
    to_type: str = strawberry.field(name="toType")
    to_id: str = strawberry.field(name="toId")
    label: Optional[str] = ""
    frequency: Optional[str] = ""
    flow_style: Optional[str] = strawberry.field(name="flowStyle", default="MANUAL")
    method: Optional[str] = ""
    transmission_type: Optional[str] = strawberry.field(name="transmissionType", default="MANUAL")
    trigger_type: Optional[str] = strawberry.field(name="triggerType", default="")
    controlled_process_id: Optional[str] = strawberry.field(name="controlledProcessId", default="")
    notes: Optional[str] = ""


@strawberry.input
class VsmChartMaterialFlowInput:
    id: Optional[str] = None
    from_type: str = strawberry.field(name="fromType")
    from_id: str = strawberry.field(name="fromId")
    to_type: str = strawberry.field(name="toType")
    to_id: str = strawberry.field(name="toId")
    label: Optional[str] = ""
    flow_type: Optional[str] = strawberry.field(name="flowType", default="PUSH")
    delivery_frequency: Optional[str] = strawberry.field(name="deliveryFrequency", default="")
    equipment_type: Optional[str] = strawberry.field(name="equipmentType", default="UNKNOWN")
    equipment_label: Optional[str] = strawberry.field(name="equipmentLabel", default="")
    distance: Optional[float] = strawberry.field(name="distance", default=None)
    distance_unit: Optional[str] = strawberry.field(name="distanceUnit", default="m")
    trip_frequency: Optional[str] = strawberry.field(name="tripFrequency", default="")
    batch_size: Optional[int] = strawberry.field(name="batchSize", default=None)
    handling_time: Optional[float] = strawberry.field(name="handlingTime", default=None)
    handling_time_unit: Optional[str] = strawberry.field(name="handlingTimeUnit", default="min")
    transport_severity: Optional[str] = strawberry.field(name="transportSeverity", default="UNKNOWN")
    transport_cost_level: Optional[str] = strawberry.field(name="transportCostLevel", default="UNKNOWN")
    is_internal_transport: Optional[bool] = strawberry.field(name="isInternalTransport", default=False)
    is_transportation_waste: Optional[bool] = strawberry.field(name="isTransportationWaste", default=False)
    notes: Optional[str] = strawberry.field(default="")


@strawberry.input
class VsmChartTimelineInput:
    id: Optional[str] = None
    sequence: int
    process_id: Optional[str] = strawberry.field(name="processId", default=None)
    wait_time_value: Optional[float] = strawberry.field(name="waitTimeValue", default=None)
    wait_time_unit: Optional[str] = strawberry.field(name="waitTimeUnit", default="days")
    process_time_value: Optional[float] = strawberry.field(name="processTimeValue", default=None)
    process_time_unit: Optional[str] = strawberry.field(name="processTimeUnit", default="sec")
    label: Optional[str] = ""


# ── Demand & Takt ──


@strawberry.input
class DemandAndTaktInput:
    customer_demand_quantity: Optional[float] = strawberry.field(name="customerDemandQuantity", default=None)
    customer_demand_unit: Optional[str] = strawberry.field(name="customerDemandUnit", default=None)
    customer_demand_period: Optional[str] = strawberry.field(name="customerDemandPeriod", default=None)
    available_work_time_per_shift: Optional[float] = strawberry.field(name="availableWorkTimePerShift", default=None)
    break_time_per_shift: Optional[float] = strawberry.field(name="breakTimePerShift", default=None)
    planned_downtime_per_shift: Optional[float] = strawberry.field(name="plannedDowntimePerShift", default=None)
    shifts_per_day: Optional[int] = strawberry.field(name="shiftsPerDay", default=None)
    working_days_per_week: Optional[int] = strawberry.field(name="workingDaysPerWeek", default=None)


@strawberry.type
class DemandAndTaktPayload:
    chart_id: Optional[str] = strawberry.field(name="chartId", default=None)
    takt_time_seconds: Optional[float] = strawberry.field(name="taktTimeSeconds", default=None)
    takt_time_display: Optional[str] = strawberry.field(name="taktTimeDisplay", default=None)
    takt_status: Optional[str] = strawberry.field(name="taktStatus", default=None)
    takt_missing_reason: Optional[str] = strawberry.field(name="taktMissingReason", default=None)
    demand_summary: Optional[str] = strawberry.field(name="demandSummary", default=None)
    demand_per_day: Optional[float] = strawberry.field(name="demandPerDay", default=None)
    available_production_time_per_shift: Optional[str] = strawberry.field(name="availableProductionTimePerShift", default=None)
    available_production_time_per_day: Optional[str] = strawberry.field(name="availableProductionTimePerDay", default=None)
    available_production_time_seconds: Optional[float] = strawberry.field(name="availableProductionTimeSeconds", default=None)
    break_time_per_shift: Optional[float] = strawberry.field(name="breakTimePerShift", default=None)
    planned_downtime_per_shift: Optional[float] = strawberry.field(name="plannedDowntimePerShift", default=None)
    shifts_per_day: Optional[int] = strawberry.field(name="shiftsPerDay", default=None)
    working_days_per_week: Optional[int] = strawberry.field(name="workingDaysPerWeek", default=None)
    errors: Optional[list[str]] = None


# ── Payloads ──


@strawberry.type
class VsmChartPayload:
    chart: Optional[VsmChartNode] = None
    errors: Optional[list[str]] = None


@strawberry.type
class VsmChartListPayload:
    charts: list[VsmChartNode]
    total: int
