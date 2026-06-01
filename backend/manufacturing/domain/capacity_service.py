from __future__ import annotations

import math
from datetime import date, datetime, timedelta
from typing import Any, Optional

from django.db import models, transaction
from django.utils import timezone

from manufacturing.domain.routing_service import RoutingService
from manufacturing.models import (
    CapacityPlan, CapacityPlanInput, CapacityPlanResult, CapacityPlanStatus,
    CapacityScenario, FeasibilityStatus, Plant, ProductionLine, ReferenceValue,
    ProductionLineProductModel, Routing,
)
from manufacturing.models.capacity import (
    CapacityConstraintReason, CapacityMode, CapacityProfile, CapacitySnapshot, CapacityRecalculationJob,
    CapacitySnapshotStatus, CapacitySnapshotType, LaborRequirement, OperatorAssignment,
    ScheduleScope, WorkSchedule, WorkShift,
)
from manufacturing.domain.schedule_assignment_service import ScheduleAssignmentService
from manufacturing.domain.schedule_service import ScheduleService


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
        from_dt = timezone.make_aware(datetime.combine(plan.planning_horizon_start, datetime.min.time()))
        to_dt = timezone.make_aware(datetime.combine(plan.planning_horizon_end, datetime.max.time()))
        line_snapshot = NewCapacityService.calculate_scope_capacity(
            "PRODUCTION_LINE",
            str(plan.production_line_id),
            from_dt,
            to_dt,
            snapshot_type=CapacitySnapshotType.PLANNING,
            status=CapacitySnapshotStatus.ACTIVE,
        )
        inputs.available_time_minutes = line_snapshot.available_minutes
        inputs.break_time_minutes = 0
        inputs.planned_downtime_minutes = 0
        inputs.operators_available = 1
        inputs.net_available_time_minutes = line_snapshot.effective_capacity or line_snapshot.available_minutes
        if inputs.net_available_time_minutes <= 0:
            raise CapacityValidationError("Net Available Time must be greater than 0.", "netAvailableTimeMinutes")
        inputs.takt_time_seconds = (inputs.net_available_time_minutes * 60) / inputs.planned_quantity
        inputs.save()

        total_work_content_seconds = sum(float(step.cycle_time_sec or 0) + float(step.setup_time_sec or 0) + float(step.changeover_time_sec or 0) for step in steps)
        required_capacity_minutes = sum(float(step.cycle_time_sec or 0) * inputs.planned_quantity for step in steps) / 60
        available_capacity_minutes = inputs.net_available_time_minutes * max(inputs.efficiency_factor, 0.01)
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
    def validate_relationships(plant: Plant, line: ProductionLine, model: ReferenceValue, routing: Routing):
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
        for attr in ("planned_quantity", "efficiency_factor"):
            if attr in input_data and input_data[attr] is not None:
                setattr(inputs, attr, input_data[attr])
        inputs.net_available_time_minutes = 0
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


class NewCapacityValidationError(Exception):
    def __init__(self, message: str, field: str = "_form", code: str = "VALIDATION"):
        self.message = message
        self.field = field
        self.code = code
        super().__init__(message)


