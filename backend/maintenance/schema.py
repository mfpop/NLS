import strawberry
from typing import Optional

from maintenance.models import (
    MaintenanceWorkOrder,
    PreventiveMaintenancePlan,
    Breakdown,
    SparePart,
    SparePartUsage,
)
from maintenance.services import (
    WorkOrderService,
    PreventiveMaintenanceService,
    BreakdownService,
    SparePartService,
    MaintenanceDashboardService,
)


# ──────────────────────────────────────────────
#  Node types
# ──────────────────────────────────────────────

@strawberry.type
class MaintenanceWorkOrderNode:
    id: int
    number: str
    title: str
    description: str
    work_order_type: str
    target_type: str
    target_id: Optional[int]
    plant_id: Optional[int]
    production_line_id: Optional[int]
    department_id: Optional[int]
    resource_group_id: Optional[int]
    resource_id: Optional[int]
    priority: str
    status: str
    requested_by: str
    assigned_to: str
    date_opened: Optional[str]
    due_date: Optional[str]
    planned_start_date: Optional[str]
    planned_end_date: Optional[str]
    actual_start_date: Optional[str]
    actual_end_date: Optional[str]
    downtime_minutes: Optional[int]
    work_instructions: str
    failure_mode: str
    safety_notes: str
    labor_estimate: Optional[float]
    completion_notes: str
    root_cause: str
    corrective_action: str
    verification_result: str
    spare_parts_required: Optional[str]
    attachments: Optional[str]
    linked_pm_id: Optional[int]
    linked_breakdown_id: Optional[int]
    linked_mer_id: Optional[int]
    created_at: str
    updated_at: str


@strawberry.type
class WorkOrderDashboardNode:
    open_work_orders: int
    in_progress: int
    overdue: int
    completed: int
    preventive: int
    corrective_breakdown: int
    waiting_parts: int
    due_this_week: int
    total_downtime_minutes: int
    last_updated: str


@strawberry.type
class PreventiveMaintenancePlanNode:
    id: int
    code: str
    title: str
    description: str
    target_type: str
    target_id: Optional[int]
    frequency: str
    interval_value: Optional[int]
    next_due_date: Optional[str]
    last_completed_date: Optional[str]
    assigned_to: str
    priority: str
    status: str
    checklist_json: Optional[str]
    notes: str
    created_at: str
    updated_at: str


@strawberry.type
class BreakdownNode:
    id: int
    number: str
    title: str
    description: str
    target_type: str
    target_id: Optional[int]
    severity: str
    status: str
    reported_by: str
    reported_at: str
    repair_started_at: Optional[str]
    repair_completed_at: Optional[str]
    downtime_minutes: Optional[int]
    root_cause: str
    repair_summary: str
    linked_work_order_id: Optional[int]
    created_at: str
    updated_at: str


@strawberry.type
class SparePartNode:
    id: int
    part_number: str
    name: str
    description: str
    category: str
    manufacturer: str
    supplier: str
    uom: str
    min_quantity: int
    quantity_on_hand: int
    storage_location: str
    notes: str
    status: str
    created_at: str
    updated_at: str


@strawberry.type
class SparePartUsageNode:
    id: int
    part_id: int
    work_order_id: int
    quantity: int
    used_by: str
    used_at: str
    notes: str
    created_at: str
    updated_at: str


@strawberry.type
class WorkOrderCreateResponse:
    ok: bool
    work_order_id: int
    number: str
    message: str


@strawberry.type
class MaintenanceSummaryNode:
    open_work_orders: int
    overdue_work_orders: int
    active_breakdowns: int
    pm_due_this_week: int
    completed_work_orders: int
    total_downtime_minutes: int
    low_stock_spare_parts: int
    last_updated: str


# ──────────────────────────────────────────────
#  Converter helpers
# ──────────────────────────────────────────────

