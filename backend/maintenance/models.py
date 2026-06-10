from django.db import models
from shared.models.base import TimeStampedModel
from maintenance.constants import (
    WORK_ORDER_TYPE_CHOICES,
    WORK_ORDER_STATUS_CHOICES,
    WORK_ORDER_STATUS_DRAFT,
    WORK_ORDER_PRIORITY_CHOICES,
    WORK_ORDER_PRIORITY_MEDIUM,
    PM_FREQUENCY_CHOICES,
    PM_STATUS_CHOICES,
    PM_STATUS_ACTIVE,
    BREAKDOWN_SEVERITY_CHOICES,
    BREAKDOWN_SEVERITY_MEDIUM,
    BREAKDOWN_STATUS_CHOICES,
    BREAKDOWN_STATUS_REPORTED,
    SPARE_PART_STATUS_CHOICES,
    SPARE_PART_STATUS_ACTIVE,
)


class MaintenanceWorkOrder(TimeStampedModel):
    number = models.CharField(max_length=50, unique=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    work_order_type = models.CharField(
        max_length=30, choices=WORK_ORDER_TYPE_CHOICES,
    )
    # Target hierarchy
    target_type = models.CharField(max_length=100, blank=True, default="")
    target_id = models.IntegerField(null=True, blank=True)
    plant_id = models.IntegerField(null=True, blank=True)
    production_line_id = models.IntegerField(null=True, blank=True)
    department_id = models.IntegerField(null=True, blank=True)
    resource_group_id = models.IntegerField(null=True, blank=True)
    resource_id = models.IntegerField(null=True, blank=True)
    priority = models.CharField(
        max_length=20, choices=WORK_ORDER_PRIORITY_CHOICES,
        default=WORK_ORDER_PRIORITY_MEDIUM,
    )
    status = models.CharField(
        max_length=30, choices=WORK_ORDER_STATUS_CHOICES,
        default=WORK_ORDER_STATUS_DRAFT,
    )
    requested_by = models.CharField(max_length=255, blank=True, default="")
    assigned_to = models.CharField(max_length=255, blank=True, default="")
    # Dates
    date_opened = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    planned_start_date = models.DateTimeField(null=True, blank=True)
    planned_end_date = models.DateTimeField(null=True, blank=True)
    actual_start_date = models.DateTimeField(null=True, blank=True)
    actual_end_date = models.DateTimeField(null=True, blank=True)
    downtime_minutes = models.IntegerField(null=True, blank=True)
    # Work details
    work_instructions = models.TextField(blank=True, default="")
    failure_mode = models.TextField(blank=True, default="")
    safety_notes = models.TextField(blank=True, default="")
    required_tools = models.TextField(blank=True, default="")
    labor_estimate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    actual_labor_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    # Completion fields
    work_performed = models.TextField(blank=True, default="")
    completion_notes = models.TextField(blank=True, default="")
    parts_used_notes = models.TextField(blank=True, default="")
    root_cause = models.TextField(blank=True, default="")
    corrective_action = models.TextField(blank=True, default="")
    verification_result = models.TextField(blank=True, default="")
    # Spare parts & attachments
    spare_parts_required = models.JSONField(null=True, blank=True,
        help_text="JSON array of required spare parts")
    attachments = models.JSONField(null=True, blank=True,
        help_text="JSON array of attachment metadata")
    # Optional links
    linked_pm = models.ForeignKey(
        "PreventiveMaintenancePlan", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="work_orders",
    )
    linked_breakdown = models.ForeignKey(
        "Breakdown", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="work_orders",
    )
    linked_mer = models.ForeignKey(
        "improvement.ManufacturingEngineeringRequest", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="maintenance_work_orders",
    )

    class Meta:
        app_label = "maintenance"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.number or self.title} ({self.status})"


