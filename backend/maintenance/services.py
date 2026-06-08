"""Application services for the maintenance domain."""

from datetime import date, timedelta
from typing import Optional

from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from maintenance.models import (
    MaintenanceWorkOrder,
    PreventiveMaintenancePlan,
    Breakdown,
    SparePart,
    SparePartUsage,
)
from maintenance.constants import (
    WORK_ORDER_TYPE_PREVENTIVE,
    WORK_ORDER_TYPE_BREAKDOWN,
    WORK_ORDER_STATUS_DRAFT,
    WORK_ORDER_STATUS_OPEN,
    WORK_ORDER_STATUS_ASSIGNED,
    WORK_ORDER_STATUS_IN_PROGRESS,
    WORK_ORDER_STATUS_WAITING_PARTS,
    WORK_ORDER_STATUS_WAITING_APPROVAL,
    WORK_ORDER_STATUS_COMPLETED,
    WORK_ORDER_STATUS_CANCELLED,
    WORK_ORDER_STATUS_ARCHIVED,
    WORK_ORDER_ACTIVE_STATUSES,
    PM_STATUS_ACTIVE,
    PM_STATUS_PAUSED,
    PM_STATUS_ARCHIVED,
    BREAKDOWN_STATUS_REPORTED,
    BREAKDOWN_STATUS_UNDER_REPAIR,
    BREAKDOWN_STATUS_REPAIRED,
    BREAKDOWN_STATUS_CLOSED,
    BREAKDOWN_STATUS_CANCELLED,
    SPARE_PART_STATUS_ACTIVE,
    SPARE_PART_STATUS_INACTIVE,
    SPARE_PART_STATUS_OBSOLETE,
)
from maintenance.domain_rules import (
    can_submit_work_order,
    can_assign_work_order,
    can_start_work_order,
    can_hold_for_parts,
    can_resume_from_parts,
    can_submit_for_approval,
    can_approve,
    can_complete_work_order,
    can_cancel_work_order,
    can_archive_work_order,
    can_pause_pm,
    can_activate_pm,
    can_archive_pm,
    can_start_breakdown_repair,
    can_complete_breakdown_repair,
    can_close_breakdown,
    can_cancel_breakdown,
)
from maintenance.exceptions import (
    WorkOrderNotFoundError,
    PreventiveMaintenanceNotFoundError,
    BreakdownNotFoundError,
    SparePartNotFoundError,
    InvalidStatusTransitionError,
    MaintenanceValidationError,
)
from maintenance.validators import validate_non_empty, validate_target_type


def _generate_number(prefix: str) -> str:
    """Generate an entity number like WO-00001."""
    last = MaintenanceWorkOrder.objects.filter(
        number__startswith=f"{prefix}-"
    ).order_by("number").last()
    if last and last.number:
        num = int(last.number.split("-")[1]) + 1
    else:
        num = 1
    return f"{prefix}-{num:05d}"


def _generate_pm_code() -> str:
    last = PreventiveMaintenancePlan.objects.filter(
        code__startswith="PM-"
    ).order_by("code").last()
    if last and last.code:
        num = int(last.code.split("-")[1]) + 1
    else:
        num = 1
    return f"PM-{num:05d}"


def _generate_breakdown_number() -> str:
    last = Breakdown.objects.filter(
        number__startswith="BD-"
    ).order_by("number").last()
    if last and last.number:
        num = int(last.number.split("-")[1]) + 1
    else:
        num = 1
    return f"BD-{num:05d}"


# ──────────────────────────────────────────────
#  WorkOrderService
# ──────────────────────────────────────────────

