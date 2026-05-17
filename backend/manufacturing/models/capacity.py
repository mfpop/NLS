from django.conf import settings
from django.db import models
from django.utils import timezone
from shared.models.base import TimeStampedModel


class CapacityMode(models.TextChoices):
    RESOURCE_SUM = "RESOURCE_SUM", "Sum of Resources"
    BOTTLENECK = "BOTTLENECK", "Bottleneck"
    MANUAL = "MANUAL", "Manual"
    INHERITED = "INHERITED", "Inherited"


class ScheduleScope(models.TextChoices):
    PLANT = "PLANT", "Plant"
    PRODUCTION_LINE = "PRODUCTION_LINE", "Production Line"
    DEPARTMENT = "DEPARTMENT", "Department"
    RESOURCE_GROUP = "RESOURCE_GROUP", "Resource Group"
    RESOURCE = "RESOURCE", "Resource"


class CapacitySnapshotType(models.TextChoices):
    PLANNING = "PLANNING", "Planning"
    EXECUTION = "EXECUTION", "Execution"


class CapacitySnapshotStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    FROZEN = "FROZEN", "Frozen"


class CapacityConstraintReason(models.TextChoices):
    MACHINE = "MACHINE", "Machine"
    LABOR = "LABOR", "Labor"
    BALANCED = "BALANCED", "Balanced"
    NO_SCHEDULE = "NO_SCHEDULE", "No Schedule"
    NO_LABOR = "NO_LABOR", "No Labor"
    NO_MACHINE = "NO_MACHINE", "No Machine"


class WorkSchedule(models.Model):
    scope_type = models.CharField(max_length=30, choices=ScheduleScope.choices)
    scope_id = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    timezone = models.CharField(max_length=100, blank=True, default="UTC")
    effective_from = models.DateTimeField()
    effective_to = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_work_schedule"
        ordering = ["scope_type", "scope_id", "effective_from"]
        verbose_name = "Work Schedule"
        verbose_name_plural = "Work Schedules"
        indexes = [
            models.Index(fields=["scope_type", "scope_id", "is_active"], name="ws_scope_active_idx"),
            models.Index(fields=["effective_from", "effective_to"], name="ws_effective_idx"),
        ]

    def __str__(self):
        return f"{self.scope_type}:{self.scope_id} / {self.name}"


class WorkShift(models.Model):
    schedule = models.ForeignKey(
        WorkSchedule, on_delete=models.CASCADE, related_name="shifts",
    )
    name = models.CharField(max_length=100)
    weekday = models.IntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    crosses_midnight = models.BooleanField(default=False)
    paid_minutes = models.IntegerField(default=0)
    break_minutes = models.IntegerField(default=0)
    net_minutes = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "manufacturing_work_shift"
        ordering = ["schedule", "weekday", "start_time"]
        verbose_name = "Work Shift"
        verbose_name_plural = "Work Shifts"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(paid_minutes__gt=0),
                name="ws_paid_minutes_gt_0",
            ),
            models.CheckConstraint(
                condition=models.Q(break_minutes__gte=0),
                name="ws_break_minutes_gte_0",
            ),
            models.CheckConstraint(
                condition=models.Q(net_minutes__gt=0),
                name="ws_net_minutes_gt_0",
            ),
            models.CheckConstraint(
                condition=models.Q(net_minutes__lte=models.F("paid_minutes")),
                name="ws_net_minutes_lte_paid",
            ),
            models.CheckConstraint(
                condition=models.Q(weekday__gte=0, weekday__lte=6),
                name="ws_weekday_range",
            ),
            models.UniqueConstraint(
                fields=["schedule", "weekday", "start_time", "end_time", "name"],
                name="uq_ws_shift_slot",
            ),
        ]

    def save(self, *args, **kwargs):
        self.net_minutes = max(0, (self.paid_minutes or 0) - (self.break_minutes or 0))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.schedule.name} / {self.name} (day {self.weekday})"


class CapacityProfile(models.Model):
    scope_type = models.CharField(max_length=30, choices=ScheduleScope.choices)
    scope_id = models.CharField(max_length=50)
    capacity_mode = models.CharField(max_length=20, choices=CapacityMode.choices, default=CapacityMode.INHERITED)
    manual_capacity = models.FloatField(null=True, blank=True)
    capacity_uom = models.CharField(max_length=50, blank=True, default="")
    efficiency_factor = models.FloatField(default=1.0)
    oee_factor = models.FloatField(null=True, blank=True)
    takt_factor = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "manufacturing_capacity_profile"
        ordering = ["scope_type", "scope_id"]
        verbose_name = "Capacity Profile"
        verbose_name_plural = "Capacity Profiles"
        constraints = [
            models.UniqueConstraint(
                fields=["scope_type", "scope_id", "is_active"],
                name="uq_cap_profile_scope_active",
            ),
        ]
        indexes = [
            models.Index(fields=["scope_type", "scope_id"], name="cap_profile_scope_idx"),
        ]

    def __str__(self):
        return f"{self.scope_type}:{self.scope_id} ({self.capacity_mode})"


