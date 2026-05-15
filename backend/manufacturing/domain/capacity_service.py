from __future__ import annotations

import math
from datetime import date
from typing import Any, Optional

from django.db import transaction
from django.utils import timezone

from manufacturing.domain.routing_service import RoutingService
from manufacturing.models import (
    CapacityPlan, CapacityPlanInput, CapacityPlanResult, CapacityPlanStatus,
    CapacityScenario, FeasibilityStatus, Plant, ProductionLine, ReferenceValue,
    ProductionLineProductModel, Routing,
)


class CapacityValidationError(Exception):
    def __init__(self, message: str, field: str = "_form", code: str = "VALIDATION"):
        self.message = message
        self.field = field
        self.code = code
        super().__init__(message)


def _parse_date(value: Any, field: str) -> date:
    if isinstance(value, date):
        return value
    if not value:
        raise CapacityValidationError("Planning horizon date is required", field)
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        raise CapacityValidationError("Use YYYY-MM-DD date format", field)


def _user_or_none(user):
    return user if getattr(user, "is_authenticated", False) else None


class YamazumiBalanceService:
    @staticmethod
    def build(steps: list, takt_time_seconds: float, metric: str = "SETUP_INCLUSIVE") -> dict[str, Any]:
        items = []
        max_work = 0.0
        for step in steps:
            cycle = float(step.cycle_time_sec or 0)
            setup = float(step.setup_time_sec or 0)
            changeover = float(step.changeover_time_sec or 0)
            if metric == "CYCLE_TIME":
                work = cycle
            elif metric == "MANUAL_TIME":
                work = cycle
            elif metric == "AUTO_TIME":
                work = 0
            else:
                work = cycle + setup + changeover
            max_work = max(max_work, work)
            items.append({
                "stepId": str(step.id),
                "sequence": step.sequence,
                "departmentId": str(step.department_id) if step.department_id else None,
                "departmentName": step.department.name if step.department else "",
                "resourceGroupId": str(step.resource_group_id) if step.resource_group_id else None,
                "resourceGroupName": step.resource_group.name if step.resource_group else "",
                "resourceId": str(step.resource_id) if step.resource_id else None,
                "resourceName": step.resource.name if step.resource else "",
                "standardWorkName": step.standard_work.name if step.standard_work else "",
                "operator": step.required_operators or 1,
                "cycleTimeSeconds": cycle,
                "manualTimeSeconds": cycle,
                "autoTimeSeconds": 0,
                "setupInclusiveSeconds": cycle + setup + changeover,
                "workContentSeconds": work,
                "taktTimeSeconds": takt_time_seconds,
                "loadPercent": (work / takt_time_seconds * 100) if takt_time_seconds else 0,
                "isBottleneck": False,
                "isOverloaded": work > takt_time_seconds if takt_time_seconds else False,
            })
        for item in items:
            item["isBottleneck"] = item["workContentSeconds"] == max_work and max_work > 0
        return {
            "metric": metric,
            "taktTimeSeconds": takt_time_seconds,
            "balanceLossPercent": CapacityCalculationService.calculate_balance_loss([i["workContentSeconds"] for i in items]),
            "items": items,
        }