class WorkOrderService:
    def create_work_order(self, **kwargs) -> MaintenanceWorkOrder:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        # Clean empty-string numeric IDs
        for int_field in ["target_id", "plant_id", "production_line_id",
                           "department_id", "resource_group_id", "resource_id"]:
            if int_field in kwargs and kwargs[int_field] == "":
                kwargs[int_field] = None
        wo = MaintenanceWorkOrder(**kwargs)
        if not wo.number:
            wo.number = _generate_number("WO")
        wo.save()
        return wo

    def update_work_order(self, wo_id: int, **kwargs) -> MaintenanceWorkOrder:
        wo = self._get(wo_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        # Clean empty-string numeric IDs
        for int_field in ["target_id", "plant_id", "production_line_id",
                           "department_id", "resource_group_id", "resource_id"]:
            if int_field in kwargs and kwargs[int_field] == "":
                kwargs[int_field] = None
        for key, value in kwargs.items():
            setattr(wo, key, value)
        wo.save()
        return wo

    def submit_work_order(self, wo_id: int) -> MaintenanceWorkOrder:
        """DRAFT → OPEN"""
        wo = self._get(wo_id)
        if not can_submit_work_order(wo.status):
            raise InvalidStatusTransitionError(
                f"Cannot submit work order in status '{wo.status}'"
            )
        wo.status = WORK_ORDER_STATUS_OPEN
        if not wo.date_opened:
            wo.date_opened = timezone.now()
        wo.save()
        return wo

    def assign_work_order(self, wo_id: int, assigned_to: str = "") -> MaintenanceWorkOrder:
        """OPEN → ASSIGNED"""
        wo = self._get(wo_id)
        if not can_assign_work_order(wo.status):
            raise InvalidStatusTransitionError(
                f"Cannot assign work order in status '{wo.status}'"
            )
        wo.status = WORK_ORDER_STATUS_ASSIGNED
        if assigned_to:
            wo.assigned_to = assigned_to
        wo.save()
        return wo

    def start_work_order(self, wo_id: int) -> MaintenanceWorkOrder:
        """ASSIGNED → IN_PROGRESS"""
        wo = self._get(wo_id)
        if not can_start_work_order(wo.status):
            raise InvalidStatusTransitionError(
                f"Cannot start work order in status '{wo.status}'"
            )
        wo.status = WORK_ORDER_STATUS_IN_PROGRESS
        wo.actual_start_date = timezone.now()
        wo.save()
        return wo

    def hold_for_parts(self, wo_id: int) -> MaintenanceWorkOrder:
        """IN_PROGRESS → WAITING_PARTS"""
        wo = self._get(wo_id)
        if not can_hold_for_parts(wo.status):
            raise InvalidStatusTransitionError(
                f"Cannot hold for parts in status '{wo.status}'"
            )
        wo.status = WORK_ORDER_STATUS_WAITING_PARTS
        wo.save()
        return wo

    def resume_from_parts(self, wo_id: int) -> MaintenanceWorkOrder:
        """WAITING_PARTS → IN_PROGRESS"""
        wo = self._get(wo_id)
        if not can_resume_from_parts(wo.status):
            raise InvalidStatusTransitionError(
                f"Cannot resume from parts in status '{wo.status}'"
            )
        wo.status = WORK_ORDER_STATUS_IN_PROGRESS
        wo.save()
        return wo

    def submit_for_approval(self, wo_id: int) -> MaintenanceWorkOrder:
        """IN_PROGRESS → WAITING_APPROVAL"""
        wo = self._get(wo_id)
        if not can_submit_for_approval(wo.status):
            raise InvalidStatusTransitionError(
                f"Cannot submit for approval in status '{wo.status}'"
            )
        wo.status = WORK_ORDER_STATUS_WAITING_APPROVAL
        wo.save()
        return wo

    def approve_work_order(self, wo_id: int) -> MaintenanceWorkOrder:
        """WAITING_APPROVAL → COMPLETED"""
        wo = self._get(wo_id)
        if not can_approve(wo.status):
            raise InvalidStatusTransitionError(
                f"Cannot approve work order in status '{wo.status}'"
            )
        wo.status = WORK_ORDER_STATUS_COMPLETED
        wo.actual_end_date = timezone.now()
        wo.save()
        return wo

    def complete_work_order(self, wo_id: int, completion_notes: str = "",
                            downtime_minutes: int = None,
                            root_cause: str = "",
                            corrective_action: str = "",
                            verification_result: str = "",
                            actual_end_date=None) -> MaintenanceWorkOrder:
        wo = self._get(wo_id)
        if not can_complete_work_order(wo.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete work order in status '{wo.status}'"
            )
        wo.status = WORK_ORDER_STATUS_COMPLETED
        wo.actual_end_date = actual_end_date or timezone.now()
        if completion_notes:
            wo.completion_notes = completion_notes
        if downtime_minutes is not None:
            wo.downtime_minutes = downtime_minutes
        if root_cause:
            wo.root_cause = root_cause
        if corrective_action:
            wo.corrective_action = corrective_action
        if verification_result:
            wo.verification_result = verification_result
        wo.save()
        return wo

    def cancel_work_order(self, wo_id: int) -> MaintenanceWorkOrder:
        wo = self._get(wo_id)
        if not can_cancel_work_order(wo.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel work order in status '{wo.status}'"
            )
        wo.status = WORK_ORDER_STATUS_CANCELLED
        wo.save()
        return wo

    def archive_work_order(self, wo_id: int) -> MaintenanceWorkOrder:
        """COMPLETED or CANCELLED → ARCHIVED"""
        wo = self._get(wo_id)
        if not can_archive_work_order(wo.status):
            raise InvalidStatusTransitionError(
                f"Cannot archive work order in status '{wo.status}'"
            )
        wo.status = WORK_ORDER_STATUS_ARCHIVED
        wo.save()
        return wo

    def list_work_orders(self, filters: dict | None = None) -> list[MaintenanceWorkOrder]:
        qs = MaintenanceWorkOrder.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("work_order_type"):
                qs = qs.filter(work_order_type=filters["work_order_type"])
            if filters.get("priority"):
                qs = qs.filter(priority=filters["priority"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("assigned_to"):
                qs = qs.filter(assigned_to__icontains=filters["assigned_to"])
            if filters.get("search"):
                qs = qs.filter(
                    Q(title__icontains=filters["search"]) |
                    Q(number__icontains=filters["search"])
                )
            if filters.get("overdue"):
                from datetime import date
                today = date.today()
                qs = qs.filter(
                    status__in=WORK_ORDER_ACTIVE_STATUSES,
                    due_date__lt=today,
                )
        return list(qs)

    def get_work_order(self, wo_id: int) -> MaintenanceWorkOrder | None:
        return MaintenanceWorkOrder.objects.filter(id=wo_id).first()

    def get_dashboard_data(self) -> dict:
        """Get dashboard counts for the Work Orders dashboard."""
        today = date.today()
        now = timezone.now()
        week_end = today + timedelta(days=7)

        open_wos = MaintenanceWorkOrder.objects.filter(
            status__in=[WORK_ORDER_STATUS_OPEN, WORK_ORDER_STATUS_ASSIGNED]
        ).count()

        in_progress = MaintenanceWorkOrder.objects.filter(
            status=WORK_ORDER_STATUS_IN_PROGRESS
        ).count()

        overdue = MaintenanceWorkOrder.objects.filter(
            status__in=WORK_ORDER_ACTIVE_STATUSES,
            due_date__lt=today,
        ).count()

        completed = MaintenanceWorkOrder.objects.filter(
            status=WORK_ORDER_STATUS_COMPLETED,
        ).count()

        preventive = MaintenanceWorkOrder.objects.filter(
            work_order_type=WORK_ORDER_TYPE_PREVENTIVE,
            status__in=WORK_ORDER_ACTIVE_STATUSES,
        ).count()

        corrective_breakdown = MaintenanceWorkOrder.objects.filter(
            work_order_type__in=[WORK_ORDER_TYPE_CORRECTIVE, WORK_ORDER_TYPE_BREAKDOWN],
            status__in=WORK_ORDER_ACTIVE_STATUSES,
        ).count()

        waiting_parts = MaintenanceWorkOrder.objects.filter(
            status=WORK_ORDER_STATUS_WAITING_PARTS,
        ).count()

        due_this_week = MaintenanceWorkOrder.objects.filter(
            status__in=WORK_ORDER_ACTIVE_STATUSES,
            due_date__gte=today,
            due_date__lte=week_end,
        ).count()

        total_downtime = MaintenanceWorkOrder.objects.filter(
            downtime_minutes__isnull=False,
        ).aggregate(total=Sum("downtime_minutes"))["total"] or 0

        return {
            "open_work_orders": open_wos,
            "in_progress": in_progress,
            "overdue": overdue,
            "completed": completed,
            "preventive": preventive,
            "corrective_breakdown": corrective_breakdown,
            "waiting_parts": waiting_parts,
            "due_this_week": due_this_week,
            "total_downtime_minutes": total_downtime,
            "last_updated": timezone.now().isoformat(),
        }

    def _get(self, wo_id: int) -> MaintenanceWorkOrder:
        wo = MaintenanceWorkOrder.objects.filter(id=wo_id).first()
        if not wo:
            raise WorkOrderNotFoundError(f"WorkOrder {wo_id} not found")
        return wo


# ──────────────────────────────────────────────
#  PreventiveMaintenanceService
# ──────────────────────────────────────────────

class PreventiveMaintenanceService:
    def create_pm(self, **kwargs) -> PreventiveMaintenancePlan:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        pm = PreventiveMaintenancePlan(**kwargs)
        if not pm.code:
            pm.code = _generate_pm_code()
        pm.save()
        return pm

    def update_pm(self, pm_id: int, **kwargs) -> PreventiveMaintenancePlan:
        pm = self._get(pm_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(pm, key, value)
        pm.save()
        return pm

    def activate_pm(self, pm_id: int) -> PreventiveMaintenancePlan:
        pm = self._get(pm_id)
        if not can_activate_pm(pm.status):
            raise InvalidStatusTransitionError(
                f"Cannot activate PM in status '{pm.status}'"
            )
        pm.status = PM_STATUS_ACTIVE
        pm.save()
        return pm

    def pause_pm(self, pm_id: int) -> PreventiveMaintenancePlan:
        pm = self._get(pm_id)
        if not can_pause_pm(pm.status):
            raise InvalidStatusTransitionError(
                f"Cannot pause PM in status '{pm.status}'"
            )
        pm.status = PM_STATUS_PAUSED
        pm.save()
        return pm

    def archive_pm(self, pm_id: int) -> PreventiveMaintenancePlan:
        pm = self._get(pm_id)
        if not can_archive_pm(pm.status):
            raise InvalidStatusTransitionError(
                f"Cannot archive PM in status '{pm.status}'"
            )
        pm.status = PM_STATUS_ARCHIVED
        pm.save()
        return pm

    def generate_work_order(self, pm_id: int, due_date: date = None) -> MaintenanceWorkOrder:
        pm = self._get(pm_id)
        if pm.status != PM_STATUS_ACTIVE:
            raise InvalidStatusTransitionError(
                f"Cannot generate WO from PM in status '{pm.status}'"
            )
        wo = MaintenanceWorkOrder(
            title=f"PM: {pm.title}",
            description=f"Preventive maintenance generated from plan {pm.code}: {pm.description}",
            work_order_type=WORK_ORDER_TYPE_PREVENTIVE,
            target_type=pm.target_type,
            target_id=pm.target_id,
            assigned_to=pm.assigned_to,
            linked_pm=pm,
            status=WORK_ORDER_STATUS_OPEN,
        )
        if not wo.number:
            wo.number = _generate_number("WO")
        if due_date:
            wo.due_date = due_date
        wo.save()
        return wo

    def list_pms(self, filters: dict | None = None) -> list[PreventiveMaintenancePlan]:
        qs = PreventiveMaintenancePlan.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("frequency"):
                qs = qs.filter(frequency=filters["frequency"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(
                    Q(title__icontains=filters["search"]) |
                    Q(code__icontains=filters["search"])
                )
        return list(qs)

    def get_pm(self, pm_id: int) -> PreventiveMaintenancePlan | None:
        return PreventiveMaintenancePlan.objects.filter(id=pm_id).first()

    def due_pms(self) -> list[PreventiveMaintenancePlan]:
        """Return active PMs that are due (next_due_date <= today or overdue)."""
        today = date.today()
        return list(PreventiveMaintenancePlan.objects.filter(
            status=PM_STATUS_ACTIVE,
            next_due_date__lte=today,
        ))

    def _get(self, pm_id: int) -> PreventiveMaintenancePlan:
        pm = PreventiveMaintenancePlan.objects.filter(id=pm_id).first()
        if not pm:
            raise PreventiveMaintenanceNotFoundError(f"PM plan {pm_id} not found")
        return pm


# ──────────────────────────────────────────────
#  BreakdownService
# ──────────────────────────────────────────────

class BreakdownService:
    def report_breakdown(self, **kwargs) -> Breakdown:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        bd = Breakdown(**kwargs)
        if not bd.number:
            bd.number = _generate_breakdown_number()
        bd.save()
        return bd

    def update_breakdown(self, bd_id: int, **kwargs) -> Breakdown:
        bd = self._get(bd_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(bd, key, value)
        bd.save()
        return bd

    def start_repair(self, bd_id: int) -> Breakdown:
        bd = self._get(bd_id)
        if not can_start_breakdown_repair(bd.status):
            raise InvalidStatusTransitionError(
                f"Cannot start repair for breakdown in status '{bd.status}'"
            )
        bd.status = BREAKDOWN_STATUS_UNDER_REPAIR
        bd.repair_started_at = timezone.now()
        bd.save()
        return bd

    def complete_repair(self, bd_id: int, repair_summary: str = "",
                        root_cause: str = "") -> Breakdown:
        bd = self._get(bd_id)
        if not can_complete_breakdown_repair(bd.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete repair for breakdown in status '{bd.status}'"
            )
        bd.status = BREAKDOWN_STATUS_REPAIRED
        bd.repair_completed_at = timezone.now()
        if repair_summary:
            bd.repair_summary = repair_summary
        if root_cause:
            bd.root_cause = root_cause
        if bd.repair_started_at and bd.repair_completed_at:
            delta = bd.repair_completed_at - bd.repair_started_at
            bd.downtime_minutes = int(delta.total_seconds() / 60)
        bd.save()
        return bd

    def close_breakdown(self, bd_id: int) -> Breakdown:
        bd = self._get(bd_id)
        if not can_close_breakdown(bd.status):
            raise InvalidStatusTransitionError(
                f"Cannot close breakdown in status '{bd.status}'"
            )
        bd.status = BREAKDOWN_STATUS_CLOSED
        bd.save()
        return bd

    def cancel_breakdown(self, bd_id: int) -> Breakdown:
        bd = self._get(bd_id)
        if not can_cancel_breakdown(bd.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel breakdown in status '{bd.status}'"
            )
        bd.status = BREAKDOWN_STATUS_CANCELLED
        bd.save()
        return bd

    def create_work_order(self, bd_id: int, assigned_to: str = "") -> MaintenanceWorkOrder:
        bd = self._get(bd_id)
        wo = MaintenanceWorkOrder(
            title=f"Repair: {bd.title}",
            description=f"Repair work order for breakdown {bd.number}: {bd.description}",
            work_order_type=WORK_ORDER_TYPE_BREAKDOWN,
            target_type=bd.target_type,
            target_id=bd.target_id,
            assigned_to=assigned_to,
            linked_breakdown=bd,
            status=WORK_ORDER_STATUS_OPEN,
        )
        if not wo.number:
            wo.number = _generate_number("WO")
        wo.save()
        bd.linked_work_order = wo
        bd.save()
        return wo

    def list_breakdowns(self, filters: dict | None = None) -> list[Breakdown]:
        qs = Breakdown.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("severity"):
                qs = qs.filter(severity=filters["severity"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(
                    Q(title__icontains=filters["search"]) |
                    Q(number__icontains=filters["search"])
                )
        return list(qs)

    def get_breakdown(self, bd_id: int) -> Breakdown | None:
        return Breakdown.objects.filter(id=bd_id).first()

    def _get(self, bd_id: int) -> Breakdown:
        bd = Breakdown.objects.filter(id=bd_id).first()
        if not bd:
            raise BreakdownNotFoundError(f"Breakdown {bd_id} not found")
        return bd


# ──────────────────────────────────────────────
#  SparePartService
# ──────────────────────────────────────────────

class SparePartService:
    def create_spare_part(self, **kwargs) -> SparePart:
        validate_non_empty(kwargs.get("part_number", ""), "part_number")
        validate_non_empty(kwargs.get("name", ""), "name")
        part = SparePart(**kwargs)
        part.save()
        return part

    def update_spare_part(self, part_id: int, **kwargs) -> SparePart:
        part = self._get(part_id)
        if kwargs.get("part_number"):
            validate_non_empty(kwargs["part_number"], "part_number")
        for key, value in kwargs.items():
            setattr(part, key, value)
        part.save()
        return part

    def adjust_quantity(self, part_id: int, adjustment: int) -> SparePart:
        """Adjust quantity_on_hand by the given amount (positive or negative)."""
        part = self._get(part_id)
        part.quantity_on_hand += adjustment
        if part.quantity_on_hand < 0:
            part.quantity_on_hand = 0
        part.save()
        return part

    def record_usage(self, part_id: int, work_order_id: int,
                     quantity: int, used_by: str = "",
                     notes: str = "") -> SparePartUsage:
        part = self._get(part_id)
        wo = WorkOrderService()._get(work_order_id)
        if quantity <= 0:
            raise MaintenanceValidationError("Usage quantity must be positive")
        if part.quantity_on_hand < quantity:
            raise MaintenanceValidationError(
                f"Insufficient stock: have {part.quantity_on_hand}, need {quantity}"
            )
        part.quantity_on_hand -= quantity
        part.save()
        usage = SparePartUsage.objects.create(
            part=part,
            work_order=wo,
            quantity=quantity,
            used_by=used_by,
            notes=notes,
        )
        return usage

    def mark_inactive(self, part_id: int) -> SparePart:
        part = self._get(part_id)
        part.status = SPARE_PART_STATUS_INACTIVE
        part.save()
        return part

    def mark_obsolete(self, part_id: int) -> SparePart:
        part = self._get(part_id)
        part.status = SPARE_PART_STATUS_OBSOLETE
        part.save()
        return part

    def list_spare_parts(self, filters: dict | None = None) -> list[SparePart]:
        qs = SparePart.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("category"):
                qs = qs.filter(category__icontains=filters["category"])
            if filters.get("search"):
                qs = qs.filter(
                    Q(part_number__icontains=filters["search"]) |
                    Q(name__icontains=filters["search"])
                )
        return list(qs)

    def get_spare_part(self, part_id: int) -> SparePart | None:
        return SparePart.objects.filter(id=part_id).first()

    def low_stock_parts(self) -> list[SparePart]:
        """Return active parts where quantity_on_hand <= min_quantity."""
        return list(SparePart.objects.filter(
            status=SPARE_PART_STATUS_ACTIVE,
            quantity_on_hand__lte=F("min_quantity"),
        ))

    def _get(self, part_id: int) -> SparePart:
        part = SparePart.objects.filter(id=part_id).first()
        if not part:
            raise SparePartNotFoundError(f"SparePart {part_id} not found")
        return part


# ──────────────────────────────────────────────
#  MaintenanceDashboardService
# ──────────────────────────────────────────────

class MaintenanceDashboardService:
    def get_summary(self) -> dict:
        today = date.today()
        week_end = today + timedelta(days=7)

        open_wos = MaintenanceWorkOrder.objects.filter(
            status__in=[WORK_ORDER_STATUS_OPEN, WORK_ORDER_STATUS_ASSIGNED,
                        WORK_ORDER_STATUS_IN_PROGRESS,
                        WORK_ORDER_STATUS_WAITING_PARTS,
                        WORK_ORDER_STATUS_WAITING_APPROVAL]
        ).count()

        overdue_wos = MaintenanceWorkOrder.objects.filter(
            status__in=WORK_ORDER_ACTIVE_STATUSES,
            due_date__lt=today,
        ).count()

        active_breakdowns = Breakdown.objects.filter(
            status__in=[BREAKDOWN_STATUS_REPORTED, BREAKDOWN_STATUS_UNDER_REPAIR]
        ).count()

        pm_due_this_week = PreventiveMaintenancePlan.objects.filter(
            status=PM_STATUS_ACTIVE,
            next_due_date__gte=today,
            next_due_date__lte=week_end,
        ).count()

        completed_wos = MaintenanceWorkOrder.objects.filter(
            status=WORK_ORDER_STATUS_COMPLETED,
        ).count()

        total_downtime = MaintenanceWorkOrder.objects.filter(
            downtime_minutes__isnull=False,
        ).aggregate(total=Sum("downtime_minutes"))["total"] or 0

        low_stock = SparePart.objects.filter(
            status=SPARE_PART_STATUS_ACTIVE,
            quantity_on_hand__lte=F("min_quantity"),
        ).count()

        return {
            "open_work_orders": open_wos,
            "overdue_work_orders": overdue_wos,
            "active_breakdowns": active_breakdowns,
            "pm_due_this_week": pm_due_this_week,
            "completed_work_orders": completed_wos,
            "total_downtime_minutes": total_downtime,
            "low_stock_spare_parts": low_stock,
            "last_updated": timezone.now().isoformat(),
        }
