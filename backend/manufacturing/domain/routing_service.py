from datetime import date
from typing import Optional
from django.db import transaction
from django.db.models import F

from manufacturing.models import (
    Routing, RoutingStep, RoutingStatus,
    ProductionLine, Department, ResourceGroup, Resource,
    ReferenceValue, ProductModel, ProcessFlow,
)


class RoutingValidationError(Exception):
    def __init__(self, message: str, field: str = "_form"):
        self.message = message
        self.field = field
        super().__init__(message)


def _error(field: str, code: str, message: str) -> dict:
    return {"field": field, "code": code, "message": message}


def _resolve_ref(model_class, ref_id: Optional[str]):
    if not ref_id:
        return None
    try:
        return model_class.objects.get(id=ref_id)
    except model_class.DoesNotExist:
        raise RoutingValidationError(f"{model_class.__name__} with id {ref_id} not found", ref_id)


def _parse_date(val: Optional[str]) -> Optional[date]:
    if not val:
        return None
    try:
        return date.fromisoformat(val)
    except (ValueError, TypeError):
        raise RoutingValidationError(f"Invalid date format: {val}")


class RoutingService:

    # ── Routing CRUD ──

    @staticmethod
    @transaction.atomic
    def create_routing(input_data: dict) -> Routing:
        pl_id = input_data.get("production_line_id")
        if not pl_id:
            raise RoutingValidationError("Production line is required", "productionLineId")
        try:
            ProductionLine.objects.get(id=pl_id)
        except ProductionLine.DoesNotExist:
            raise RoutingValidationError("Production line not found", "productionLineId")

        pf_id = input_data.get("product_family_id")
        pf = _resolve_ref(ReferenceValue, pf_id) if pf_id else None
        pm_id = input_data.get("product_model_id")
        pm = _resolve_ref(ProductModel, pm_id) if pm_id else None

        routing = Routing.objects.create(
            production_line_id=pl_id,
            product_family=pf,
            product_model=pm,
            version=input_data.get("version", "1.0"),
            status=input_data.get("status", RoutingStatus.DRAFT),
            effective_from=_parse_date(input_data.get("effective_from")),
            effective_to=_parse_date(input_data.get("effective_to")),
            notes=input_data.get("notes", ""),
        )
        return routing

    @staticmethod
    @transaction.atomic
    def update_routing(routing_id: str, input_data: dict) -> Routing:
        try:
            routing = Routing.objects.get(id=routing_id)
        except Routing.DoesNotExist:
            raise RoutingValidationError("Routing not found", "id")

        if "production_line_id" in input_data and input_data["production_line_id"]:
            try:
                ProductionLine.objects.get(id=input_data["production_line_id"])
            except ProductionLine.DoesNotExist:
                raise RoutingValidationError("Production line not found", "productionLineId")
            routing.production_line_id = input_data["production_line_id"]

        if "product_family_id" in input_data:
            pf_id = input_data["product_family_id"]
            routing.product_family = _resolve_ref(ReferenceValue, pf_id) if pf_id else None
        if "product_model_id" in input_data:
            pm_id = input_data["product_model_id"]
            routing.product_model = _resolve_ref(ProductModel, pm_id) if pm_id else None
        if "version" in input_data:
            routing.version = input_data["version"]
        if "effective_from" in input_data:
            routing.effective_from = _parse_date(input_data["effective_from"])
        if "effective_to" in input_data:
            routing.effective_to = _parse_date(input_data["effective_to"])
        if "notes" in input_data:
            routing.notes = input_data["notes"]
        if "status" in input_data:
            routing.status = input_data["status"]

        routing.save()
        return routing

    @staticmethod
    @transaction.atomic
    def activate_routing(routing_id: str) -> Routing:
        try:
            routing = Routing.objects.get(id=routing_id)
        except Routing.DoesNotExist:
            raise RoutingValidationError("Routing not found", "id")

        errors = RoutingService.validate_routing(routing_id)
        if errors:
            msg = "; ".join(e["message"] for e in errors)
            raise RoutingValidationError(f"Cannot activate: {msg}", "_form")

        # Deactivate any other ACTIVE routing for same line + product
        conflicts = Routing.objects.filter(
            production_line=routing.production_line,
            status=RoutingStatus.ACTIVE,
        )
        if routing.product_model:
            conflicts = conflicts.filter(product_model=routing.product_model)
        if routing.product_family:
            conflicts = conflicts.filter(product_family=routing.product_family)
        conflicts.exclude(id=routing.id).update(status=RoutingStatus.DRAFT)

        routing.status = RoutingStatus.ACTIVE
        routing.save()
        return routing

    @staticmethod
    @transaction.atomic
    def archive_routing(routing_id: str) -> Routing:
        try:
            routing = Routing.objects.get(id=routing_id)
        except Routing.DoesNotExist:
            raise RoutingValidationError("Routing not found", "id")
        routing.status = RoutingStatus.ARCHIVED
        routing.save()
        return routing

    # ── Step CRUD ──

    @staticmethod
    @transaction.atomic
    def add_step(routing_id: str, input_data: dict) -> RoutingStep:
        try:
            routing = Routing.objects.get(id=routing_id)
        except Routing.DoesNotExist:
            raise RoutingValidationError("Routing not found", "routingId")

        if routing.status == RoutingStatus.ARCHIVED:
            raise RoutingValidationError("Cannot modify archived routing", "_form")

        sequence = input_data.get("sequence", 1)
        if RoutingStep.objects.filter(routing=routing, sequence=sequence).exists():
            # Shift existing steps up
            RoutingStep.objects.filter(routing=routing, sequence__gte=sequence).update(
                sequence=F("sequence") + 1
            )

        dept_id = input_data.get("department_id")
        rg_id = input_data.get("resource_group_id")
        res_id = input_data.get("resource_id")
        sw_id = input_data.get("standard_work_id")

        dept = _resolve_ref(Department, dept_id) if dept_id else None
        rg = None
        if rg_id:
            rg = _resolve_ref(ResourceGroup, rg_id)
            if dept and rg.department_id != dept.id:
                raise RoutingValidationError(
                    "Resource group does not belong to selected department", "resourceGroupId"
                )
        res = None
        if res_id:
            res = _resolve_ref(Resource, res_id)
            if rg and res.resource_group_id != rg.id:
                raise RoutingValidationError(
                    "Resource does not belong to selected resource group", "resourceId"
                )
        sw = _resolve_ref(ProcessFlow, sw_id) if sw_id else None

        step = RoutingStep.objects.create(
            routing=routing,
            sequence=sequence,
            department=dept,
            resource_group=rg,
            resource=res,
            standard_work=sw,
            cycle_time_sec=input_data.get("cycle_time_sec", 0),
            setup_time_sec=input_data.get("setup_time_sec", 0),
            changeover_time_sec=input_data.get("changeover_time_sec", 0),
            required_operators=input_data.get("required_operators", 1),
            schedule_source=input_data.get("schedule_source", "LINE"),
            buffer_type=input_data.get("buffer_type"),
            wip_min=input_data.get("wip_min"),
            wip_max=input_data.get("wip_max"),
            quality_checkpoint=input_data.get("quality_checkpoint", False),
            rework_allowed=input_data.get("rework_allowed", False),
            notes=input_data.get("notes", ""),
        )
        return step

    @staticmethod
    @transaction.atomic
    def update_step(step_id: str, input_data: dict) -> RoutingStep:
        try:
            step = RoutingStep.objects.select_related("routing").get(id=step_id)
        except RoutingStep.DoesNotExist:
            raise RoutingValidationError("Step not found", "id")

        if step.routing.status == RoutingStatus.ARCHIVED:
            raise RoutingValidationError("Cannot modify archived routing", "_form")

        if "sequence" in input_data:
            step.sequence = input_data["sequence"]
        if "department_id" in input_data:
            dept_id = input_data["department_id"]
            step.department = _resolve_ref(Department, dept_id) if dept_id else None
        if "resource_group_id" in input_data:
            rg_id = input_data["resource_group_id"]
            step.resource_group = _resolve_ref(ResourceGroup, rg_id) if rg_id else None
            if step.department and step.resource_group and step.resource_group.department_id != step.department.id:
                raise RoutingValidationError(
                    "Resource group does not belong to selected department", "resourceGroupId"
                )
        if "resource_id" in input_data:
            res_id = input_data["resource_id"]
            step.resource = _resolve_ref(Resource, res_id) if res_id else None
            if step.resource_group and step.resource and step.resource.resource_group_id != step.resource_group.id:
                raise RoutingValidationError(
                    "Resource does not belong to selected resource group", "resourceId"
                )
        if "standard_work_id" in input_data:
            sw_id = input_data["standard_work_id"]
            step.standard_work = _resolve_ref(ProcessFlow, sw_id) if sw_id else None
        if "cycle_time_sec" in input_data:
            step.cycle_time_sec = input_data["cycle_time_sec"]
        if "setup_time_sec" in input_data:
            step.setup_time_sec = input_data["setup_time_sec"]
        if "changeover_time_sec" in input_data:
            step.changeover_time_sec = input_data["changeover_time_sec"]
        if "required_operators" in input_data:
            step.required_operators = input_data["required_operators"]
        if "schedule_source" in input_data:
            step.schedule_source = input_data["schedule_source"]
        if "buffer_type" in input_data:
            step.buffer_type = input_data["buffer_type"]
        if "wip_min" in input_data:
            step.wip_min = input_data["wip_min"]
        if "wip_max" in input_data:
            step.wip_max = input_data["wip_max"]
        if "quality_checkpoint" in input_data:
            step.quality_checkpoint = input_data["quality_checkpoint"]
        if "rework_allowed" in input_data:
            step.rework_allowed = input_data["rework_allowed"]
        if "notes" in input_data:
            step.notes = input_data["notes"]

        step.save()
        return step

    @staticmethod
    @transaction.atomic
    def delete_step(step_id: str) -> None:
        try:
            step = RoutingStep.objects.select_related("routing").get(id=step_id)
        except RoutingStep.DoesNotExist:
            raise RoutingValidationError("Step not found", "id")

        if step.routing.status == RoutingStatus.ARCHIVED:
            raise RoutingValidationError("Cannot modify archived routing", "_form")

        routing_id = step.routing_id
        deleted_seq = step.sequence
        step.delete()

        # Re-sequence remaining steps
        remaining = RoutingStep.objects.filter(routing_id=routing_id).order_by("sequence")
        for idx, s in enumerate(remaining, start=1):
            if s.sequence != idx:
                s.sequence = idx
                s.save()

    @staticmethod
    @transaction.atomic
    def reorder_steps(routing_id: str, ordered_step_ids: list[str]) -> list[RoutingStep]:
        try:
            Routing.objects.get(id=routing_id)
        except Routing.DoesNotExist:
            raise RoutingValidationError("Routing not found", "routingId")

        steps = list(RoutingStep.objects.filter(routing_id=routing_id, id__in=ordered_step_ids))
        if len(steps) != len(ordered_step_ids):
            raise RoutingValidationError("Some step IDs are invalid", "orderedStepIds")

        step_map = {str(s.id): s for s in steps}
        for idx, step_id in enumerate(ordered_step_ids, start=1):
            step = step_map.get(step_id)
            if step:
                step.sequence = idx
                step.save()

        return list(RoutingStep.objects.filter(routing_id=routing_id).order_by("sequence"))

    # ── Validation ──

    @staticmethod
    def validate_routing(routing_id: str) -> list[dict]:
        errors = []
        try:
            routing = Routing.objects.prefetch_related("steps").get(id=routing_id)
        except Routing.DoesNotExist:
            return [_error("id", "NOT_FOUND", "Routing not found")]

        steps = list(routing.steps.all().order_by("sequence"))

        if not steps:
            errors.append(_error("steps", "NO_STEPS", "Routing has no steps"))
            return errors

        if len(steps) < 2:
            errors.append(_error("steps", "MIN_STEPS", "Routing must have at least 2 steps"))

        # Check sequence gaps/duplicates
        seqs = [s.sequence for s in steps]
        if sorted(seqs) != list(range(1, len(steps) + 1)):
            errors.append(_error("steps", "INVALID_SEQUENCE", "Step sequences must start at 1 and be continuous"))

        # Check missing department
        for s in steps:
            if not s.department:
                errors.append(_error(f"step_{s.sequence}", "MISSING_DEPT", f"Step {s.sequence} has no department"))
            if s.cycle_time_sec <= 0:
                errors.append(_error(f"step_{s.sequence}", "INVALID_CT", f"Step {s.sequence} cycle time must be > 0"))

        # Check resource group belongs to department
        for s in steps:
            if s.department and s.resource_group and s.resource_group.department_id != s.department.id:
                errors.append(_error(
                    f"step_{s.sequence}", "INVALID_RG",
                    f"Step {s.sequence}: resource group does not belong to department"
                ))
            if s.resource_group and s.resource and s.resource.resource_group_id != s.resource_group.id:
                errors.append(_error(
                    f"step_{s.sequence}", "INVALID_RES",
                    f"Step {s.sequence}: resource does not belong to resource group"
                ))

        # Check active routing conflict
        if routing.status == RoutingStatus.ACTIVE:
            conflicts = Routing.objects.filter(
                production_line=routing.production_line,
                status=RoutingStatus.ACTIVE,
            ).exclude(id=routing.id)
            if routing.product_model:
                conflicts = conflicts.filter(product_model=routing.product_model)
            if routing.product_family:
                conflicts = conflicts.filter(product_family=routing.product_family)
            if conflicts.exists():
                errors.append(_error("status", "CONFLICT", "An active routing already exists for this line/product"))

        return errors

    # ── Summary ──

    @staticmethod
    def get_routing_summary(production_line_id: str) -> dict:
        try:
            pl = ProductionLine.objects.get(id=production_line_id)
        except ProductionLine.DoesNotExist:
            return {
                "routing_id": None,
                "status": "MISSING",
                "version": None,
                "routing_scope": None,
                "message": "No routing steps configured.",
                "sequence_count": 0,
                "first_department_name": None,
                "last_department_name": None,
                "bottleneck_step_name": None,
                "bottleneck_resource_group_name": None,
                "constraint_status": None,
                "updated_at": None,
            }

        active = Routing.objects.filter(
            production_line=pl, status=RoutingStatus.ACTIVE
        ).prefetch_related("steps__department", "steps__resource_group").first()

        if not active:
            # Check if any routing exists
            latest = Routing.objects.filter(production_line=pl).prefetch_related(
                "steps__department", "steps__resource_group"
            ).order_by("-created_at").first()
            if not latest:
                return {
                    "routing_id": None,
                    "status": "MISSING",
                    "version": None,
                    "routing_scope": None,
                    "message": "No routing steps configured.",
                    "sequence_count": 0,
                    "first_department_name": None,
                    "last_department_name": None,
                    "bottleneck_step_name": None,
                    "bottleneck_resource_group_name": None,
                    "constraint_status": None,
                    "updated_at": None,
                }

            routing = latest
        else:
            routing = active

        steps = list(routing.steps.all().order_by("sequence"))
        seq_count = len(steps)

        if seq_count == 0:
            return {
                "routing_id": str(routing.id) if routing else None,
                "status": "MISSING",
                "version": routing.version if routing else None,
                "routing_scope": routing.product_model.name if routing and routing.product_model else "All Models",
                "message": "No routing steps configured.",
                "sequence_count": 0,
                "first_department_name": None,
                "last_department_name": None,
                "bottleneck_step_name": None,
                "bottleneck_resource_group_name": None,
                "constraint_status": None,
                "updated_at": routing.updated_at.isoformat() if routing and routing.updated_at else None,
            }
        elif seq_count < 2:
            status = "INVALID"
        elif RoutingService.validate_routing(str(routing.id)):
            status = "INVALID"
        else:
            status = "CONFIGURED" if active else "DRAFT"
        message = "Routing configured." if status in ("CONFIGURED", "DRAFT") else "Routing has validation errors."

        first_dept = steps[0].department.name if steps and steps[0].department else None
        last_dept = steps[-1].department.name if steps and steps[-1].department else None

        # Bottleneck calculation
        bottleneck = RoutingService.calculate_bottleneck(steps)
        bottleneck_step_name = bottleneck.get("step_name") if bottleneck else None
        bottleneck_rg_name = bottleneck.get("resource_group_name") if bottleneck else None

        # Constraint classification
        constraint = RoutingService.classify_constraint(steps, bottleneck)
        constraint_status = constraint.get("status") if constraint else None

        return {
            "routing_id": str(routing.id) if routing else None,
            "status": status,
            "version": routing.version if routing else None,
            "routing_scope": routing.product_model.name if routing and routing.product_model else "All Models",
            "message": message,
            "sequence_count": seq_count,
            "first_department_name": first_dept,
            "last_department_name": last_dept,
            "bottleneck_step_name": bottleneck_step_name,
            "bottleneck_resource_group_name": bottleneck_rg_name,
            "constraint_status": constraint_status,
            "updated_at": routing.updated_at.isoformat() if routing and routing.updated_at else None,
        }

    # ── Capacity / Bottleneck ──

    @staticmethod
    def calculate_step_capacity(step: RoutingStep, demand: int = 1000, available_hours: float = 8.0) -> dict:
        available_sec = available_hours * 3600
        ct_sec = step.cycle_time_sec or 1
        takt = available_sec / max(demand, 1)
        capacity = available_sec / ct_sec
        load_pct = (demand / max(capacity, 0.01)) * 100
        gap = demand - capacity

        return {
            "sequence": step.sequence,
            "department_name": step.department.name if step.department else None,
            "cycle_time_sec": ct_sec,
            "available_time_sec": available_sec,
            "demand_units": demand,
            "takt_time_sec": round(takt, 2),
            "capacity_units": round(capacity, 1),
            "load_percent": round(load_pct, 1),
            "capacity_gap_units": round(gap, 1),
            "is_bottleneck": False,
        }

    @staticmethod
    def calculate_bottleneck(steps: list, demand: int = 1000, available_hours: float = 8.0) -> Optional[dict]:
        if not steps:
            return None

        capacities = [
            RoutingService.calculate_step_capacity(s, demand, available_hours) for s in steps
        ]
        worst = max(capacities, key=lambda c: c["load_percent"])
        worst["is_bottleneck"] = True

        step = steps[capacities.index(worst)]
        return {
            "step_name": step.department.name if step.department else f"Step {step.sequence}",
            "resource_group_name": step.resource_group.name if step.resource_group else None,
            "load_percent": worst["load_percent"],
            "capacity_gap": worst["capacity_gap_units"],
        }

    @staticmethod
    def classify_constraint(steps: list, bottleneck: Optional[dict] = None) -> dict:
        if not steps or len(steps) < 2:
            return {"status": "NOT_APPLICABLE", "reason": "Insufficient steps"}

        if bottleneck and bottleneck.get("load_percent", 0) > 100:
            return {"status": "CONSTRAINT", "reason": f"Load {bottleneck['load_percent']}% exceeds capacity"}

        for s in steps:
            if s.cycle_time_sec <= 0:
                continue
        return {"status": "NONE", "reason": "Within capacity"}



