import uuid

from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models

from execution.constants import (
    GEMBA_SESSION_STATUS_CHOICES,
    GEMBA_SESSION_PLANNED,
    GEMBA_CATEGORY_CHOICES,
    GEMBA_SEVERITY_CHOICES,
    GEMBA_SEVERITY_INFO,
    GEMBA_PRIORITY_CHOICES,
    GEMBA_PRIORITY_MEDIUM,
    GEMBA_OBSERVATION_STATUS_CHOICES,
    GEMBA_OBSERVATION_STATUS_OPEN,
    GEMBA_EVENT_TYPE_CHOICES,
    GEMBA_EVENT_CREATED,
)


class WorkOrderStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    DONE = "DONE", "Done"
    CANCELLED = "CANCELLED", "Cancelled"


class WorkOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=50, unique=True)
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.PROTECT,
        related_name="work_orders",
    )
    product_model = models.ForeignKey(
        "manufacturing.ProductModel", on_delete=models.PROTECT,
        related_name="work_orders", null=True, blank=True,
    )
    planned_quantity = models.IntegerField(default=1)
    good_quantity = models.IntegerField(default=0)
    scrap_quantity = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=WorkOrderStatus.choices, default=WorkOrderStatus.OPEN,
        db_index=True,
    )
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_work_order"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["production_line", "status"], name="exec_wo_line_status_idx"),
            models.Index(fields=["status", "scheduled_start"], name="exec_wo_status_start_idx"),
        ]

    def clean(self):
        if self.good_quantity + self.scrap_quantity > self.planned_quantity:
            raise ValidationError("Good + scrap quantity cannot exceed planned quantity.")

    def __str__(self):
        return f"{self.reference} — {self.production_line.code} ({self.status})"


# ── Gemba Walk Models ──

class GembaWalkSession(models.Model):
    """Represents a Gemba Walk session for a line/shift/date."""

    line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.CASCADE,
        related_name="gemba_sessions", null=True, blank=True,
    )
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.CASCADE,
        related_name="gemba_sessions", null=True, blank=True,
    )
    shift_name = models.CharField(max_length=50, blank=True, default="")
    walk_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=GEMBA_SESSION_STATUS_CHOICES,
        default=GEMBA_SESSION_PLANNED, db_index=True,
    )
    observer = models.CharField(max_length=255, blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    summary = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="created_gemba_sessions",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="updated_gemba_sessions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_gemba_walk_session"
        ordering = ["-walk_date", "-created_at"]
        indexes = [
            models.Index(fields=["line", "status"], name="exec_gemba_sess_line_stat_idx"),
            models.Index(fields=["walk_date", "shift_name"], name="exec_gemba_sess_date_idx"),
        ]

    def __str__(self):
        line_info = f"{self.line.code} - " if self.line else ""
        return f"Gemba: {line_info}{self.walk_date or '—'} ({self.status})"


class GembaObservation(models.Model):
    """A single observation captured during a Gemba Walk."""

    session = models.ForeignKey(
        GembaWalkSession, on_delete=models.CASCADE,
        related_name="observations",
    )
    target_type = models.CharField(max_length=100, blank=True, default="")
    target_id = models.IntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    area = models.CharField(max_length=255)
    focus = models.CharField(max_length=255, blank=True, default="")
    category = models.CharField(
        max_length=30, choices=GEMBA_CATEGORY_CHOICES,
    )
    severity = models.CharField(
        max_length=20, choices=GEMBA_SEVERITY_CHOICES,
        default=GEMBA_SEVERITY_INFO,
    )
    priority = models.CharField(
        max_length=20, choices=GEMBA_PRIORITY_CHOICES,
        default=GEMBA_PRIORITY_MEDIUM,
    )
    linked_resource_text = models.CharField(max_length=255, blank=True, default="")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="gemba_observations",
    )
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=25, choices=GEMBA_OBSERVATION_STATUS_CHOICES,
        default=GEMBA_OBSERVATION_STATUS_OPEN, db_index=True,
    )
    location_path = models.TextField(blank=True, default="")
    location_label = models.CharField(max_length=255, blank=True, default="")
    resolution_note = models.TextField(blank=True, default="")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="resolved_gemba_observations",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    verification_note = models.TextField(blank=True, default="")
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="verified_gemba_observations",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="closed_gemba_observations",
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    created_issue = models.ForeignKey(
        "check.Problem", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="gemba_observations",
    )
    created_action = models.ForeignKey(
        "check.Action", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="gemba_observations",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="created_gemba_observations",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="updated_gemba_observations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_gemba_observation"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["session", "status"], name="exec_gemba_obs_ssn_stat_idx"),
            models.Index(fields=["status", "severity"], name="exec_gemba_obs_stat_sev_idx"),
            models.Index(fields=["owner", "due_date"], name="exec_gemba_obs_owner_due_idx"),
            models.Index(fields=["created_issue"], name="exec_gemba_obs_issue_idx"),
            models.Index(fields=["created_action"], name="exec_gemba_obs_action_idx"),
        ]

    def __str__(self):
        return f"{self.title[:60]} ({self.status})"