class NewCapacityService:

    @staticmethod
    def _scope_value(scope_type: str) -> str:
        return scope_type.value if hasattr(scope_type, 'value') else scope_type

    @staticmethod
    def _constraint_reason(machine_capacity: float, labor_capacity: float, has_schedule: bool = True, has_machine: bool = True, has_labor: bool = True) -> str:
        if not has_schedule:
            return CapacityConstraintReason.NO_SCHEDULE
        if not has_machine:
            return CapacityConstraintReason.NO_MACHINE
        if not has_labor:
            return CapacityConstraintReason.NO_LABOR
        if machine_capacity < labor_capacity:
            return CapacityConstraintReason.MACHINE
        if labor_capacity < machine_capacity:
            return CapacityConstraintReason.LABOR
        return CapacityConstraintReason.BALANCED

    @staticmethod
    def _effective_capacity(machine_capacity: float, labor_capacity: float, has_labor: bool = True) -> float:
        return min(machine_capacity, labor_capacity) if has_labor else 0.0

    @staticmethod
    def _plant_for_scope(scope_type: str, scope_id: str):
        from manufacturing.models import Department, Plant, ProductionLine, Resource, ResourceGroup

        st = NewCapacityService._scope_value(scope_type)
        if st == "PLANT":
            return Plant.objects.filter(id=scope_id).first()
        if st == "PRODUCTION_LINE":
            line = ProductionLine.objects.select_related("plant").filter(id=scope_id).first()
            return line.plant if line else None
        if st == "DEPARTMENT":
            dept = Department.objects.select_related("plant").filter(id=scope_id).first()
            return dept.plant if dept else None
        if st == "RESOURCE_GROUP":
            group = ResourceGroup.objects.select_related("department__plant").filter(id=scope_id).first()
            return group.department.plant if group and group.department_id else None
        if st == "RESOURCE":
            resource = Resource.objects.select_related("resource_group__department__plant").filter(id=scope_id).first()
            return resource.resource_group.department.plant if resource else None
        return None

    @staticmethod
    def _resource_group_ids_for_scope(scope_type: str, scope_id: str) -> list[str]:
        from manufacturing.models import Department, ProductionLineDepartmentAssignment, ProductionLineResourceGroup, Resource, ResourceGroup

        st = NewCapacityService._scope_value(scope_type)
        if st == "RESOURCE_GROUP":
            return [str(scope_id)]
        if st == "RESOURCE":
            resource = Resource.objects.filter(id=scope_id).only("resource_group_id").first()
            return [str(resource.resource_group_id)] if resource else []
        if st == "DEPARTMENT":
            return [str(value) for value in ResourceGroup.objects.filter(department_id=scope_id).values_list("id", flat=True)]
        if st == "PRODUCTION_LINE":
            return [str(value) for value in
                    ProductionLineResourceGroup.objects.filter(
                        production_line_id=scope_id, is_active=True,
                    ).values_list("resource_group_id", flat=True)]
        if st == "PLANT":
            dept_ids = Department.objects.filter(plant_id=scope_id).values_list("id", flat=True)
            return [str(value) for value in ResourceGroup.objects.filter(department_id__in=dept_ids).values_list("id", flat=True)]
        return []

    @staticmethod
    def _active_labor_requirements(scope_type: str, scope_id: str, from_dt: datetime, to_dt: datetime):
        from manufacturing.models import Resource

        group_ids = NewCapacityService._resource_group_ids_for_scope(scope_type, scope_id)
        if not group_ids:
            return LaborRequirement.objects.none()
        resource_ids = Resource.objects.filter(resource_group_id__in=group_ids).values_list("id", flat=True)
        return LaborRequirement.objects.filter(
            is_active=True,
            effective_from__lt=to_dt,
        ).filter(
            models.Q(resource_group_id__in=group_ids)
            | models.Q(routing_step__resource_group_id__in=group_ids)
            | models.Q(routing_step__resource_id__in=resource_ids)
        ).filter(
            models.Q(effective_to__isnull=True) | models.Q(effective_to__gt=from_dt)
        )

    @staticmethod
    def _active_operator_assignments(scope_type: str, scope_id: str, from_dt: datetime, to_dt: datetime):
        from manufacturing.models import Resource

        group_ids = NewCapacityService._resource_group_ids_for_scope(scope_type, scope_id)
        if not group_ids:
            return OperatorAssignment.objects.none()
        resource_ids = Resource.objects.filter(resource_group_id__in=group_ids).values_list("id", flat=True)
        return OperatorAssignment.objects.filter(
            is_active=True,
            effective_from__lt=to_dt,
        ).filter(
            models.Q(resource_group_id__in=group_ids) | models.Q(resource_id__in=resource_ids)
        ).filter(
            models.Q(effective_to__isnull=True) | models.Q(effective_to__gt=from_dt)
        ).select_related("schedule_assignment__work_schedule")

    @staticmethod
    def calculate_labor_capacity(scope_type: str, scope_id: str, from_dt: datetime, to_dt: datetime) -> dict[str, Any]:
        requirements = list(NewCapacityService._active_labor_requirements(scope_type, scope_id, from_dt, to_dt))
        assignments = list(NewCapacityService._active_operator_assignments(scope_type, scope_id, from_dt, to_dt))
        operators_available = len({assignment.operator_id for assignment in assignments})
        labor_available_minutes = 0.0
        for assignment in assignments:
            schedule = assignment.schedule_assignment.work_schedule if assignment.schedule_assignment_id else None
            if schedule:
                labor_available_minutes += NewCapacityService._calculate_available_minutes(schedule, from_dt, to_dt)
        operators_required = sum(req.operators_required for req in requirements)
        required_minutes_per_unit = sum(req.labor_minutes_per_unit for req in requirements)
        labor_capacity = labor_available_minutes / required_minutes_per_unit if requirements and required_minutes_per_unit > 0 else 0.0
        return {
            "labor_capacity_units": labor_capacity,
            "labor_available_minutes": labor_available_minutes,
            "operators_required": operators_required,
            "operators_available": operators_available,
            "has_labor": bool(requirements and assignments),
        }

    @staticmethod
    def calculate_machine_capacity(scope_type: str, scope_id: str, from_dt: datetime, to_dt: datetime) -> dict[str, Any]:
        metrics = NewCapacityService._metrics_for_scope(scope_type, scope_id, from_dt, to_dt, {})
        return {
            "machine_capacity_units": metrics["machine_capacity_units"],
            "machine_available_minutes": metrics["machine_available_minutes"],
            "capacity_uom": metrics["capacity_uom"],
            "source_schedule": metrics["source_schedule"],
            "source_profile": metrics["source_profile"],
            "has_machine": metrics.get("has_machine", True),
        }

    @staticmethod
    def _missing_reasons(scope_type: str, scope_id: str, from_dt: datetime, to_dt: datetime) -> list[str]:
        reasons = []
        from manufacturing.domain.schedule_service import ScheduleService
        schedule = ScheduleService.resolve_schedule(scope_type, scope_id)
        if not schedule:
            reasons.append("NO_SCHEDULE")
        elif not schedule.shifts.filter(is_active=True).exists():
            reasons.append("NO_SHIFT")
        from manufacturing.models import Resource
        st = scope_type if not hasattr(scope_type, 'value') else scope_type.value
        if st == "RESOURCE_GROUP":
            if not Resource.objects.filter(resource_group_id=scope_id).exists():
                reasons.append("NO_RESOURCES")
        labor = NewCapacityService.calculate_labor_capacity(scope_type, scope_id, from_dt, to_dt)
        if not labor.get("has_labor"):
            if labor.get("operators_required", 0) > 0 and labor.get("operators_available", 0) <= 0:
                reasons.append("NO_OPERATOR_ASSIGNMENT")
            else:
                reasons.append("NO_LABOR_REQUIREMENT")
        return reasons

    @staticmethod
    def calculate_effective_capacity(scope_type: str, scope_id: str, from_dt: datetime, to_dt: datetime) -> dict[str, Any]:
        machine = NewCapacityService.calculate_machine_capacity(scope_type, scope_id, from_dt, to_dt)
        labor = NewCapacityService.calculate_labor_capacity(scope_type, scope_id, from_dt, to_dt)
        effective = NewCapacityService._effective_capacity(
            machine["machine_capacity_units"], labor["labor_capacity_units"], labor["has_labor"],
        )
        return {
            **machine,
            **labor,
            "effective_capacity_units": effective,
            "constraint_reason": NewCapacityService._constraint_reason(
                machine["machine_capacity_units"],
                labor["labor_capacity_units"],
                has_schedule=bool(machine.get("source_schedule")),
                has_machine=machine["has_machine"],
                has_labor=labor["has_labor"],
            ),
            "missing_reasons": NewCapacityService._missing_reasons(scope_type, scope_id, from_dt, to_dt),
        }

    @staticmethod
    def _next_snapshot_version(scope_type: str, scope_id: str, from_dt: datetime, to_dt: datetime, snapshot_type: str) -> int:
        previous = CapacitySnapshot.objects.filter(
            scope_type=scope_type,
            scope_id=scope_id,
            from_datetime=from_dt,
            to_datetime=to_dt,
            snapshot_type=snapshot_type,
        ).order_by("-version").first()
        if previous and (previous.snapshot_type == CapacitySnapshotType.EXECUTION or previous.status == CapacitySnapshotStatus.FROZEN):
            raise NewCapacityValidationError(
                "Frozen or execution capacity snapshots cannot be recalculated.",
                "snapshot",
                "IMMUTABLE_SNAPSHOT",
            )
        return (previous.version + 1) if previous else 1

    @staticmethod
    def _deactivate_active_planning(scope_type: str, scope_id: str, from_dt: datetime, to_dt: datetime, snapshot_type: str, status: str) -> None:
        if snapshot_type == CapacitySnapshotType.PLANNING and status == CapacitySnapshotStatus.ACTIVE:
            CapacitySnapshot.objects.filter(
                scope_type=scope_type,
                scope_id=scope_id,
                from_datetime=from_dt,
                to_datetime=to_dt,
                snapshot_type=snapshot_type,
                status=CapacitySnapshotStatus.ACTIVE,
            ).update(status=CapacitySnapshotStatus.DRAFT)

    @staticmethod
    def _metrics_for_scope(
        scope_type: str,
        scope_id: str,
        from_dt: datetime,
        to_dt: datetime,
        memo: Optional[dict[tuple[str, str], dict[str, Any]]] = None,
    ) -> dict[str, Any]:
        st = NewCapacityService._scope_value(scope_type)
        cache = memo if memo is not None else {}
        key = (st, str(scope_id))
        if key in cache:
            return cache[key]

        if from_dt >= to_dt:
            raise NewCapacityValidationError(
                "from_dt must be before to_dt.", "fromDatetime", "INVALID_RANGE",
            )

        assignment = ScheduleAssignmentService.resolve_assignment(st, scope_id, from_dt)
        schedule = assignment.work_schedule if assignment else ScheduleService.resolve_schedule(st, scope_id)
        if not schedule:
            labor = NewCapacityService.calculate_labor_capacity(st, scope_id, from_dt, to_dt)
            cache[key] = {
                "scope_type": st,
                "scope_id": str(scope_id),
                "available_minutes": 0.0,
                "theoretical_capacity": 0.0,
                "effective_capacity": 0.0,
                "bottleneck_capacity": None,
                "capacity_uom": "",
                "machine_capacity_units": 0.0,
                "labor_capacity_units": labor["labor_capacity_units"],
                "effective_capacity_units": 0.0,
                "constraint_reason": CapacityConstraintReason.NO_SCHEDULE,
                "machine_available_minutes": 0.0,
                "labor_available_minutes": labor["labor_available_minutes"],
                "operators_required": labor["operators_required"],
                "operators_available": labor["operators_available"],
                "has_machine": False,
                "has_labor": labor["has_labor"],
                "source_schedule": None,
                "source_profile": None,
            }
            return cache[key]

        profile = CapacityProfile.objects.filter(
            scope_type=st, scope_id=scope_id, is_active=True,
        ).first()

        available_minutes = NewCapacityService._calculate_available_minutes(schedule, from_dt, to_dt)

        uom = profile.capacity_uom if profile else ""
        eff_factor = profile.efficiency_factor if profile else 1.0
        oee = profile.oee_factor if profile and profile.oee_factor is not None else 1.0
        cap_mode = profile.capacity_mode if profile else CapacityMode.INHERITED

        theoretical = 0.0
        machine_capacity = 0.0
        bottleneck = None

        if st == "RESOURCE":
            theoretical = available_minutes
            machine_capacity = theoretical * eff_factor * oee
            if profile and profile.manual_capacity is not None and cap_mode == CapacityMode.MANUAL:
                machine_capacity = profile.manual_capacity
        elif st == "RESOURCE_GROUP":
            result = NewCapacityService._aggregate_resource_group(
                scope_id, available_minutes, eff_factor, oee, cap_mode, profile, from_dt, to_dt, cache,
            )
            theoretical = result["theoretical"]
            machine_capacity = result["effective"]
            bottleneck = result.get("bottleneck")
        elif st == "DEPARTMENT":
            result = NewCapacityService._aggregate_department(
                scope_id, available_minutes, eff_factor, oee, cap_mode, profile, from_dt, to_dt, cache,
            )
            theoretical = result["theoretical"]
            machine_capacity = result["effective"]
            bottleneck = result.get("bottleneck")
        elif st == "PRODUCTION_LINE":
            result = NewCapacityService._aggregate_production_line(
                scope_id, available_minutes, eff_factor, oee, cap_mode, profile, from_dt, to_dt, cache,
            )
            theoretical = result["theoretical"]
            machine_capacity = result["effective"]
            bottleneck = result.get("bottleneck")
        elif st == "PLANT":
            result = NewCapacityService._aggregate_plant(
                scope_id, available_minutes, eff_factor, oee, cap_mode, profile, from_dt, to_dt, cache,
            )
            theoretical = result["theoretical"]
            machine_capacity = result["effective"]
            bottleneck = result.get("bottleneck")

        labor = NewCapacityService.calculate_labor_capacity(st, scope_id, from_dt, to_dt)
        effective_units = NewCapacityService._effective_capacity(
            machine_capacity, labor["labor_capacity_units"], labor["has_labor"],
        )
        constraint_reason = NewCapacityService._constraint_reason(
            machine_capacity,
            labor["labor_capacity_units"],
            has_schedule=bool(schedule),
            has_machine=machine_capacity > 0,
            has_labor=labor["has_labor"],
        )

        cache[key] = {
            "scope_type": st,
            "scope_id": str(scope_id),
            "available_minutes": available_minutes,
            "theoretical_capacity": theoretical,
            "effective_capacity": effective_units,
            "bottleneck_capacity": bottleneck,
            "capacity_uom": uom,
            "machine_capacity_units": machine_capacity,
            "labor_capacity_units": labor["labor_capacity_units"],
            "effective_capacity_units": effective_units,
            "constraint_reason": constraint_reason,
            "machine_available_minutes": available_minutes,
            "labor_available_minutes": labor["labor_available_minutes"],
            "operators_required": labor["operators_required"],
            "operators_available": labor["operators_available"],
            "has_machine": machine_capacity > 0,
            "has_labor": labor["has_labor"],
            "source_schedule": schedule,
            "source_profile": profile,
        }
        return cache[key]

    @staticmethod
    def calculate_scope_capacity(
        scope_type: str,
        scope_id: str,
        from_dt: datetime,
        to_dt: datetime,
        snapshot_type: str = CapacitySnapshotType.PLANNING,
        status: str = CapacitySnapshotStatus.ACTIVE,
    ) -> CapacitySnapshot:
        st = NewCapacityService._scope_value(scope_type)
        metrics = NewCapacityService._metrics_for_scope(st, scope_id, from_dt, to_dt, {})
        version = NewCapacityService._next_snapshot_version(st, scope_id, from_dt, to_dt, snapshot_type)
        NewCapacityService._deactivate_active_planning(st, scope_id, from_dt, to_dt, snapshot_type, status)
        snapshot = CapacitySnapshot.objects.create(
            scope_type=st,
            scope_id=scope_id,
            from_datetime=from_dt,
            to_datetime=to_dt,
            available_minutes=metrics["available_minutes"],
            theoretical_capacity=metrics["theoretical_capacity"],
            effective_capacity=metrics["effective_capacity"],
            bottleneck_capacity=metrics["bottleneck_capacity"],
            capacity_uom=metrics["capacity_uom"],
            machine_capacity_units=metrics["machine_capacity_units"],
            labor_capacity_units=metrics["labor_capacity_units"],
            effective_capacity_units=metrics["effective_capacity_units"],
            constraint_reason=metrics["constraint_reason"],
            missing_reasons=metrics.get("missing_reasons", []),
            machine_available_minutes=metrics["machine_available_minutes"],
            labor_available_minutes=metrics["labor_available_minutes"],
            operators_required=metrics["operators_required"],
            operators_available=metrics["operators_available"],
            source_schedule=metrics["source_schedule"],
            source_profile=metrics["source_profile"],
            snapshot_type=snapshot_type,
            status=status,
            version=version,
        )
        return snapshot

    @staticmethod
    def create_profile(
        scope_type: str,
        scope_id: str,
        capacity_mode: str = "INHERITED",
        manual_capacity: Optional[float] = None,
        capacity_uom: str = "",
        efficiency_factor: float = 1.0,
        oee_factor: Optional[float] = None,
        takt_factor: Optional[float] = None,
    ) -> CapacityProfile:
        st = scope_type.value if hasattr(scope_type, 'value') else scope_type

        if manual_capacity is not None and manual_capacity < 0:
            raise NewCapacityValidationError(
                "manual_capacity must be >= 0.", "manualCapacity", "INVALID_VALUE",
            )
        for factor_name, factor_value in [
            ("efficiency_factor", efficiency_factor),
            ("oee_factor", oee_factor),
            ("takt_factor", takt_factor),
        ]:
            if factor_value is not None and (factor_value < 0 or factor_value > 1):
                raise NewCapacityValidationError(
                    f"{factor_name} must be between 0 and 1.", factor_name, "INVALID_FACTOR",
                )
        if capacity_mode == CapacityMode.MANUAL and manual_capacity is None:
            raise NewCapacityValidationError(
                "Manual capacity required for MANUAL mode.", "manualCapacity", "REQUIRED",
            )
        active_exists = CapacityProfile.objects.filter(
            scope_type=st, scope_id=scope_id, is_active=True,
        ).exclude(capacity_mode=capacity_mode).exists()
        profile, _ = CapacityProfile.objects.update_or_create(
            scope_type=st,
            scope_id=scope_id,
            is_active=True,
            defaults={
                "capacity_mode": capacity_mode,
                "manual_capacity": manual_capacity,
                "capacity_uom": capacity_uom,
                "efficiency_factor": efficiency_factor,
                "oee_factor": oee_factor,
                "takt_factor": takt_factor,
            },
        )
        return profile

    @staticmethod
    def update_profile(profile_id: str, **kwargs) -> CapacityProfile:
        try:
            profile = CapacityProfile.objects.get(id=profile_id)
        except CapacityProfile.DoesNotExist:
            raise NewCapacityValidationError("Profile not found.", "id", "NOT_FOUND")

        if "manual_capacity" in kwargs and kwargs["manual_capacity"] is not None:
            if kwargs["manual_capacity"] < 0:
                raise NewCapacityValidationError(
                    "manual_capacity must be >= 0.", "manualCapacity", "INVALID_VALUE",
                )
        for field in ("capacity_mode", "manual_capacity", "capacity_uom", "efficiency_factor", "oee_factor", "takt_factor"):
            if field in kwargs and kwargs[field] is not None:
                setattr(profile, field, kwargs[field])
        profile.save()
        return profile

    @staticmethod
    def archive_profile(profile_id: str) -> CapacityProfile:
        try:
            profile = CapacityProfile.objects.get(id=profile_id)
        except CapacityProfile.DoesNotExist:
            raise NewCapacityValidationError("Profile not found.", "id", "NOT_FOUND")
        profile.is_active = False
        profile.save()
        return profile

    @staticmethod
    @transaction.atomic
    def create_labor_requirement(**kwargs) -> LaborRequirement:
        requirement = LaborRequirement.objects.create(**kwargs)
        return requirement

    @staticmethod
    @transaction.atomic
    def update_labor_requirement(requirement_id: str, **kwargs) -> LaborRequirement:
        try:
            requirement = LaborRequirement.objects.get(id=requirement_id)
        except LaborRequirement.DoesNotExist:
            raise NewCapacityValidationError("Labor requirement not found.", "id", "NOT_FOUND")
        for field, value in kwargs.items():
            if value is not None:
                setattr(requirement, field, value)
        requirement.save()
        return requirement

    @staticmethod
    @transaction.atomic
    def archive_labor_requirement(requirement_id: str) -> LaborRequirement:
        return NewCapacityService.update_labor_requirement(requirement_id, is_active=False)

    @staticmethod
    @transaction.atomic
    def create_operator_assignment(**kwargs) -> OperatorAssignment:
        assignment = OperatorAssignment.objects.create(**kwargs)
        return assignment

    @staticmethod
    @transaction.atomic
    def update_operator_assignment(assignment_id: str, **kwargs) -> OperatorAssignment:
        try:
            assignment = OperatorAssignment.objects.get(id=assignment_id)
        except OperatorAssignment.DoesNotExist:
            raise NewCapacityValidationError("Operator assignment not found.", "id", "NOT_FOUND")
        for field, value in kwargs.items():
            if value is not None:
                setattr(assignment, field, value)
        assignment.save()
        return assignment

    @staticmethod
    @transaction.atomic
    def archive_operator_assignment(assignment_id: str) -> OperatorAssignment:
        return NewCapacityService.update_operator_assignment(assignment_id, is_active=False)

    @staticmethod
    def _calculate_available_minutes(schedule: WorkSchedule, from_dt: datetime, to_dt: datetime) -> float:
        shifts = WorkShift.objects.filter(
            schedule=schedule, is_active=True,
        )
        total_minutes = 0.0
        current = from_dt
        while current < to_dt:
            weekday = current.weekday()
            day_shifts = [s for s in shifts if s.weekday == weekday]
            for shift in day_shifts:
                shift_start = current.replace(
                    hour=shift.start_time.hour,
                    minute=shift.start_time.minute,
                    second=0, microsecond=0,
                )
                shift_end = current.replace(
                    hour=shift.end_time.hour,
                    minute=shift.end_time.minute,
                    second=0, microsecond=0,
                )
                if shift.crosses_midnight:
                    shift_end += timedelta(days=1)

                window_start = max(shift_start, current)
                window_end = min(shift_end, to_dt)

                if window_start < window_end:
                    minutes = (window_end - window_start).total_seconds() / 60.0
                    total_minutes += minutes

            current += timedelta(days=1)

        return total_minutes

    @staticmethod
    def _aggregate_resource_group(
        group_id: str,
        available_minutes: float,
        eff_factor: float,
        oee: float,
        cap_mode: str,
        profile: Optional[CapacityProfile],
        from_dt: Optional[datetime] = None,
        to_dt: Optional[datetime] = None,
        memo: Optional[dict[tuple[str, str], dict[str, Any]]] = None,
    ) -> dict:
        from manufacturing.models import Resource

        resources = Resource.objects.filter(resource_group_id=group_id)
        capacities = []
        now = datetime.now()

        for r in resources:
            try:
                metrics = NewCapacityService._metrics_for_scope(
                    "RESOURCE", str(r.id),
                    from_dt or now, to_dt or now, memo,
                )
                capacities.append(metrics["machine_capacity_units"])
            except NewCapacityValidationError:
                capacities.append(0.0)

        if cap_mode == CapacityMode.MANUAL and profile and profile.manual_capacity is not None:
            return {
                "theoretical": profile.manual_capacity,
                "effective": profile.manual_capacity * eff_factor * oee,
                "bottleneck": None,
            }

        if cap_mode == CapacityMode.BOTTLENECK:
            bottleneck_val = min(capacities) if capacities else 0.0
            return {
                "theoretical": bottleneck_val,
                "effective": bottleneck_val,
                "bottleneck": bottleneck_val,
            }

        total = sum(capacities)
        return {
            "theoretical": total,
            "effective": total * eff_factor * oee,
            "bottleneck": min(capacities) if capacities else None,
        }

    @staticmethod
    def _aggregate_department(
        dept_id: str,
        available_minutes: float,
        eff_factor: float,
        oee: float,
        cap_mode: str,
        profile: Optional[CapacityProfile],
        from_dt: Optional[datetime] = None,
        to_dt: Optional[datetime] = None,
        memo: Optional[dict[tuple[str, str], dict[str, Any]]] = None,
    ) -> dict:
        from manufacturing.models import ResourceGroup

        groups = ResourceGroup.objects.filter(department_id=dept_id)
        capacities = []
        now = datetime.now()

        for rg in groups:
            try:
                metrics = NewCapacityService._metrics_for_scope(
                    "RESOURCE_GROUP", str(rg.id),
                    from_dt or now, to_dt or now, memo,
                )
                capacities.append(metrics["machine_capacity_units"])
            except NewCapacityValidationError:
                capacities.append(0.0)

        if cap_mode == CapacityMode.MANUAL and profile and profile.manual_capacity is not None:
            return {
                "theoretical": profile.manual_capacity,
                "effective": profile.manual_capacity * eff_factor * oee,
                "bottleneck": None,
            }

        if cap_mode == CapacityMode.BOTTLENECK:
            b = min(capacities) if capacities else 0.0
            return {"theoretical": b, "effective": b, "bottleneck": b}

        total = sum(capacities)
        return {
            "theoretical": total,
            "effective": total * eff_factor * oee,
            "bottleneck": min(capacities) if capacities else None,
        }
    @staticmethod
    def _aggregate_production_line(
        line_id: str,
        available_minutes: float,
        eff_factor: float,
        oee: float,
        cap_mode: str,
        profile: Optional[CapacityProfile],
        from_dt: Optional[datetime] = None,
        to_dt: Optional[datetime] = None,
        memo: Optional[dict[tuple[str, str], dict[str, Any]]] = None,
    ) -> dict:
        from manufacturing.models import ProductionLineDepartmentAssignment

        assignments = ProductionLineDepartmentAssignment.objects.filter(
            production_line_id=line_id,
        ).select_related("department")
        capacities = []
        now = datetime.now()

        for a in assignments:
            try:
                metrics = NewCapacityService._metrics_for_scope(
                    "DEPARTMENT", str(a.department_id),
                    from_dt or now, to_dt or now, memo,
                )
                capacities.append(metrics["machine_capacity_units"])
            except NewCapacityValidationError:
                capacities.append(0.0)

        if cap_mode == CapacityMode.MANUAL and profile and profile.manual_capacity is not None:
            return {
                "theoretical": profile.manual_capacity,
                "effective": profile.manual_capacity * eff_factor * oee,
                "bottleneck": None,
            }

        if cap_mode in (CapacityMode.BOTTLENECK, CapacityMode.INHERITED):
            b = min(capacities) if capacities else 0.0
            return {"theoretical": b, "effective": b, "bottleneck": b}

        total = sum(capacities)
        return {
            "theoretical": total,
            "effective": total * eff_factor * oee,
            "bottleneck": min(capacities) if capacities else None,
        }


