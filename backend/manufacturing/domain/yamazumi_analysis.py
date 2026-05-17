from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from manufacturing.domain.capacity_service import CapacityService


@dataclass
class YamazumiAnalysisInput:
    routing: Any
    planned_quantity: int
    available_time_min: float = 0
    break_time_min: float = 0
    downtime_min: float = 0
    operators: int = 1
    from_datetime: datetime | None = None
    to_datetime: datetime | None = None


class YamazumiAnalysisService:
    @staticmethod
    def _empty(input_data: YamazumiAnalysisInput, message: str) -> dict[str, Any]:
        routing = input_data.routing
        return {
            "ok": False,
            "message": message,
            "routing_id": str(routing.id) if routing and getattr(routing, "id", None) else None,
            "routing_status": getattr(routing, "status", ""),
            "routing_version": getattr(routing, "version", ""),
            "production_line_id": str(routing.production_line_id) if routing and getattr(routing, "production_line_id", None) else None,
            "product_model_id": str(routing.product_model_id) if routing and getattr(routing, "product_model_id", None) else None,
            "planned_quantity": input_data.planned_quantity,
            "net_available_time_sec": 0,
            "takt_time_sec": 0,
            "total_work_content_sec": 0,
            "bottleneck_step_name": "",
            "balance_loss_percent": 0,
            "operators_required": 0,
            "overloaded_resources": [],
            "steps": [],
            "capacity_source": "CapacityService",
        }

    @staticmethod
    def _resolve_capacity(input_data: YamazumiAnalysisInput) -> dict[str, Any]:
        routing = input_data.routing
        from_dt = input_data.from_datetime or datetime.combine(routing.created_at.date(), datetime.min.time())
        to_dt = input_data.to_datetime or datetime.combine(routing.created_at.date(), datetime.max.time())

        if routing.production_line_id:
            return CapacityService.calculate_production_line_capacity(str(routing.production_line_id), from_dt, to_dt)

        steps = list(routing.steps.all().order_by("sequence"))
        resource_step = next((step for step in steps if step.resource_id), None)
        if resource_step:
            return CapacityService.calculate_resource_capacity(str(resource_step.resource_id), from_dt, to_dt)

        resource_group_step = next((step for step in steps if step.resource_group_id), None)
        if resource_group_step:
            return CapacityService.calculate_resource_group_capacity(str(resource_group_step.resource_group_id), from_dt, to_dt)

        department_step = next((step for step in steps if step.department_id), None)
        if department_step:
            return CapacityService.calculate_department_capacity(str(department_step.department_id), from_dt, to_dt)

        return {
            "scope_type": "ROUTING",
            "scope_id": str(routing.id),
            "available_minutes": 0,
            "theoretical_capacity": 0,
            "effective_capacity": 0,
            "capacity_uom": "",
            "from_datetime": from_dt,
            "to_datetime": to_dt,
        }

    @classmethod
    def analyze(cls, input_data: YamazumiAnalysisInput) -> dict[str, Any]:
        routing = input_data.routing
        steps = list(routing.steps.all().order_by("sequence"))
        if not steps:
            return cls._empty(input_data, "Complete routing in Production Structure -> Flow.")

        capacity = cls._resolve_capacity(input_data)
        effective_capacity_minutes = float(capacity.get("effective_capacity") or 0)
        if input_data.planned_quantity <= 0 or effective_capacity_minutes <= 0:
            result = cls._empty(input_data, "Complete capacity planning inputs.")
            result["capacity_result"] = capacity
            return result

        net_available_time_sec = effective_capacity_minutes * 60
        takt_time_sec = net_available_time_sec / input_data.planned_quantity
        step_rows: list[dict[str, Any]] = []
        total_work_content_sec = 0.0
        bottleneck = None
        overloaded: list[str] = []
        total_required_operators = 0

        for step in steps:
            work_content_sec = float(step.cycle_time_sec or 0) + float(step.setup_time_sec or 0) + float(step.changeover_time_sec or 0)
            total_work_content_sec += work_content_sec
            load_percent = (work_content_sec / takt_time_sec * 100) if takt_time_sec else 0
            is_overloaded = load_percent > 100
            required_operators = max(1, int(step.required_operators or 1))
            total_required_operators += required_operators
            label = step.resource.name if step.resource else step.resource_group.name if step.resource_group else f"Step {step.sequence}"
            if is_overloaded:
                overloaded.append(label)
            if bottleneck is None or work_content_sec > bottleneck[1]:
                bottleneck = (step, work_content_sec)
            step_rows.append({
                "sequence": step.sequence,
                "department_name": step.department.name if step.department else None,
                "resource_group_name": step.resource_group.name if step.resource_group else None,
                "resource_name": step.resource.name if step.resource else None,
                "standard_work_name": step.standard_work.name if step.standard_work else None,
                "cycle_time_sec": float(step.cycle_time_sec or 0),
                "setup_time_sec": float(step.setup_time_sec or 0),
                "changeover_time_sec": float(step.changeover_time_sec or 0),
                "work_content_sec": work_content_sec,
                "takt_time_sec": takt_time_sec,
                "load_percent": load_percent,
                "required_operators": required_operators,
                "is_bottleneck": False,
                "is_overloaded": is_overloaded,
                "capacity_variance_sec": takt_time_sec - work_content_sec,
                "capacity_classification": "OVER_CAPACITY" if is_overloaded else "UNDER_CAPACITY",
            })

        bottleneck_step = None
        if bottleneck is not None:
            bottleneck_step, _ = bottleneck
        if bottleneck_step:
            for row in step_rows:
                if row["sequence"] == bottleneck_step.sequence:
                    row["is_bottleneck"] = True
                    break
        max_station_work = max((row["work_content_sec"] for row in step_rows), default=0)
        ideal_total = max_station_work * len(step_rows)
        balance_loss_percent = ((ideal_total - total_work_content_sec) / ideal_total * 100) if ideal_total else 0
        operators_required = max(total_required_operators, int((total_work_content_sec / takt_time_sec) + 0.999999))

        return {
            "ok": True,
            "message": "Yamazumi analysis ready.",
            "routing_id": str(routing.id),
            "routing_status": routing.status,
            "routing_version": routing.version,
            "production_line_id": str(routing.production_line_id) if routing.production_line_id else None,
            "product_model_id": str(routing.product_model_id) if routing.product_model_id else None,
            "planned_quantity": input_data.planned_quantity,
            "net_available_time_sec": net_available_time_sec,
            "takt_time_sec": takt_time_sec,
            "total_work_content_sec": total_work_content_sec,
            "bottleneck_step_name": (
                bottleneck_step.standard_work.name if bottleneck_step and bottleneck_step.standard_work else
                bottleneck_step.resource_group.name if bottleneck_step and bottleneck_step.resource_group else
                f"Step {bottleneck_step.sequence}" if bottleneck_step else ""
            ),
            "balance_loss_percent": balance_loss_percent,
            "operators_required": operators_required,
            "overloaded_resources": overloaded,
            "steps": step_rows,
            "capacity_source": "CapacityService",
            "capacity_result": capacity,
        }