class CapacitySnapshot(models.Model):
    scope_type = models.CharField(max_length=30, choices=ScheduleScope.choices)
    scope_id = models.CharField(max_length=50)
    from_datetime = models.DateTimeField()
    to_datetime = models.DateTimeField()
    available_minutes = models.FloatField(default=0)
    theoretical_capacity = models.FloatField(default=0)
    effective_capacity = models.FloatField(default=0)
    bottleneck_capacity = models.FloatField(null=True, blank=True)
    capacity_uom = models.CharField(max_length=50, blank=True, default="")
    machine_capacity_units = models.FloatField(default=0)
    labor_capacity_units = models.FloatField(default=0)
    effective_capacity_units = models.FloatField(default=0)
    constraint_reason = models.CharField(
        max_length=20, choices=CapacityConstraintReason.choices,
        default=CapacityConstraintReason.NO_MACHINE, db_index=True,
    )
    machine_available_minutes = models.FloatField(default=0)
    labor_available_minutes = models.FloatField(default=0)
    operators_required = models.FloatField(default=0)
    operators_available = models.FloatField(default=0)
    snapshot_type = models.CharField(
        max_length=20, choices=CapacitySnapshotType.choices,
        default=CapacitySnapshotType.PLANNING,
        db_index=True,
    )
    status = models.CharField(
        max_length=20, choices=CapacitySnapshotStatus.choices,
        default=CapacitySnapshotStatus.ACTIVE,
        db_index=True,
    )
    version = models.PositiveIntegerField(default=1)
    calculated_at = models.DateTimeField(auto_now_add=True)
    missing_reasons = models.JSONField(default=list, blank=True)
    source_schedule = models.ForeignKey(
        WorkSchedule, on_delete=models.SET_NULL, null=True, blank=True, related_name="snapshots",
    )
    source_profile = models.ForeignKey(
        CapacityProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="snapshots",
    )

    class Meta:
        db_table = "manufacturing_capacity_snapshot"
        ordering = ["scope_type", "scope_id", "from_datetime"]
        verbose_name = "Capacity Snapshot"
        verbose_name_plural = "Capacity Snapshots"
        indexes = [
            models.Index(fields=["scope_type", "scope_id", "from_datetime", "to_datetime"], name="cap_snap_scope_window_idx"),
            models.Index(fields=["scope_type", "scope_id", "snapshot_type", "status"], name="cap_snap_scope_state_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["scope_type", "scope_id", "from_datetime", "to_datetime", "snapshot_type", "version"],
                name="uq_cap_snap_scope_window_ver",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            original = CapacitySnapshot.objects.filter(pk=self.pk).only("snapshot_type", "status").first()
            if original and (
                original.status == CapacitySnapshotStatus.FROZEN
                or original.snapshot_type == CapacitySnapshotType.EXECUTION
            ):
                raise ValueError("Frozen or execution capacity snapshots are immutable.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.scope_type}:{self.scope_id} [{self.from_datetime} - {self.to_datetime}]"


class LaborRequirement(models.Model):
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.PROTECT,
        related_name="labor_requirements",
    )
    resource_group = models.ForeignKey(
        "manufacturing.ResourceGroup", on_delete=models.PROTECT,
        related_name="labor_requirements", null=True, blank=True,
    )
    routing_step = models.ForeignKey(
        "manufacturing.RoutingStep", on_delete=models.PROTECT,
        related_name="labor_requirements", null=True, blank=True,
    )
    product_model = models.ForeignKey(
        "manufacturing.ProductModel", on_delete=models.SET_NULL,
        related_name="labor_requirements", null=True, blank=True,
    )
    operators_required = models.PositiveIntegerField()
    labor_minutes_per_unit = models.FloatField()
    skill_required = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        related_name="labor_requirements", null=True, blank=True,
    )
    is_active = models.BooleanField(default=True)
    effective_from = models.DateTimeField()
    effective_to = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_labor_requirement"
        ordering = ["plant", "resource_group", "routing_step", "effective_from"]
        indexes = [
            models.Index(fields=["plant", "resource_group", "is_active"], name="labor_req_rg_active_idx"),
            models.Index(fields=["plant", "routing_step", "is_active"], name="labor_req_step_active_idx"),
            models.Index(fields=["effective_from", "effective_to"], name="labor_req_effective_idx"),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if not self.resource_group_id and not self.routing_step_id:
            raise ValidationError("Labor requirement must target a resource group or routing step.")
        if self.resource_group_id and self.routing_step_id:
            raise ValidationError("Labor requirement cannot target both resource group and routing step.")
        if self.operators_required <= 0:
            raise ValidationError("operators_required must be greater than 0.")
        if self.labor_minutes_per_unit <= 0:
            raise ValidationError("labor_minutes_per_unit must be greater than 0.")
        if self.resource_group_id and self.resource_group.department.plant_id != self.plant_id:
            raise ValidationError("Labor requirement resource group must belong to the same plant.")
        if self.routing_step_id:
            line = self.routing_step.routing.production_line
            if line and line.plant_id != self.plant_id:
                raise ValidationError("Labor requirement routing step must belong to the same plant.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class OperatorAssignment(models.Model):
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.PROTECT,
        related_name="operator_assignments",
    )
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="operator_assignments",
    )
    resource_group = models.ForeignKey(
        "manufacturing.ResourceGroup", on_delete=models.PROTECT,
        related_name="operator_assignments", null=True, blank=True,
    )
    resource = models.ForeignKey(
        "manufacturing.Resource", on_delete=models.PROTECT,
        related_name="operator_assignments", null=True, blank=True,
    )
    schedule_assignment = models.ForeignKey(
        "manufacturing.ScheduleAssignment", on_delete=models.PROTECT,
        related_name="operator_assignments",
    )
    skill = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        related_name="operator_assignments", null=True, blank=True,
    )
    effective_from = models.DateTimeField()
    effective_to = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_operator_assignment"
        ordering = ["plant", "operator", "effective_from"]
        indexes = [
            models.Index(fields=["plant", "resource_group", "is_active"], name="op_assign_rg_active_idx"),
            models.Index(fields=["plant", "resource", "is_active"], name="op_assign_res_active_idx"),
            models.Index(fields=["operator", "is_active", "effective_from"], name="op_assign_person_active_idx"),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if not self.resource_group_id and not self.resource_id:
            raise ValidationError("Operator assignment must target a resource group or resource.")
        if self.resource_group_id and self.resource_id:
            raise ValidationError("Operator assignment cannot target both resource group and resource.")
        if self.schedule_assignment_id and not self.schedule_assignment.is_active:
            raise ValidationError("Operator assignment requires an active schedule assignment.")
        if self.resource_group_id and self.resource_group.department.plant_id != self.plant_id:
            raise ValidationError("Operator assignment resource group must belong to the same plant.")
        if self.resource_id and self.resource.resource_group.department.plant_id != self.plant_id:
            raise ValidationError("Operator assignment resource must belong to the same plant.")
        if self.schedule_assignment_id and self.schedule_assignment.plant_id and self.schedule_assignment.plant_id != self.plant_id:
            raise ValidationError("Operator assignment schedule must belong to the same plant.")
        end = self.effective_to or timezone.datetime.max.replace(tzinfo=self.effective_from.tzinfo)
        overlaps = OperatorAssignment.objects.filter(
            operator_id=self.operator_id,
            schedule_assignment_id=self.schedule_assignment_id,
            is_active=True,
            effective_from__lt=end,
        ).filter(
            models.Q(effective_to__isnull=True) | models.Q(effective_to__gt=self.effective_from)
        )
        if self.pk:
            overlaps = overlaps.exclude(pk=self.pk)
        if overlaps.exists():
            raise ValidationError("Operator has an overlapping assignment for this schedule.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class CapacityPlanStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    CALCULATED = "CALCULATED", "Calculated"
    HAS_WARNINGS = "HAS_WARNINGS", "Has Warnings"
    APPROVED = "APPROVED", "Approved"
    ARCHIVED = "ARCHIVED", "Archived"


class FeasibilityStatus(models.TextChoices):
    FEASIBLE = "FEASIBLE", "Feasible"
    WARNING = "WARNING", "Warning"
    INFEASIBLE = "INFEASIBLE", "Infeasible"
    MISSING_DATA = "MISSING_DATA", "Missing Data"


class CapacityPlan(TimeStampedModel):
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.PROTECT, related_name="capacity_plans",
    )
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.PROTECT, related_name="capacity_plans",
    )
    product_model = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.PROTECT, related_name="capacity_plans_as_model",
    )
    routing_version = models.ForeignKey(
        "manufacturing.Routing", on_delete=models.PROTECT, related_name="capacity_plans",
    )
    planning_horizon_start = models.DateField()
    planning_horizon_end = models.DateField()
    status = models.CharField(
        max_length=20, choices=CapacityPlanStatus.choices,
        default=CapacityPlanStatus.DRAFT, db_index=True,
    )
    calculated_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="created_capacity_plans",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="updated_capacity_plans",
    )
    calculated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="calculated_capacity_plans",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="approved_capacity_plans",
    )

    class Meta:
        db_table = "manufacturing_capacity_plan"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["plant", "status"], name="cap_plan_plant_status_idx"),
            models.Index(fields=["production_line", "product_model"], name="cap_plan_line_model_idx"),
            models.Index(fields=["planning_horizon_start", "planning_horizon_end"], name="cap_plan_horizon_idx"),
        ]


