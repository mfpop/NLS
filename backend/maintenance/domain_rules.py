"""Domain rules for maintenance lifecycle transitions."""

from maintenance.constants import (
    WORK_ORDER_STATUS_DRAFT,
    WORK_ORDER_STATUS_OPEN,
    WORK_ORDER_STATUS_ASSIGNED,
    WORK_ORDER_STATUS_IN_PROGRESS,
    WORK_ORDER_STATUS_WAITING_PARTS,
    WORK_ORDER_STATUS_WAITING_APPROVAL,
    WORK_ORDER_STATUS_COMPLETED,
    WORK_ORDER_STATUS_CANCELLED,
    WORK_ORDER_STATUS_ARCHIVED,
    PM_STATUS_ACTIVE,
    PM_STATUS_PAUSED,
    PM_STATUS_ARCHIVED,
    BREAKDOWN_STATUS_REPORTED,
    BREAKDOWN_STATUS_UNDER_REPAIR,
    BREAKDOWN_STATUS_REPAIRED,
    BREAKDOWN_STATUS_CLOSED,
    BREAKDOWN_STATUS_CANCELLED,
)


# ── Work Order transitions ──

def can_submit_work_order(current_status: str) -> bool:
    """DRAFT → OPEN"""
    return current_status == WORK_ORDER_STATUS_DRAFT


def can_assign_work_order(current_status: str) -> bool:
    """OPEN → ASSIGNED"""
    return current_status == WORK_ORDER_STATUS_OPEN


def can_start_work_order(current_status: str) -> bool:
    """ASSIGNED → IN_PROGRESS"""
    return current_status == WORK_ORDER_STATUS_ASSIGNED


def can_hold_for_parts(current_status: str) -> bool:
    """IN_PROGRESS → WAITING_PARTS"""
    return current_status == WORK_ORDER_STATUS_IN_PROGRESS


def can_resume_from_parts(current_status: str) -> bool:
    """WAITING_PARTS → IN_PROGRESS"""
    return current_status == WORK_ORDER_STATUS_WAITING_PARTS


def can_submit_for_approval(current_status: str) -> bool:
    """IN_PROGRESS → WAITING_APPROVAL"""
    return current_status == WORK_ORDER_STATUS_IN_PROGRESS


def can_approve(current_status: str) -> bool:
    """WAITING_APPROVAL → COMPLETED"""
    return current_status == WORK_ORDER_STATUS_WAITING_APPROVAL


def can_complete_work_order(current_status: str) -> bool:
    """IN_PROGRESS → COMPLETED (direct complete without approval)"""
    return current_status == WORK_ORDER_STATUS_IN_PROGRESS


def can_cancel_work_order(current_status: str) -> bool:
    return current_status in (
        WORK_ORDER_STATUS_DRAFT,
        WORK_ORDER_STATUS_OPEN,
        WORK_ORDER_STATUS_ASSIGNED,
        WORK_ORDER_STATUS_IN_PROGRESS,
        WORK_ORDER_STATUS_WAITING_PARTS,
        WORK_ORDER_STATUS_WAITING_APPROVAL,
    )


def can_archive_work_order(current_status: str) -> bool:
    return current_status in (
        WORK_ORDER_STATUS_COMPLETED,
        WORK_ORDER_STATUS_CANCELLED,
    )


# ── PM transitions ──

def can_pause_pm(current_status: str) -> bool:
    return current_status == PM_STATUS_ACTIVE


def can_activate_pm(current_status: str) -> bool:
    return current_status in (PM_STATUS_PAUSED, PM_STATUS_ARCHIVED)


def can_archive_pm(current_status: str) -> bool:
    return current_status in (PM_STATUS_ACTIVE, PM_STATUS_PAUSED)


# ── Breakdown transitions ──

def can_start_breakdown_repair(current_status: str) -> bool:
    return current_status == BREAKDOWN_STATUS_REPORTED


def can_complete_breakdown_repair(current_status: str) -> bool:
    return current_status == BREAKDOWN_STATUS_UNDER_REPAIR


def can_close_breakdown(current_status: str) -> bool:
    return current_status == BREAKDOWN_STATUS_REPAIRED


def can_cancel_breakdown(current_status: str) -> bool:
    return current_status in (
        BREAKDOWN_STATUS_REPORTED,
        BREAKDOWN_STATUS_UNDER_REPAIR,
    )