class ConstraintDetectionService:
    @staticmethod
    def detect(plan: CapacityPlan, inputs: CapacityPlanInput, steps: list, load_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        constraints: list[dict[str, Any]] = []
        if inputs.takt_time_seconds <= 0:
            constraints.append({
                "severity": "CRITICAL",
                "source": "Capacity Inputs",
                "type": "TACT_MISSING",
                "message": "Takt time is missing.",
                "affected": plan.production_line.name,
                "recommendedAction": "Complete capacity planning inputs.",
                "action": "Adjust Scenario",
            })
        for step in steps:
            if not step.cycle_time_sec or step.cycle_time_sec <= 0:
                constraints.append({
                    "severity": "CRITICAL",
                    "source": "Routing",
                    "type": "MISSING_CT",
                    "message": f"Step {step.sequence} is missing cycle time.",
                    "affected": step.resource_group.name if step.resource_group else plan.production_line.name,
                    "recommendedAction": "Open Routing and complete CT.",
                    "action": "Open Routing",
                })
            if not step.standard_work:
                constraints.append({
                    "severity": "WARNING",
                    "source": "Routing",
                    "type": "MISSING_STANDARD_WORK",
                    "message": f"Step {step.sequence} has no standard work link.",
                    "affected": step.department.name if step.department else plan.production_line.name,
                    "recommendedAction": "Link standard work in Flow/Routing.",
                    "action": "Open Routing",
                })
            if inputs.takt_time_seconds and (step.cycle_time_sec or 0) > inputs.takt_time_seconds:
                constraints.append({
                    "severity": "CRITICAL",
                    "source": "Yamazumi",
                    "type": "CT_ABOVE_TAKT",
                    "message": f"Step {step.sequence} cycle time is above takt.",
                    "affected": step.resource.name if step.resource else step.resource_group.name if step.resource_group else plan.production_line.name,
                    "recommendedAction": "Reduce CT, add operators, or rebalance work.",
                    "action": "Adjust Scenario",
                })
        for row in load_rows:
            if row["status"] == "OVERLOADED":
                constraints.append({
                    "severity": "CRITICAL",
                    "source": row["level"],
                    "type": "OVERLOADED_RESOURCE",
                    "message": f"{row['area']} is overloaded.",
                    "affected": row["area"],
                    "recommendedAction": "Add capacity, shift work, or reduce demand.",
                    "action": "Adjust Scenario",
                })
            if row["status"] == "MISSING_DATA":
                constraints.append({
                    "severity": "WARNING",
                    "source": row["level"],
                    "type": "MISSING_RESOURCE_SCHEDULE",
                    "message": f"{row['area']} is missing resource availability.",
                    "affected": row["area"],
                    "recommendedAction": "Open Resource and complete schedule/capacity data.",
                    "action": "Open Resource",
                })
        if inputs.operators_available < max(1, math.ceil(sum((s.cycle_time_sec or 0) for s in steps) / max(inputs.takt_time_seconds, 1))):
            constraints.append({
                "severity": "CRITICAL",
                "source": "Labor",
                "type": "INSUFFICIENT_OPERATORS",
                "message": "Operators available are below calculated requirement.",
                "affected": plan.production_line.name,
                "recommendedAction": "Add operators, adjust demand, or rebalance routing.",
                "action": "Adjust Scenario",
            })
        return constraints


class CapacityCalculationService:
    @staticmethod
    def calculate_balance_loss(workloads: list[float]) -> float:
        if not workloads:
            return 0.0
        max_work = max(workloads)
        ideal_total = max_work * len(workloads)
        return ((ideal_total - sum(workloads)) / ideal_total * 100) if ideal_total else 0.0

    @staticmethod
    def build_load_rows(steps: list, planned_quantity: int, available_capacity_minutes: float) -> list[dict[str, Any]]:
        buckets: dict[tuple[str, str], dict[str, Any]] = {}
        for step in steps:
            required_minutes = ((step.cycle_time_sec or 0) * planned_quantity) / 60
            entries = [
                ("DEPARTMENT", step.department.name if step.department else "Missing Department"),
                ("RESOURCE_GROUP", step.resource_group.name if step.resource_group else "Missing Resource Group"),
                ("RESOURCE", step.resource.name if step.resource else "Missing Resource"),
                ("SHIFT", step.get_schedule_source_display() if hasattr(step, "get_schedule_source_display") else step.schedule_source),
            ]
            for level, area in entries:
                key = (level, area)
                bucket = buckets.setdefault(key, {"level": level, "area": area, "requiredCapacityMinutes": 0.0})
                bucket["requiredCapacityMinutes"] += required_minutes
        rows = []
        for bucket in buckets.values():
            available = available_capacity_minutes
            required = bucket["requiredCapacityMinutes"]
            utilization = (required / available * 100) if available else 0
            if "Missing" in bucket["area"]:
                status = "MISSING_DATA"
            elif utilization >= 100:
                status = "OVERLOADED"
            elif utilization >= 85:
                status = "NEAR_CAPACITY"
            else:
                status = "OK"
            rows.append({
                **bucket,
                "availableCapacityMinutes": available,
                "utilizationPercent": utilization,
                "gapMinutes": available - required,
                "status": status,
            })
        return sorted(rows, key=lambda row: (row["level"], -row["utilizationPercent"], row["area"]))

    @staticmethod
    @transaction.atomic
    def calculate(plan: CapacityPlan, user=None) -> CapacityPlanResult:
        inputs = getattr(plan, "inputs", None)
        if not inputs:
            raise CapacityValidationError("Complete capacity planning inputs.", "inputs")
        steps = list(plan.routing_version.steps.select_related(
            "department", "resource_group", "resource", "standard_work"
        ).order_by("sequence"))
        routing_errors = RoutingService.validate_routing(str(plan.routing_version_id))
        if routing_errors:
            plan.status = CapacityPlanStatus.HAS_WARNINGS
        if inputs.planned_quantity <= 0:
            raise CapacityValidationError("Planned Quantity must be greater than 0.", "plannedQuantity")
        inputs.net_available_time_minutes = max(0, inputs.available_time_minutes - inputs.break_time_minutes - inputs.planned_downtime_minutes)
        if inputs.net_available_time_minutes <= 0:
            raise CapacityValidationError("Net Available Time must be greater than 0.", "netAvailableTimeMinutes")
        inputs.takt_time_seconds = (inputs.net_available_time_minutes * 60) / inputs.planned_quantity
        inputs.save()

        total_work_content_seconds = sum(float(step.cycle_time_sec or 0) + float(step.setup_time_sec or 0) + float(step.changeover_time_sec or 0) for step in steps)
        required_capacity_minutes = sum(float(step.cycle_time_sec or 0) * inputs.planned_quantity for step in steps) / 60
        available_capacity_minutes = inputs.net_available_time_minutes * inputs.operators_available * max(inputs.efficiency_factor, 0.01)
        utilization = (required_capacity_minutes / available_capacity_minutes * 100) if available_capacity_minutes else 0
        bottleneck_step = max(steps, key=lambda step: float(step.cycle_time_sec or 0), default=None)
        balance_loss = CapacityCalculationService.calculate_balance_loss([
            float(step.cycle_time_sec or 0) + float(step.setup_time_sec or 0) + float(step.changeover_time_sec or 0) for step in steps
        ])
        operators_required = max(1, math.ceil(total_work_content_seconds / inputs.takt_time_seconds)) if inputs.takt_time_seconds else 0
        load_rows = CapacityCalculationService.build_load_rows(steps, inputs.planned_quantity, available_capacity_minutes)
        yamazumi = YamazumiBalanceService.build(steps, inputs.takt_time_seconds)
        constraints = ConstraintDetectionService.detect(plan, inputs, steps, load_rows)
        warnings = [constraint["message"] for constraint in constraints]

        critical_constraints = [c for c in constraints if c["severity"] == "CRITICAL"]
        if not steps or routing_errors:
            feasibility = FeasibilityStatus.MISSING_DATA
        elif critical_constraints or utilization >= 100:
            feasibility = FeasibilityStatus.INFEASIBLE
        elif warnings or utilization >= 85:
            feasibility = FeasibilityStatus.WARNING
        else:
            feasibility = FeasibilityStatus.FEASIBLE

        result, _ = CapacityPlanResult.objects.update_or_create(
            capacity_plan=plan,
            defaults={
                "total_work_content_seconds": total_work_content_seconds,
                "required_capacity_minutes": required_capacity_minutes,
                "available_capacity_minutes": available_capacity_minutes,
                "capacity_utilization_percent": utilization,
                "bottleneck_step": bottleneck_step,
                "bottleneck_resource": bottleneck_step.resource if bottleneck_step and bottleneck_step.resource else None,
                "balance_loss_percent": balance_loss,
                "operators_required": operators_required,
                "feasibility_status": feasibility,
                "warnings_json": warnings,
                "load_rows_json": load_rows,
                "yamazumi_json": yamazumi,
                "constraints_json": constraints,
            },
        )
        plan.status = CapacityPlanStatus.HAS_WARNINGS if feasibility in (FeasibilityStatus.WARNING, FeasibilityStatus.INFEASIBLE, FeasibilityStatus.MISSING_DATA) else CapacityPlanStatus.CALCULATED
        plan.calculated_at = timezone.now()
        plan.calculated_by = _user_or_none(user)
        plan.updated_by = _user_or_none(user)
        plan.save()
        CapacityScenario.objects.get_or_create(
            capacity_plan=plan,
            is_baseline=True,
            defaults={"name": "Baseline", "assumptions_json": {}, "result_json": CapacityPlanService.result_snapshot(result)},
        )
        return result


class ScenarioSimulationService:
    @staticmethod
    def create(plan: CapacityPlan, name: str, assumptions: dict[str, Any]) -> CapacityScenario:
        if plan.status == CapacityPlanStatus.APPROVED and assumptions.get("baseline"):
            raise CapacityValidationError("Approved baseline cannot be overwritten.", "scenario")
        result = getattr(plan, "result", None)
        return CapacityScenario.objects.create(
            capacity_plan=plan,
            name=name.strip() or "Scenario",
            assumptions_json=assumptions,
            result_json=CapacityPlanService.result_snapshot(result) if result else {},
            is_baseline=False,
        )


class CapacityPlanService:
    @staticmethod
    def result_snapshot(result: Optional[CapacityPlanResult]) -> dict[str, Any]:
        if not result:
            return {}
        return {
            "capacityUtilizationPercent": result.capacity_utilization_percent,
            "operatorsRequired": result.operators_required,
            "feasibilityStatus": result.feasibility_status,
            "balanceLossPercent": result.balance_loss_percent,
            "warnings": result.warnings_json,
        }

    @staticmethod
    def _get_plan(plan_id: str) -> CapacityPlan:
        try:
            return CapacityPlan.objects.select_related(
                "plant", "production_line", "product_model", "routing_version"
            ).get(id=plan_id)
        except CapacityPlan.DoesNotExist:
            raise CapacityValidationError("Capacity plan not found.", "id", "NOT_FOUND")

    @staticmethod
    def validate_relationships(plant: Plant, line: ProductionLine, model: ProductModel, routing: Routing):
        if line.plant_id != plant.id:
            raise CapacityValidationError("Selected line must belong to selected plant.", "productionLineId")
        if routing.production_line_id != line.id:
            raise CapacityValidationError("Routing version must belong to selected line.", "routingVersionId")
        if routing.product_model and str(routing.product_model_id) != str(model.id):
            # Some routes still use the legacy ProductModel table. Treat a scoped routing as authoritative
            # only when it points at the same model id; otherwise reject the mismatch.
            raise CapacityValidationError("Routing version must belong to selected model.", "routingVersionId")
        if not ProductionLineProductModel.objects.filter(production_line=line, product_model_id=model.id).exists():
            raise CapacityValidationError("Selected model must be valid for selected line.", "productModelId")

    @staticmethod
    @transaction.atomic
    def create_plan(input_data: dict[str, Any], user=None) -> CapacityPlan:
        plant = Plant.objects.get(id=input_data["plant_id"])
        line = ProductionLine.objects.get(id=input_data["production_line_id"])
        model = ReferenceValue.objects.get(id=input_data["product_model_id"])
        routing = Routing.objects.get(id=input_data["routing_version_id"])
        CapacityPlanService.validate_relationships(plant, line, model, routing)
        start = _parse_date(input_data.get("planning_horizon_start"), "planningHorizonStart")
        end = _parse_date(input_data.get("planning_horizon_end"), "planningHorizonEnd")
        if end < start:
            raise CapacityValidationError("Planning horizon end must be after start.", "planningHorizonEnd")
        plan = CapacityPlan.objects.create(
            plant=plant,
            production_line=line,
            product_model=model,
            routing_version=routing,
            planning_horizon_start=start,
            planning_horizon_end=end,
            created_by=_user_or_none(user),
            updated_by=_user_or_none(user),
        )
        CapacityPlanInput.objects.create(capacity_plan=plan)
        return plan

    @staticmethod
    @transaction.atomic
    def update_inputs(plan_id: str, input_data: dict[str, Any], user=None) -> CapacityPlan:
        plan = CapacityPlanService._get_plan(plan_id)
        if plan.status == CapacityPlanStatus.APPROVED:
            raise CapacityValidationError("Approved plan is read-only. Create a scenario or new revision.", "_form")
        inputs, _ = CapacityPlanInput.objects.get_or_create(capacity_plan=plan)
        for attr in ("planned_quantity", "available_time_minutes", "break_time_minutes", "planned_downtime_minutes", "operators_available", "efficiency_factor"):
            if attr in input_data and input_data[attr] is not None:
                setattr(inputs, attr, input_data[attr])
        inputs.net_available_time_minutes = max(0, inputs.available_time_minutes - inputs.break_time_minutes - inputs.planned_downtime_minutes)
        inputs.takt_time_seconds = (inputs.net_available_time_minutes * 60 / inputs.planned_quantity) if inputs.planned_quantity > 0 and inputs.net_available_time_minutes > 0 else 0
        inputs.save()
        plan.status = CapacityPlanStatus.DRAFT
        plan.updated_by = _user_or_none(user)
        plan.save()
        return plan

    @staticmethod
    def calculate_plan(plan_id: str, user=None) -> CapacityPlan:
        plan = CapacityPlanService._get_plan(plan_id)
        if plan.status == CapacityPlanStatus.ARCHIVED:
            raise CapacityValidationError("Archived plan cannot be calculated.", "status")
        CapacityCalculationService.calculate(plan, user=user)
        return CapacityPlanService._get_plan(plan_id)

    @staticmethod
    @transaction.atomic
    def approve_plan(plan_id: str, user=None) -> CapacityPlan:
        plan = CapacityPlanService._get_plan(plan_id)
        result = getattr(plan, "result", None)
        if not result:
            raise CapacityValidationError("Calculate capacity before approval.", "result")
        if result.feasibility_status in (FeasibilityStatus.INFEASIBLE, FeasibilityStatus.MISSING_DATA):
            raise CapacityValidationError("Cannot approve while critical errors exist.", "result")
        if any(c.get("severity") == "CRITICAL" for c in result.constraints_json):
            raise CapacityValidationError("Cannot approve while critical overloads exist.", "constraints")
        plan.status = CapacityPlanStatus.APPROVED
        plan.approved_at = timezone.now()
        plan.approved_by = _user_or_none(user)
        plan.updated_by = _user_or_none(user)
        plan.save()
        return plan

    @staticmethod
    @transaction.atomic
    def archive_plan(plan_id: str, user=None) -> CapacityPlan:
        plan = CapacityPlanService._get_plan(plan_id)
        plan.status = CapacityPlanStatus.ARCHIVED
        plan.updated_by = _user_or_none(user)
        plan.save()
        return plan