class CapacityService:
    @staticmethod
    def _normalize_snapshot(snapshot: CapacitySnapshot) -> dict[str, Any]:
        return {
            "scope_type": snapshot.scope_type,
            "scope_id": snapshot.scope_id,
            "available_minutes": snapshot.available_minutes,
            "theoretical_capacity": snapshot.theoretical_capacity,
            "effective_capacity": snapshot.effective_capacity,
            "bottleneck_capacity": snapshot.bottleneck_capacity,
            "capacity_uom": snapshot.capacity_uom,
            "machine_capacity_units": snapshot.machine_capacity_units,
            "labor_capacity_units": snapshot.labor_capacity_units,
            "effective_capacity_units": snapshot.effective_capacity_units,
            "constraint_reason": snapshot.constraint_reason,
            "machine_available_minutes": snapshot.machine_available_minutes,
            "labor_available_minutes": snapshot.labor_available_minutes,
            "operators_required": snapshot.operators_required,
            "operators_available": snapshot.operators_available,
            "from_datetime": snapshot.from_datetime,
            "to_datetime": snapshot.to_datetime,
        }

    @classmethod
    def calculate_resource_capacity(cls, resource_id: str, from_dt: datetime, to_dt: datetime) -> dict[str, Any]:
        return cls._normalize_snapshot(
            NewCapacityService.calculate_scope_capacity("RESOURCE", resource_id, from_dt, to_dt)
        )

    @classmethod
    def calculate_resource_group_capacity(cls, resource_group_id: str, from_dt: datetime, to_dt: datetime) -> dict[str, Any]:
        return cls._normalize_snapshot(
            NewCapacityService.calculate_scope_capacity("RESOURCE_GROUP", resource_group_id, from_dt, to_dt)
        )

    @classmethod
    def calculate_department_capacity(cls, department_id: str, from_dt: datetime, to_dt: datetime) -> dict[str, Any]:
        return cls._normalize_snapshot(
            NewCapacityService.calculate_scope_capacity("DEPARTMENT", department_id, from_dt, to_dt)
        )

    @classmethod
    def calculate_production_line_capacity(cls, production_line_id: str, from_dt: datetime, to_dt: datetime) -> dict[str, Any]:
        return cls._normalize_snapshot(
            NewCapacityService.calculate_scope_capacity("PRODUCTION_LINE", production_line_id, from_dt, to_dt)
        )

    @staticmethod
    def _aggregate_plant(
        plant_id: str,
        available_minutes: float,
        eff_factor: float,
        oee: float,
        cap_mode: str,
        profile: Optional[CapacityProfile],
        from_dt: Optional[datetime] = None,
        to_dt: Optional[datetime] = None,
        memo: Optional[dict[tuple[str, str], dict[str, Any]]] = None,
    ) -> dict:
        from manufacturing.models import ProductionLine

        lines = ProductionLine.objects.filter(plant_id=plant_id)
        capacities = []
        now = datetime.now()

        for line in lines:
            try:
                metrics = NewCapacityService._metrics_for_scope(
                    "PRODUCTION_LINE", str(line.id),
                    from_dt or now, to_dt or now, memo,
                )
                capacities.append(metrics["machine_capacity_units"])
            except NewCapacityValidationError:
                capacities.append(0.0)

        if cap_mode == CapacityMode.MANUAL and profile and profile.manual_capacity is not None:
            return {
                "theoretical": profile.manual_capacity,
                "effective": profile.manual_capacity * eff_factor * oee,
                "bottleneck": None,
            }

        if cap_mode == CapacityMode.BOTTLENECK:
            b = min(capacities) if capacities else 0.0
            return {"theoretical": b, "effective": b, "bottleneck": b}

        total = sum(capacities)
        return {
            "theoretical": total,
            "effective": total * eff_factor * oee,
            "bottleneck": min(capacities) if capacities else None,
        }


NewCapacityService._aggregate_plant = staticmethod(CapacityService._aggregate_plant)