def _to_wo_node(wo: MaintenanceWorkOrder) -> MaintenanceWorkOrderNode:
    return MaintenanceWorkOrderNode(
        id=wo.id,
        number=wo.number or "",
        title=wo.title,
        description=wo.description,
        work_order_type=wo.work_order_type,
        target_type=wo.target_type,
        target_id=wo.target_id,
        plant_id=wo.plant_id,
        production_line_id=wo.production_line_id,
        department_id=wo.department_id,
        resource_group_id=wo.resource_group_id,
        resource_id=wo.resource_id,
        priority=wo.priority,
        status=wo.status,
        requested_by=wo.requested_by,
        assigned_to=wo.assigned_to,
        date_opened=wo.date_opened.isoformat() if wo.date_opened else None,
        due_date=wo.due_date.isoformat() if wo.due_date else None,
        planned_start_date=wo.planned_start_date.isoformat() if wo.planned_start_date else None,
        planned_end_date=wo.planned_end_date.isoformat() if wo.planned_end_date else None,
        actual_start_date=wo.actual_start_date.isoformat() if wo.actual_start_date else None,
        actual_end_date=wo.actual_end_date.isoformat() if wo.actual_end_date else None,
        downtime_minutes=wo.downtime_minutes,
        work_instructions=wo.work_instructions,
        failure_mode=wo.failure_mode,
        safety_notes=wo.safety_notes,
        labor_estimate=float(wo.labor_estimate) if wo.labor_estimate else None,
        completion_notes=wo.completion_notes,
        root_cause=wo.root_cause,
        corrective_action=wo.corrective_action,
        verification_result=wo.verification_result,
        spare_parts_required=str(wo.spare_parts_required) if wo.spare_parts_required else None,
        attachments=str(wo.attachments) if wo.attachments else None,
        linked_pm_id=wo.linked_pm_id,
        linked_breakdown_id=wo.linked_breakdown_id,
        linked_mer_id=wo.linked_mer_id,
        created_at=wo.created_at.isoformat() if wo.created_at else "",
        updated_at=wo.updated_at.isoformat() if wo.updated_at else "",
    )


def _to_pm_node(pm: PreventiveMaintenancePlan) -> PreventiveMaintenancePlanNode:
    return PreventiveMaintenancePlanNode(
        id=pm.id,
        code=pm.code or "",
        title=pm.title,
        description=pm.description,
        target_type=pm.target_type,
        target_id=pm.target_id,
        frequency=pm.frequency,
        interval_value=pm.interval_value,
        next_due_date=pm.next_due_date.isoformat() if pm.next_due_date else None,
        last_completed_date=pm.last_completed_date.isoformat() if pm.last_completed_date else None,
        assigned_to=pm.assigned_to,
        priority=pm.priority,
        status=pm.status,
        checklist_json=str(pm.checklist_json) if pm.checklist_json else None,
        notes=pm.notes,
        created_at=pm.created_at.isoformat() if pm.created_at else "",
        updated_at=pm.updated_at.isoformat() if pm.updated_at else "",
    )


def _to_breakdown_node(bd: Breakdown) -> BreakdownNode:
    return BreakdownNode(
        id=bd.id,
        number=bd.number or "",
        title=bd.title,
        description=bd.description,
        target_type=bd.target_type,
        target_id=bd.target_id,
        severity=bd.severity,
        status=bd.status,
        reported_by=bd.reported_by,
        reported_at=bd.reported_at.isoformat() if bd.reported_at else "",
        repair_started_at=bd.repair_started_at.isoformat() if bd.repair_started_at else None,
        repair_completed_at=bd.repair_completed_at.isoformat() if bd.repair_completed_at else None,
        downtime_minutes=bd.downtime_minutes,
        root_cause=bd.root_cause,
        repair_summary=bd.repair_summary,
        linked_work_order_id=bd.linked_work_order_id,
        created_at=bd.created_at.isoformat() if bd.created_at else "",
        updated_at=bd.updated_at.isoformat() if bd.updated_at else "",
    )


def _to_spare_part_node(sp: SparePart) -> SparePartNode:
    return SparePartNode(
        id=sp.id,
        part_number=sp.part_number,
        name=sp.name,
        description=sp.description,
        category=sp.category,
        manufacturer=sp.manufacturer,
        supplier=sp.supplier,
        uom=sp.uom,
        min_quantity=sp.min_quantity,
        quantity_on_hand=sp.quantity_on_hand,
        storage_location=sp.storage_location,
        notes=sp.notes,
        status=sp.status,
        created_at=sp.created_at.isoformat() if sp.created_at else "",
        updated_at=sp.updated_at.isoformat() if sp.updated_at else "",
    )


