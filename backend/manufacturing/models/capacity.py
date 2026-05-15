from django.conf import settings
from django.db import models

from shared.models.base import TimeStampedModel


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
    plant = models.ForeignKey("manufacturing.Plant", on_delete=models.PROTECT, related_name="capacity_plans")
    production_line = models.ForeignKey("manufacturing.ProductionLine", on_delete=models.PROTECT, related_name="capacity_plans")
    product_model = models.ForeignKey("manufacturing.ReferenceValue", on_delete=models.PROTECT, related_name="capacity_plans_as_model")
    routing_version = models.ForeignKey("manufacturing.Routing", on_delete=models.PROTECT, related_name="capacity_plans")
    planning_horizon_start = models.DateField()
    planning_horizon_end = models.DateField()
    status = models.CharField(max_length=20, choices=CapacityPlanStatus.choices, default=CapacityPlanStatus.DRAFT, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_capacity_plans")
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="updated_capacity_plans")
    calculated_at = models.DateTimeField(null=True, blank=True)
    calculated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="calculated_capacity_plans")
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_capacity_plans")

    class Meta:
        db_table = "manufacturing_capacity_plan"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["plant", "status"], name="cap_plan_plant_status_idx"),
            models.Index(fields=["production_line", "product_model"], name="cap_plan_line_model_idx"),
            models.Index(fields=["planning_horizon_start", "planning_horizon_end"], name="cap_plan_horizon_idx"),
        ]

    def __str__(self):
        return f"{self.production_line.name} / {self.product_model.name} ({self.status})"


class CapacityPlanInput(TimeStampedModel):
    capacity_plan = models.OneToOneField(CapacityPlan, on_delete=models.CASCADE, related_name="inputs")
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
    capacity_plan = models.OneToOneField(CapacityPlan, on_delete=models.CASCADE, related_name="result")
    total_work_content_seconds = models.FloatField(default=0)
    required_capacity_minutes = models.FloatField(default=0)
    available_capacity_minutes = models.FloatField(default=0)
    capacity_utilization_percent = models.FloatField(default=0)
    bottleneck_step = models.ForeignKey("manufacturing.RoutingStep", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    bottleneck_resource = models.ForeignKey("manufacturing.Resource", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    balance_loss_percent = models.FloatField(default=0)
    operators_required = models.PositiveIntegerField(default=0)
    feasibility_status = models.CharField(max_length=20, choices=FeasibilityStatus.choices, default=FeasibilityStatus.MISSING_DATA)
    warnings_json = models.JSONField(default=list, blank=True)
    load_rows_json = models.JSONField(default=list, blank=True)
    yamazumi_json = models.JSONField(default=dict, blank=True)
    constraints_json = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "manufacturing_capacity_plan_result"


class CapacityScenario(TimeStampedModel):
    capacity_plan = models.ForeignKey(CapacityPlan, on_delete=models.CASCADE, related_name="scenarios")
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