class PreventiveMaintenancePlan(TimeStampedModel):
    code = models.CharField(max_length=50, unique=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    frequency = models.CharField(max_length=30, choices=PM_FREQUENCY_CHOICES)
    interval_value = models.IntegerField(null=True, blank=True,
        help_text="Number of days/cycles between PM executions")
    next_due_date = models.DateField(null=True, blank=True)
    last_completed_date = models.DateField(null=True, blank=True)
    assigned_to = models.CharField(max_length=255, blank=True, default="")
    priority = models.CharField(
        max_length=20, choices=WORK_ORDER_PRIORITY_CHOICES,
        default=WORK_ORDER_PRIORITY_MEDIUM,
    )
    status = models.CharField(
        max_length=30, choices=PM_STATUS_CHOICES, default=PM_STATUS_ACTIVE,
    )
    checklist_json = models.JSONField(null=True, blank=True,
        help_text="JSON array of checklist items")
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "maintenance"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.code or self.title} ({self.status})"


class Breakdown(TimeStampedModel):
    number = models.CharField(max_length=50, unique=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    target_type = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    severity = models.CharField(
        max_length=20, choices=BREAKDOWN_SEVERITY_CHOICES,
        default=BREAKDOWN_SEVERITY_MEDIUM,
    )
    priority = models.CharField(
        max_length=20, choices=WORK_ORDER_PRIORITY_CHOICES,
        default=WORK_ORDER_PRIORITY_MEDIUM,
    )
    status = models.CharField(
        max_length=30, choices=BREAKDOWN_STATUS_CHOICES,
        default=BREAKDOWN_STATUS_REPORTED,
    )
    reported_by = models.CharField(max_length=255, blank=True, default="")
    assigned_to = models.CharField(max_length=255, blank=True, default="")
    reported_at = models.DateTimeField(auto_now_add=True)
    repair_started_at = models.DateTimeField(null=True, blank=True)
    repair_completed_at = models.DateTimeField(null=True, blank=True)
    downtime_start = models.DateTimeField(null=True, blank=True)
    downtime_end = models.DateTimeField(null=True, blank=True)
    downtime_minutes = models.IntegerField(null=True, blank=True)
    failure_mode = models.TextField(blank=True, default="")
    safety_impact = models.TextField(blank=True, default="")
    production_impact = models.TextField(blank=True, default="")
    is_equipment_down = models.BooleanField(default=False)
    temporary_containment = models.TextField(blank=True, default="")
    suspected_cause = models.TextField(blank=True, default="")
    confirmed_root_cause = models.TextField(blank=True, default="")
    corrective_action = models.TextField(blank=True, default="")
    parts_required = models.TextField(blank=True, default="")
    repair_notes = models.TextField(blank=True, default="")
    verification_result = models.TextField(blank=True, default="")
    completion_notes = models.TextField(blank=True, default="")
    root_cause = models.TextField(blank=True, default="")
    repair_summary = models.TextField(blank=True, default="")
    # Optional link to WO
    linked_work_order = models.ForeignKey(
        "MaintenanceWorkOrder", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="originating_breakdowns",
    )

    class Meta:
        app_label = "maintenance"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.number or self.title} ({self.status})"


class SparePart(TimeStampedModel):
    part_number = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=100, blank=True, default="")
    manufacturer = models.CharField(max_length=255, blank=True, default="")
    supplier = models.CharField(max_length=255, blank=True, default="")
    uom = models.CharField(max_length=50, blank=True, default="")
    min_quantity = models.IntegerField(default=0)
    quantity_on_hand = models.IntegerField(default=0)
    storage_location = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=SPARE_PART_STATUS_CHOICES,
        default=SPARE_PART_STATUS_ACTIVE,
    )

    class Meta:
        app_label = "maintenance"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.part_number} - {self.name}"


class SparePartUsage(TimeStampedModel):
    part = models.ForeignKey(
        SparePart, on_delete=models.CASCADE, related_name="usages",
    )
    work_order = models.ForeignKey(
        MaintenanceWorkOrder, on_delete=models.CASCADE,
        related_name="spare_part_usages",
    )
    quantity = models.IntegerField()
    used_by = models.CharField(max_length=255, blank=True, default="")
    used_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        app_label = "maintenance"
        ordering = ["-used_at"]

    def __str__(self):
        return f"{self.part.part_number} x{self.quantity} for WO {self.work_order_id}"