# ── VSM Chart Models ──


class VsmChartStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    ARCHIVED = "ARCHIVED", "Archived"


class VsmChartType(models.TextChoices):
    CURRENT_STATE = "CURRENT_STATE", "Current State"
    FUTURE_STATE = "FUTURE_STATE", "Future State"
    HISTORICAL = "HISTORICAL", "Historical"


class VsmSourceMode(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    LINKED = "LINKED", "Linked to Production Line"


class VsmFlowType(models.TextChoices):
    PUSH = "PUSH", "Push"
    PULL = "PULL", "Pull"
    KANBAN = "KANBAN", "Kanban"
    FIFO = "FIFO", "FIFO"
    SUPERMARKET = "SUPERMARKET", "Supermarket"
    SHIPMENT = "SHIPMENT", "Shipment"


class ImprovementOpportunityType(models.TextChoices):
    HIGH_WIP = "HIGH_WIP", "High WIP"
    CT_ABOVE_TAKT = "CT_ABOVE_TAKT", "Cycle Time Above Takt"
    LONG_CHANGEOVER = "LONG_CHANGEOVER", "Long Changeover"
    LOW_UPTIME = "LOW_UPTIME", "Low Uptime"
    QUALITY_LOSS = "QUALITY_LOSS", "Quality Loss"
    BOTTLENECK = "BOTTLENECK", "Bottleneck"
    FLOW_BREAK = "FLOW_BREAK", "Flow Break"


class ImprovementOpportunitySeverity(models.TextChoices):
    MINOR = "MINOR", "Minor"
    MAJOR = "MAJOR", "Major"
    CRITICAL = "CRITICAL", "Critical"


class VsmInfoFlowStyle(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    ELECTRONIC = "ELECTRONIC", "Electronic"
    KANBAN = "KANBAN", "Kanban"


class VsmInfoTransmissionType(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    ELECTRONIC = "ELECTRONIC", "Electronic"
    EDI = "EDI", "EDI"
    SYSTEM = "SYSTEM", "System"
    KANBAN = "KANBAN", "Kanban"
    UNKNOWN = "UNKNOWN", "Unknown"


class VsmInfoTriggerType(models.TextChoices):
    CUSTOMER_ORDER = "CUSTOMER_ORDER", "Customer order"
    FORECAST = "FORECAST", "Forecast"
    PRODUCTION_SCHEDULE = "PRODUCTION_SCHEDULE", "Production schedule"
    RELEASE_SCHEDULE = "RELEASE_SCHEDULE", "Release schedule"
    KANBAN_SIGNAL = "KANBAN_SIGNAL", "Kanban signal"
    PULL_SIGNAL = "PULL_SIGNAL", "Pull signal"
    SUPERMARKET_REPLENISHMENT = "SUPERMARKET_REPLENISHMENT", "Supermarket replenishment"
    FIFO_REPLENISHMENT = "FIFO_REPLENISHMENT", "FIFO replenishment"
    MANUAL_INSTRUCTION = "MANUAL_INSTRUCTION", "Manual instruction"
    UNKNOWN = "UNKNOWN", "Unknown"


class VsmInventorySeverity(models.TextChoices):
    NORMAL = "NORMAL", "Normal"
    WARNING = "WARNING", "Warning"
    CRITICAL = "CRITICAL", "Critical"


class VsmEquipmentType(models.TextChoices):
    NONE = "NONE", "None"
    MANUAL_CARRY = "MANUAL_CARRY", "Manual carry"
    HAND_CART = "HAND_CART", "Hand cart"
    PALLET_JACK = "PALLET_JACK", "Pallet jack"
    FORKLIFT = "FORKLIFT", "Forklift"
    TUGGER = "TUGGER", "Tugger"
    CONVEYOR = "CONVEYOR", "Conveyor"
    AGV = "AGV", "AGV"
    TRUCK = "TRUCK", "Truck"
    OTHER = "OTHER", "Other"
    UNKNOWN = "UNKNOWN", "Unknown"


class VsmTransportSeverity(models.TextChoices):
    NORMAL = "NORMAL", "Normal"
    WARNING = "WARNING", "Warning"
    CRITICAL = "CRITICAL", "Critical"
    UNKNOWN = "UNKNOWN", "Unknown"


class VsmTransportCostLevel(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    UNKNOWN = "UNKNOWN", "Unknown"


class VsmProcessType(models.TextChoices):
    MANUFACTURING = "MANUFACTURING", "Manufacturing"
    INSPECTION = "INSPECTION", "Inspection"
    LOGISTICS = "LOGISTICS", "Logistics"
    STORAGE = "STORAGE", "Storage"
    TRANSPORT = "TRANSPORT", "Transport"
    PACKAGING = "PACKAGING", "Packaging"
    SUPPORT = "SUPPORT", "Support"
    UNKNOWN = "UNKNOWN", "Unknown"


class VsmValueAddType(models.TextChoices):
    VALUE_ADD = "VALUE_ADD", "Value Add"
    NON_VALUE_ADD_REQUIRED = "NON_VALUE_ADD_REQUIRED", "Non-Value Add Required"
    NON_VALUE_ADD_WASTE = "NON_VALUE_ADD_WASTE", "Non-Value Add Waste"
    UNKNOWN = "UNKNOWN", "Unknown"


class VsmChart(models.Model):
    """A Value Stream Map chart that can be manual or linked to a production line."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    chart_type = models.CharField(
        max_length=20, choices=VsmChartType.choices,
        default=VsmChartType.CURRENT_STATE,
    )
    source_mode = models.CharField(
        max_length=20, choices=VsmSourceMode.choices,
        default=VsmSourceMode.MANUAL,
    )
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="vsm_charts",
    )
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="vsm_charts",
    )
    department = models.ForeignKey(
        "manufacturing.Department", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="vsm_charts",
    )
    supplier_name = models.CharField(max_length=255, blank=True, default="RM Supply")
    customer_name = models.CharField(max_length=255, blank=True, default="FG Customer")
    production_control_title = models.CharField(max_length=255, blank=True, default="Production Control")
    control_method = models.CharField(max_length=255, blank=True, default="Kanban / Pull")
    schedule_frequency = models.CharField(max_length=255, blank=True, default="Daily")

    # Demand / Takt fields
    customer_demand_rate = models.FloatField(
        null=True, blank=True,
        help_text="Customer demand in units per day",
    )
    customer_demand_period = models.CharField(
        max_length=20, blank=True, default="day",
        help_text="Demand period: day, week, month",
    )
    customer_demand_unit = models.CharField(
        max_length=50, blank=True, default="units",
        help_text="Demand unit: units, pieces, kg, etc.",
    )
    available_minutes_per_shift = models.FloatField(
        null=True, blank=True, default=450.0,
        help_text="Available working minutes per shift (default 450 = 8h - breaks)",
    )
    chart_shifts_per_day = models.IntegerField(
        null=True, blank=True, default=1,
        help_text="Number of shifts per day for takt calculation",
    )
    break_time_per_shift = models.FloatField(
        null=True, blank=True, default=0.0,
        help_text="Break time in minutes per shift",
    )
    planned_downtime_per_shift = models.FloatField(
        null=True, blank=True, default=0.0,
        help_text="Planned downtime in minutes per shift",
    )
    working_days_per_week = models.IntegerField(
        null=True, blank=True, default=5,
        help_text="Number of working days per week",
    )

    status = models.CharField(
        max_length=20, choices=VsmChartStatus.choices,
        default=VsmChartStatus.DRAFT, db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="created_vsm_charts",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="updated_vsm_charts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_vsm_chart"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["production_line", "status"], name="exec_vsm_line_status_idx"),
            models.Index(fields=["status", "chart_type"], name="exec_vsm_status_type_idx"),
        ]

    def __str__(self):
        return f"VSM: {self.name} ({self.chart_type}, {self.source_mode})"


class VsmChartProcess(models.Model):
    """A process step in a VSM chart."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chart = models.ForeignKey(
        VsmChart, on_delete=models.CASCADE,
        related_name="processes",
    )
    sequence = models.IntegerField()
    name = models.CharField(max_length=255)
    department_name = models.CharField(max_length=255, blank=True, default="")
    resource_group_name = models.CharField(max_length=255, blank=True, default="")
    linked_department = models.ForeignKey(
        "manufacturing.Department", on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    linked_resource_group = models.ForeignKey(
        "manufacturing.ResourceGroup", on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    linked_resource = models.ForeignKey(
        "manufacturing.Resource", on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    operator_count = models.IntegerField(default=1)
    cycle_time_value = models.FloatField(null=True, blank=True)
    cycle_time_unit = models.CharField(max_length=20, blank=True, default="sec")
    changeover_time_value = models.FloatField(null=True, blank=True)
    changeover_time_unit = models.CharField(max_length=20, blank=True, default="sec")
    uptime_percent = models.FloatField(null=True, blank=True)
    yield_percent = models.FloatField(null=True, blank=True)
    wip = models.IntegerField(null=True, blank=True)
    shifts_per_day = models.IntegerField(default=1)
    is_bottleneck = models.BooleanField(default=False)
    is_pacemaker = models.BooleanField(
        default=False,
        help_text="The pacemaker process — the one process scheduled directly by Production Control",
    )
    target_wip = models.IntegerField(
        null=True, blank=True,
        help_text="Target WIP for future state — used when chart_type=FUTURE_STATE",
    )
    target_cycle_time_value = models.FloatField(
        null=True, blank=True,
        help_text="Target cycle time for future state — used when chart_type=FUTURE_STATE",
    )
    notes = models.TextField(blank=True, default="")
    process_type = models.CharField(
        max_length=30, choices=VsmProcessType.choices,
        default=VsmProcessType.MANUFACTURING,
        help_text="Process classification: MANUFACTURING, INSPECTION, LOGISTICS, etc.",
    )
    value_add_type = models.CharField(
        max_length=30, choices=VsmValueAddType.choices,
        default=VsmValueAddType.VALUE_ADD,
        help_text="Value-add classification: VALUE_ADD, NON_VALUE_ADD_REQUIRED, NON_VALUE_ADD_WASTE",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_vsm_chart_process"
        ordering = ["sequence"]
        unique_together = [("chart", "sequence")]

    def __str__(self):
        return f"{self.name} (seq {self.sequence})"


class VsmChartInventory(models.Model):
    """An inventory/stock point in a VSM chart."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chart = models.ForeignKey(
        VsmChart, on_delete=models.CASCADE,
        related_name="inventories",
    )
    sequence = models.IntegerField()
    label = models.CharField(max_length=255, blank=True, default="")
    quantity = models.IntegerField(default=0)
    wait_time_value = models.FloatField(null=True, blank=True)
    wait_time_unit = models.CharField(max_length=20, blank=True, default="days")
    severity = models.CharField(
        max_length=20, choices=VsmInventorySeverity.choices,
        default=VsmInventorySeverity.NORMAL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_vsm_chart_inventory"
        ordering = ["sequence"]

    def __str__(self):
        return f"{self.label} (qty: {self.quantity})"


class VsmChartInformationFlow(models.Model):
    """An information flow in a VSM chart."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chart = models.ForeignKey(
        VsmChart, on_delete=models.CASCADE,
        related_name="information_flows",
    )
    from_type = models.CharField(max_length=50)  # CUSTOMER, PC, SUPPLIER, PROCESS, INVENTORY
    from_id = models.CharField(max_length=255, blank=True, default="")
    to_type = models.CharField(max_length=50)
    to_id = models.CharField(max_length=255, blank=True, default="")
    label = models.CharField(max_length=255, blank=True, default="")
    frequency = models.CharField(max_length=255, blank=True, default="")
    flow_style = models.CharField(
        max_length=20, choices=VsmInfoFlowStyle.choices,
        default=VsmInfoFlowStyle.MANUAL,
    )
    method = models.CharField(
        max_length=255, blank=True, default="",
        help_text="Method description — e.g. EDI, ERP email, Paper dispatch list, Kanban card",
    )
    transmission_type = models.CharField(
        max_length=20, choices=VsmInfoTransmissionType.choices,
        default=VsmInfoTransmissionType.MANUAL,
        help_text="Transmission type — MANUAL, ELECTRONIC, EDI, SYSTEM, KANBAN, UNKNOWN",
    )
    trigger_type = models.CharField(
        max_length=30, choices=VsmInfoTriggerType.choices,
        blank=True, default="",
        help_text="What triggers this information flow — e.g. CUSTOMER_ORDER, PRODUCTION_SCHEDULE, KANBAN_SIGNAL",
    )
    controlled_process_id = models.CharField(
        max_length=255, blank=True, default="",
        help_text="The process ID that this flow controls/schedules",
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_vsm_chart_info_flow"

    def __str__(self):
        return f"{self.from_type} → {self.to_type}: {self.label}"


class VsmChartMaterialFlow(models.Model):
    """A material flow in a VSM chart."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chart = models.ForeignKey(
        VsmChart, on_delete=models.CASCADE,
        related_name="material_flows",
    )
    from_type = models.CharField(max_length=50)
    from_id = models.CharField(max_length=255, blank=True, default="")
    to_type = models.CharField(max_length=50)
    to_id = models.CharField(max_length=255, blank=True, default="")
    label = models.CharField(max_length=255, blank=True, default="")
    flow_type = models.CharField(
        max_length=20, choices=VsmFlowType.choices,
        default=VsmFlowType.PUSH,
    )
    delivery_frequency = models.CharField(
        max_length=100, blank=True, default="",
        help_text="Delivery frequency label (e.g. Daily, Weekly, 2x/week)",
    )
    equipment_type = models.CharField(
        max_length=30, choices=VsmEquipmentType.choices,
        default=VsmEquipmentType.UNKNOWN,
        help_text="Material handling equipment type",
    )
    equipment_label = models.CharField(
        max_length=100, blank=True, default="",
        help_text="Custom equipment label override",
    )
    distance = models.FloatField(
        null=True, blank=True,
        help_text="Travel distance for this material flow",
    )
    distance_unit = models.CharField(
        max_length=20, blank=True, default="m",
        help_text="Distance unit: m, ft, km, mi",
    )
    trip_frequency = models.CharField(
        max_length=100, blank=True, default="",
        help_text="Trip frequency (e.g. Every 2h, Daily, As needed)",
    )
    batch_size = models.IntegerField(
        null=True, blank=True,
        help_text="Number of units per trip",
    )
    handling_time = models.FloatField(
        null=True, blank=True,
        help_text="Time required for material handling per trip",
    )
    handling_time_unit = models.CharField(
        max_length=20, blank=True, default="min",
        help_text="Handling time unit: min, sec, hr",
    )
    transport_severity = models.CharField(
        max_length=20, choices=VsmTransportSeverity.choices,
        default=VsmTransportSeverity.UNKNOWN,
        help_text="Transport severity: NORMAL, WARNING, CRITICAL, UNKNOWN",
    )
    transport_cost_level = models.CharField(
        max_length=20, choices=VsmTransportCostLevel.choices,
        default=VsmTransportCostLevel.UNKNOWN,
        help_text="Transport cost level: LOW, MEDIUM, HIGH, UNKNOWN",
    )
    is_internal_transport = models.BooleanField(
        default=False,
        help_text="True if this is an internal plant transport (not supplier/customer shipment)",
    )
    is_transportation_waste = models.BooleanField(
        default=False,
        help_text="True if this movement is classified as transportation waste",
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_vsm_chart_mat_flow"

    def __str__(self):
        return f"{self.from_type} → {self.to_type} ({self.flow_type})"


class VsmChartTimelineSegment(models.Model):
    """A timeline segment (wait + process time) in a VSM chart."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chart = models.ForeignKey(
        VsmChart, on_delete=models.CASCADE,
        related_name="timeline_segments",
    )
    process = models.ForeignKey(
        VsmChartProcess, on_delete=models.CASCADE,
        null=True, blank=True, related_name="timeline_segments",
    )
    sequence = models.IntegerField()
    wait_time_value = models.FloatField(null=True, blank=True)
    wait_time_unit = models.CharField(max_length=20, blank=True, default="days")
    process_time_value = models.FloatField(null=True, blank=True)
    process_time_unit = models.CharField(max_length=20, blank=True, default="sec")
    label = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_vsm_chart_timeline"
        ordering = ["sequence"]

    def __str__(self):
        return f"TL seg {self.sequence}: {self.label}"


class VsmDemandTakt(models.Model):
    """Dedicated table for Demand & Takt parameters — one record per VSM chart."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chart = models.OneToOneField(
        VsmChart, on_delete=models.CASCADE,
        related_name="demand_takt",
        help_text="The VSM chart this demand/takt record belongs to",
    )
    customer_demand_rate = models.FloatField(
        null=True, blank=True,
        help_text="Customer demand in units per period",
    )
    customer_demand_unit = models.CharField(
        max_length=50, blank=True, default="units",
    )
    customer_demand_period = models.CharField(
        max_length=20, blank=True, default="day",
    )
    available_minutes_per_shift = models.FloatField(
        null=True, blank=True, default=576.0,
        help_text="Available working minutes per shift",
    )
    break_time_per_shift = models.FloatField(
        null=True, blank=True, default=36.0,
        help_text="Break time in minutes per shift",
    )
    planned_downtime_per_shift = models.FloatField(
        null=True, blank=True, default=30.0,
        help_text="Planned downtime in minutes per shift",
    )
    chart_shifts_per_day = models.IntegerField(
        null=True, blank=True, default=1,
    )
    working_days_per_week = models.IntegerField(
        null=True, blank=True, default=5,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_vsm_demand_takt"
        verbose_name = "VSM Demand & Takt"

    def __str__(self):
        rate = self.customer_demand_rate or "—"
        return f"Demand: {rate} {self.customer_demand_unit}/{self.customer_demand_period}"


class VsmImprovementOpportunity(models.Model):
    """An improvement opportunity / kaizen target identified on the VSM."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chart = models.ForeignKey(
        VsmChart, on_delete=models.CASCADE,
        related_name="improvement_opportunities",
    )
    process = models.ForeignKey(
        VsmChartProcess, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="improvement_opportunities",
    )
    inventory = models.ForeignKey(
        VsmChartInventory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="improvement_opportunities",
    )
    opportunity_type = models.CharField(
        max_length=30, choices=ImprovementOpportunityType.choices,
    )
    severity = models.CharField(
        max_length=20, choices=ImprovementOpportunitySeverity.choices,
    )
    label = models.CharField(max_length=255)
    message = models.TextField(blank=True, default="")
    acknowledged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_vsm_improvement_opp"
        ordering = ["-severity", "created_at"]

    def __str__(self):
        return f"[{self.severity}] {self.label}"


class GembaObservationActivity(models.Model):
    """Activity/audit trail for a Gemba observation."""

    observation = models.ForeignKey(
        GembaObservation, on_delete=models.CASCADE,
        related_name="activities",
    )
    event_type = models.CharField(
        max_length=30, choices=GEMBA_EVENT_TYPE_CHOICES,
        default=GEMBA_EVENT_CREATED,
    )
    message = models.TextField(blank=True, default="")
    old_status = models.CharField(max_length=25, null=True, blank=True)
    new_status = models.CharField(max_length=25, null=True, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="gemba_activities",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "execution_gemba_observation_activity"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["observation"], name="exec_gemba_act_obs_idx"),
            models.Index(fields=["event_type"], name="exec_gemba_act_type_idx"),
        ]

    def __str__(self):
        return f"{self.event_type}: {self.message[:60]}"