class CapacityPlanInput(TimeStampedModel):
    capacity_plan = models.OneToOneField(
        CapacityPlan, on_delete=models.CASCADE, related_name="inputs",
    )
    planned_quantity = models.PositiveIntegerField(default=0)
    available_time_minutes = models.FloatField(default=0)
    break_time_minutes = models.FloatField(default=0)
    planned_downtime_minutes = models.FloatField(default=0)
    net_available_time_minutes = models.FloatField(default=0)
    operators_available = models.PositiveIntegerField(default=1)
    efficiency_factor = models.FloatField(default=1.0)
    takt_time_seconds = models.FloatField(default=0)

    class Meta:
        db_table = "manufacturing_capacity_plan_input"


class CapacityPlanResult(TimeStampedModel):
    capacity_plan = models.OneToOneField(
        CapacityPlan, on_delete=models.CASCADE, related_name="result",
    )
    total_work_content_seconds = models.FloatField(default=0)
    required_capacity_minutes = models.FloatField(default=0)
    available_capacity_minutes = models.FloatField(default=0)
    capacity_utilization_percent = models.FloatField(default=0)
    balance_loss_percent = models.FloatField(default=0)
    operators_required = models.PositiveIntegerField(default=0)
    feasibility_status = models.CharField(
        max_length=20, choices=FeasibilityStatus.choices,
        default=FeasibilityStatus.MISSING_DATA,
    )
    warnings_json = models.JSONField(default=list, blank=True)
    load_rows_json = models.JSONField(default=list, blank=True)
    yamazumi_json = models.JSONField(default=dict, blank=True)
    constraints_json = models.JSONField(default=list, blank=True)
    bottleneck_resource = models.ForeignKey(
        "manufacturing.Resource", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    bottleneck_step = models.ForeignKey(
        "manufacturing.RoutingStep", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )

    class Meta:
        db_table = "manufacturing_capacity_plan_result"


class CapacityScenario(TimeStampedModel):
    capacity_plan = models.ForeignKey(
        CapacityPlan, on_delete=models.CASCADE, related_name="scenarios",
    )
    name = models.CharField(max_length=120)
    assumptions_json = models.JSONField(default=dict, blank=True)
    result_json = models.JSONField(default=dict, blank=True)
    is_baseline = models.BooleanField(default=False)

    class Meta:
        db_table = "manufacturing_capacity_scenario"
        ordering = ["-is_baseline", "-updated_at"]
        indexes = [
            models.Index(fields=["capacity_plan", "is_baseline"], name="cap_scenario_baseline_idx"),
        ]


class CapacityRecalculationJob(models.Model):
    class TriggerType(models.TextChoices):
        SCHEDULE_CHANGED = "SCHEDULE_CHANGED", "Schedule Changed"
        PROFILE_CHANGED = "PROFILE_CHANGED", "Profile Changed"
        STRUCTURE_CHANGED = "STRUCTURE_CHANGED", "Structure Changed"

    class JobStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        RUNNING = "RUNNING", "Running"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    trigger_type = models.CharField(max_length=30, choices=TriggerType.choices)
    scope_type = models.CharField(max_length=30, choices=ScheduleScope.choices)
    scope_id = models.CharField(max_length=50)
    from_datetime = models.DateTimeField()
    to_datetime = models.DateTimeField()
    status = models.CharField(max_length=20, choices=JobStatus.choices, default=JobStatus.PENDING)
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "manufacturing_capacity_recalc_job"
        ordering = ["-created_at"]
        verbose_name = "Capacity Recalculation Job"
        verbose_name_plural = "Capacity Recalculation Jobs"
        indexes = [
            models.Index(fields=["status"], name="recalc_job_status_idx"),
            models.Index(fields=["scope_type", "scope_id"], name="recalc_job_scope_idx"),
            models.Index(fields=["created_at"], name="recalc_job_created_idx"),
        ]

    def __str__(self):
        return f"{self.trigger_type}:{self.scope_type}:{self.scope_id} ({self.status})"