def _to_usage_node(u: SparePartUsage) -> SparePartUsageNode:
    return SparePartUsageNode(
        id=u.id,
        part_id=u.part_id,
        work_order_id=u.work_order_id,
        quantity=u.quantity,
        used_by=u.used_by,
        used_at=u.used_at.isoformat() if u.used_at else "",
        notes=u.notes,
        created_at=u.created_at.isoformat() if u.created_at else "",
        updated_at=u.updated_at.isoformat() if u.updated_at else "",
    )


# ──────────────────────────────────────────────
#  MaintenanceQuery
# ──────────────────────────────────────────────

@strawberry.type
class MaintenanceQuery:
    @strawberry.field
    def maintenance_summary(self) -> MaintenanceSummaryNode:
        data = MaintenanceDashboardService().get_summary()
        return MaintenanceSummaryNode(**data)

    @strawberry.field
    def work_order_dashboard(self) -> WorkOrderDashboardNode:
        data = WorkOrderService().get_dashboard_data()
        return WorkOrderDashboardNode(**data)

    @strawberry.field
    def maintenance_work_orders(
        self,
        status: Optional[str] = None,
        work_order_type: Optional[str] = None,
        priority: Optional[str] = None,
        target_type: Optional[str] = None,
        assigned_to: Optional[str] = None,
        search: Optional[str] = None,
        overdue: Optional[bool] = None,
    ) -> list[MaintenanceWorkOrderNode]:
        filters = {}
        if status: filters["status"] = status
        if work_order_type: filters["work_order_type"] = work_order_type
        if priority: filters["priority"] = priority
        if target_type: filters["target_type"] = target_type
        if assigned_to: filters["assigned_to"] = assigned_to
        if search: filters["search"] = search
        if overdue: filters["overdue"] = True
        return [_to_wo_node(wo) for wo in WorkOrderService().list_work_orders(filters)]

    @strawberry.field
    def maintenance_work_order(self, id: int) -> Optional[MaintenanceWorkOrderNode]:
        wo = WorkOrderService().get_work_order(id)
        return _to_wo_node(wo) if wo else None

    @strawberry.field
    def preventive_maintenance_plans(
        self,
        status: Optional[str] = None,
        frequency: Optional[str] = None,
        target_type: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[PreventiveMaintenancePlanNode]:
        filters = {}
        if status: filters["status"] = status
        if frequency: filters["frequency"] = frequency
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        return [_to_pm_node(pm) for pm in PreventiveMaintenanceService().list_pms(filters)]

    @strawberry.field
    def preventive_maintenance_plan(self, id: int) -> Optional[PreventiveMaintenancePlanNode]:
        pm = PreventiveMaintenanceService().get_pm(id)
        return _to_pm_node(pm) if pm else None

    @strawberry.field
    def due_preventive_maintenance(self) -> list[PreventiveMaintenancePlanNode]:
        return [_to_pm_node(pm) for pm in PreventiveMaintenanceService().due_pms()]

    @strawberry.field
    def breakdowns(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        target_type: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[BreakdownNode]:
        filters = {}
        if status: filters["status"] = status
        if severity: filters["severity"] = severity
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        return [_to_breakdown_node(bd) for bd in BreakdownService().list_breakdowns(filters)]

    @strawberry.field
    def breakdown(self, id: int) -> Optional[BreakdownNode]:
        bd = BreakdownService().get_breakdown(id)
        return _to_breakdown_node(bd) if bd else None

    @strawberry.field
    def spare_parts(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[SparePartNode]:
        filters = {}
        if status: filters["status"] = status
        if category: filters["category"] = category
        if search: filters["search"] = search
        return [_to_spare_part_node(sp) for sp in SparePartService().list_spare_parts(filters)]

    @strawberry.field
    def spare_part(self, id: int) -> Optional[SparePartNode]:
        sp = SparePartService().get_spare_part(id)
        return _to_spare_part_node(sp) if sp else None

    @strawberry.field
    def low_stock_spare_parts(self) -> list[SparePartNode]:
        return [_to_spare_part_node(sp) for sp in SparePartService().low_stock_parts()]

    @strawberry.field
    def spare_part_usages(self, work_order_id: Optional[int] = None,
                          spare_part_id: Optional[int] = None) -> list[SparePartUsageNode]:
        qs = SparePartUsage.objects.all()
        if work_order_id:
            qs = qs.filter(work_order_id=work_order_id)
        if spare_part_id:
            qs = qs.filter(part_id=spare_part_id)
        return [_to_usage_node(u) for u in qs]


# ──────────────────────────────────────────────
#  MaintenanceMutation
# ──────────────────────────────────────────────

@strawberry.type
class MaintenanceMutation:
    # ── Work Orders ──
    @strawberry.mutation
    def create_work_order(
        self,
        title: str,
        work_order_type: str,
        target_type: str = "",
        target_id: Optional[int] = None,
        plant_id: Optional[int] = None,
        production_line_id: Optional[int] = None,
        department_id: Optional[int] = None,
        resource_group_id: Optional[int] = None,
        resource_id: Optional[int] = None,
        description: str = "",
        priority: str = "MEDIUM",
        requested_by: str = "",
        assigned_to: str = "",
        due_date: Optional[str] = None,
        work_instructions: str = "",
        failure_mode: str = "",
        safety_notes: str = "",
        labour_estimate: Optional[float] = None,
    ) -> WorkOrderCreateResponse:
        from datetime import date
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "work_order_type": work_order_type,
            "target_type": target_type, "target_id": target_id,
            "plant_id": plant_id, "production_line_id": production_line_id,
            "department_id": department_id, "resource_group_id": resource_group_id,
            "resource_id": resource_id,
            "priority": priority, "requested_by": requested_by,
            "assigned_to": assigned_to,
            "work_instructions": work_instructions,
            "failure_mode": failure_mode,
            "safety_notes": safety_notes,
            "labour_estimate": labour_estimate,
        }.items() if v is not None and v != ""}
        if due_date:
            kwargs["due_date"] = date.fromisoformat(due_date)
        wo = WorkOrderService().create_work_order(**kwargs)
        return WorkOrderCreateResponse(ok=True, work_order_id=wo.id, number=wo.number or "", message=f"Work order created: {wo.number}")

    @strawberry.mutation
    def update_work_order(
        self, id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        plant_id: Optional[int] = None,
        production_line_id: Optional[int] = None,
        department_id: Optional[int] = None,
        resource_group_id: Optional[int] = None,
        resource_id: Optional[int] = None,
        due_date: Optional[str] = None,
        work_instructions: Optional[str] = None,
        failure_mode: Optional[str] = None,
        safety_notes: Optional[str] = None,
        labour_estimate: Optional[float] = None,
    ) -> str:
        from datetime import date
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "priority": priority, "assigned_to": assigned_to,
            "target_type": target_type, "target_id": target_id,
            "plant_id": plant_id, "production_line_id": production_line_id,
            "department_id": department_id, "resource_group_id": resource_group_id,
            "resource_id": resource_id,
            "work_instructions": work_instructions,
            "failure_mode": failure_mode,
            "safety_notes": safety_notes,
            "labour_estimate": labour_estimate,
        }.items() if v is not None and v != ""}
        if due_date is not None:
            if due_date:
                kwargs["due_date"] = date.fromisoformat(due_date)
            else:
                kwargs["due_date"] = None
        WorkOrderService().update_work_order(id, **kwargs)
        return "Work order updated"

    @strawberry.mutation
    def submit_work_order(self, id: int) -> str:
        WorkOrderService().submit_work_order(id)
        return "Work order submitted"

    @strawberry.mutation
    def assign_work_order(self, id: int, assigned_to: str = "") -> str:
        WorkOrderService().assign_work_order(id, assigned_to=assigned_to)
        return "Work order assigned"

    @strawberry.mutation
    def start_work_order(self, id: int) -> str:
        WorkOrderService().start_work_order(id)
        return "Work order started"

    @strawberry.mutation
    def hold_work_order_for_parts(self, id: int) -> str:
        WorkOrderService().hold_for_parts(id)
        return "Work order on hold - waiting parts"

    @strawberry.mutation
    def resume_work_order_from_parts(self, id: int) -> str:
        WorkOrderService().resume_from_parts(id)
        return "Work order resumed from parts hold"

    @strawberry.mutation
    def submit_work_order_for_approval(self, id: int) -> str:
        WorkOrderService().submit_for_approval(id)
        return "Work order submitted for approval"

    @strawberry.mutation
    def approve_work_order(self, id: int) -> str:
        WorkOrderService().approve_work_order(id)
        return "Work order approved and completed"

    @strawberry.mutation
    def complete_work_order(self, id: int,
                            completion_notes: str = "",
                            downtime_minutes: Optional[int] = None,
                            root_cause: str = "",
                            corrective_action: str = "",
                            verification_result: str = "",
                            actual_end_date: Optional[str] = None) -> str:
        from datetime import datetime
        aed = datetime.fromisoformat(actual_end_date) if actual_end_date else None
        WorkOrderService().complete_work_order(
            id, completion_notes=completion_notes,
            downtime_minutes=downtime_minutes,
            root_cause=root_cause,
            corrective_action=corrective_action,
            verification_result=verification_result,
            actual_end_date=aed,
        )
        return "Work order completed"

    @strawberry.mutation
    def cancel_work_order(self, id: int) -> str:
        WorkOrderService().cancel_work_order(id)
        return "Work order cancelled"

    @strawberry.mutation
    def archive_work_order(self, id: int) -> str:
        WorkOrderService().archive_work_order(id)
        return "Work order archived"

    # ── Preventive Maintenance ──
    @strawberry.mutation
    def create_preventive_maintenance(
        self,
        title: str,
        frequency: str,
        target_type: str,
        target_id: Optional[int] = None,
        description: str = "",
        interval_value: Optional[int] = None,
        next_due_date: Optional[str] = None,
        assigned_to: str = "",
        priority: str = "MEDIUM",
        notes: str = "",
        checklist_json: Optional[str] = None,
    ) -> str:
        import json
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "frequency": frequency,
            "target_type": target_type, "target_id": target_id,
            "interval_value": interval_value,
            "assigned_to": assigned_to,
            "priority": priority,
            "notes": notes,
            "checklist_json": json.loads(checklist_json) if checklist_json else None,
        }.items() if v is not None}
        if next_due_date:
            from datetime import date
            kwargs["next_due_date"] = date.fromisoformat(next_due_date)
        pm = PreventiveMaintenanceService().create_pm(**kwargs)
        return f"PM plan created: {pm.code}"

    @strawberry.mutation
    def update_preventive_maintenance(
        self, id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        frequency: Optional[str] = None,
        interval_value: Optional[int] = None,
        assigned_to: Optional[str] = None,
        priority: Optional[str] = None,
        notes: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        next_due_date: Optional[str] = None,
        checklist_json: Optional[str] = None,
    ) -> str:
        import json
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "frequency": frequency, "interval_value": interval_value,
            "assigned_to": assigned_to,
            "priority": priority,
            "notes": notes,
            "target_type": target_type, "target_id": target_id,
            "checklist_json": json.loads(checklist_json) if checklist_json else None,
        }.items() if v is not None}
        if next_due_date is not None:
            if next_due_date:
                from datetime import date
                kwargs["next_due_date"] = date.fromisoformat(next_due_date)
            else:
                kwargs["next_due_date"] = None
        PreventiveMaintenanceService().update_pm(id, **kwargs)
        return "PM plan updated"

    @strawberry.mutation
    def activate_preventive_maintenance(self, id: int) -> str:
        PreventiveMaintenanceService().activate_pm(id)
        return "PM plan activated"

    @strawberry.mutation
    def pause_preventive_maintenance(self, id: int) -> str:
        PreventiveMaintenanceService().pause_pm(id)
        return "PM plan paused"

    @strawberry.mutation
    def archive_preventive_maintenance(self, id: int) -> str:
        PreventiveMaintenanceService().archive_pm(id)
        return "PM plan archived"

    @strawberry.mutation
    def generate_work_order_from_pm(self, id: int,
                                    due_date: Optional[str] = None) -> str:
        d = None
        if due_date:
            from datetime import date
            d = date.fromisoformat(due_date)
        wo = PreventiveMaintenanceService().generate_work_order(id, due_date=d)
        return f"Work order generated: {wo.number}"

    # ── Breakdowns ──
    @strawberry.mutation
    def report_breakdown(
        self,
        title: str,
        target_type: str,
        target_id: Optional[int] = None,
        description: str = "",
        severity: str = "MEDIUM",
        reported_by: str = "",
    ) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "target_type": target_type, "target_id": target_id,
            "severity": severity, "reported_by": reported_by,
        }.items() if v is not None}
        bd = BreakdownService().report_breakdown(**kwargs)
        return f"Breakdown reported: {bd.number}"

    @strawberry.mutation
    def update_breakdown(
        self, id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "severity": severity,
        }.items() if v is not None}
        BreakdownService().update_breakdown(id, **kwargs)
        return "Breakdown updated"

    @strawberry.mutation
    def start_breakdown_repair(self, id: int) -> str:
        BreakdownService().start_repair(id)
        return "Breakdown repair started"

    @strawberry.mutation
    def complete_breakdown_repair(self, id: int,
                                  repair_summary: str = "",
                                  root_cause: str = "") -> str:
        BreakdownService().complete_repair(
            id, repair_summary=repair_summary, root_cause=root_cause,
        )
        return "Breakdown repair completed"

    @strawberry.mutation
    def close_breakdown(self, id: int) -> str:
        BreakdownService().close_breakdown(id)
        return "Breakdown closed"

    @strawberry.mutation
    def cancel_breakdown(self, id: int) -> str:
        BreakdownService().cancel_breakdown(id)
        return "Breakdown cancelled"

    @strawberry.mutation
    def create_work_order_from_breakdown(self, id: int,
                                         assigned_to: str = "") -> str:
        wo = BreakdownService().create_work_order(id, assigned_to=assigned_to)
        return f"Work order created: {wo.number}"

    # ── Spare Parts ──
    @strawberry.mutation
    def create_spare_part(
        self,
        part_number: str,
        name: str,
        description: str = "",
        category: str = "",
        manufacturer: str = "",
        supplier: str = "",
        uom: str = "",
        min_quantity: int = 0,
        quantity_on_hand: int = 0,
        storage_location: str = "",
        notes: str = "",
    ) -> str:
        kwargs = {k: v for k, v in {
            "part_number": part_number, "name": name,
            "description": description, "category": category,
            "manufacturer": manufacturer, "supplier": supplier,
            "uom": uom, "min_quantity": min_quantity,
            "quantity_on_hand": quantity_on_hand,
            "storage_location": storage_location,
            "notes": notes,
        }.items() if v is not None}
        sp = SparePartService().create_spare_part(**kwargs)
        return f"Spare part created: {sp.part_number}"

    @strawberry.mutation
    def update_spare_part(
        self, id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        category: Optional[str] = None,
        manufacturer: Optional[str] = None,
        supplier: Optional[str] = None,
        uom: Optional[str] = None,
        min_quantity: Optional[int] = None,
        storage_location: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> str:
        kwargs = {k: v for k, v in {
            "name": name, "description": description,
            "category": category,
            "manufacturer": manufacturer, "supplier": supplier,
            "uom": uom, "min_quantity": min_quantity,
            "storage_location": storage_location,
            "notes": notes,
        }.items() if v is not None}
        SparePartService().update_spare_part(id, **kwargs)
        return "Spare part updated"

    @strawberry.mutation
    def adjust_spare_part_quantity(self, id: int, adjustment: int) -> str:
        part = SparePartService().adjust_quantity(id, adjustment)
        return f"Quantity adjusted. New on hand: {part.quantity_on_hand}"

    @strawberry.mutation
    def record_spare_part_usage(
        self, part_id: int, work_order_id: int,
        quantity: int, used_by: str = "", notes: str = "",
    ) -> str:
        usage = SparePartService().record_usage(
            part_id, work_order_id, quantity,
            used_by=used_by, notes=notes,
        )
        return f"Usage recorded: {usage.part.part_number} x{usage.quantity}"

    @strawberry.mutation
    def mark_spare_part_inactive(self, id: int) -> str:
        SparePartService().mark_inactive(id)
        return "Spare part marked inactive"

    @strawberry.mutation
    def mark_spare_part_obsolete(self, id: int) -> str:
        SparePartService().mark_obsolete(id)
        return "Spare part marked obsolete"
