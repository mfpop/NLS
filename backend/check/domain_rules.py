"""Domain rules for check lifecycle transitions."""

from check.constants import (
    PROBLEM_STATUS_OPEN,
    PROBLEM_STATUS_IN_REVIEW,
    PROBLEM_STATUS_IN_PROGRESS,
    PROBLEM_STATUS_CONTAINED,
    PROBLEM_STATUS_RESOLVED,
    PROBLEM_STATUS_CLOSED,
    PROBLEM_STATUS_CANCELLED,
    ACTION_STATUS_OPEN,
    ACTION_STATUS_IN_PROGRESS,
    ACTION_STATUS_DONE,
    CHECK_STATUS_DRAFT,
    CHECK_STATUS_COMPLETED,
    DMR_STATUS_OPEN,
    DMR_STATUS_UNDER_REVIEW,
    DMR_STATUS_QUARANTINED,
    DMR_STATUS_DISPOSITION_PENDING,
    DMR_STATUS_DISPOSITION_APPROVED,
    DMR_STATUS_CLOSED,
    RMA_STATUS_OPEN,
    RMA_STATUS_RECEIVED,
    RMA_STATUS_UNDER_REVIEW,
    RMA_STATUS_DISPOSITION_PENDING,
    RMA_STATUS_CLOSED,
    INCIDENT_STATUS_OPEN,
    INCIDENT_STATUS_CONTAINED,
    INCIDENT_STATUS_UNDER_REVIEW,
    INCIDENT_STATUS_CLOSED,
    MATERIAL_ISSUE_STATUS_OPEN,
    MATERIAL_ISSUE_STATUS_CONTAINED,
    MATERIAL_ISSUE_STATUS_RESOLVED,
    MATERIAL_ISSUE_STATUS_CLOSED,
)


# ── Problem transitions ──

def can_review_problem(current_status: str) -> bool:
    return current_status == PROBLEM_STATUS_OPEN


def can_start_problem(current_status: str) -> bool:
    return current_status == PROBLEM_STATUS_OPEN


def can_contain_problem(current_status: str) -> bool:
    return current_status in (PROBLEM_STATUS_OPEN, PROBLEM_STATUS_IN_REVIEW, PROBLEM_STATUS_IN_PROGRESS)


def can_resolve_problem(current_status: str) -> bool:
    return current_status in (PROBLEM_STATUS_IN_PROGRESS, PROBLEM_STATUS_CONTAINED)


def can_close_problem(current_status: str) -> bool:
    return current_status in (PROBLEM_STATUS_CONTAINED, PROBLEM_STATUS_RESOLVED)


def can_cancel_problem(current_status: str) -> bool:
    return current_status in (PROBLEM_STATUS_OPEN, PROBLEM_STATUS_IN_REVIEW, PROBLEM_STATUS_IN_PROGRESS, PROBLEM_STATUS_CONTAINED)


# ── Action transitions ──

def can_start_action(current_status: str) -> bool:
    return current_status == ACTION_STATUS_OPEN


def can_complete_action(current_status: str) -> bool:
    return current_status == ACTION_STATUS_IN_PROGRESS


def can_cancel_action(current_status: str) -> bool:
    return current_status in (ACTION_STATUS_OPEN, ACTION_STATUS_IN_PROGRESS)


# ── Check completion (shared for Production, Quality, Safety, Material) ──

def can_complete_check(current_status: str) -> bool:
    return current_status == CHECK_STATUS_DRAFT


# ── DMR transitions ──

def can_review_dmr(current_status: str) -> bool:
    return current_status in (DMR_STATUS_OPEN, DMR_STATUS_QUARANTINED)


def can_disposition_dmr(current_status: str) -> bool:
    return current_status in (DMR_STATUS_UNDER_REVIEW, DMR_STATUS_QUARANTINED)


def can_quarantine_dmr(current_status: str) -> bool:
    return current_status in (DMR_STATUS_OPEN, DMR_STATUS_UNDER_REVIEW)


def can_approve_disposition_dmr(current_status: str) -> bool:
    return current_status == DMR_STATUS_DISPOSITION_PENDING


def can_close_dmr(current_status: str) -> bool:
    return current_status == DMR_STATUS_DISPOSITION_APPROVED


def can_cancel_dmr(current_status: str) -> bool:
    return current_status in (DMR_STATUS_OPEN, DMR_STATUS_UNDER_REVIEW, DMR_STATUS_QUARANTINED, DMR_STATUS_DISPOSITION_PENDING)



# ── RMA transitions ──

def can_receive_rma(current_status: str) -> bool:
    return current_status == RMA_STATUS_OPEN


def can_review_rma(current_status: str) -> bool:
    return current_status == RMA_STATUS_RECEIVED


def can_disposition_rma(current_status: str) -> bool:
    return current_status == RMA_STATUS_UNDER_REVIEW


def can_close_rma(current_status: str) -> bool:
    return current_status == RMA_STATUS_DISPOSITION_PENDING


def can_cancel_rma(current_status: str) -> bool:
    return current_status in (RMA_STATUS_OPEN, RMA_STATUS_RECEIVED, RMA_STATUS_UNDER_REVIEW, RMA_STATUS_DISPOSITION_PENDING)


# ── Safety Incident transitions ──

def can_contain_safety_incident(current_status: str) -> bool:
    return current_status == INCIDENT_STATUS_OPEN


def can_review_safety_incident(current_status: str) -> bool:
    return current_status == INCIDENT_STATUS_CONTAINED


def can_close_safety_incident(current_status: str) -> bool:
    return current_status == INCIDENT_STATUS_UNDER_REVIEW


def can_cancel_safety_incident(current_status: str) -> bool:
    return current_status in (INCIDENT_STATUS_OPEN, INCIDENT_STATUS_CONTAINED, INCIDENT_STATUS_UNDER_REVIEW)


# ── Material Issue transitions ──

def can_contain_material_issue(current_status: str) -> bool:
    return current_status == MATERIAL_ISSUE_STATUS_OPEN


def can_resolve_material_issue(current_status: str) -> bool:
    return current_status == MATERIAL_ISSUE_STATUS_CONTAINED


def can_close_material_issue(current_status: str) -> bool:
    return current_status == MATERIAL_ISSUE_STATUS_RESOLVED


def can_cancel_material_issue(current_status: str) -> bool:
    return current_status in (MATERIAL_ISSUE_STATUS_OPEN, MATERIAL_ISSUE_STATUS_CONTAINED, MATERIAL_ISSUE_STATUS_RESOLVED)
