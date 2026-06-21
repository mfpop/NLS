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
    EVENT_STATUS_DRAFT,
    EVENT_STATUS_REPORTED,
    EVENT_STATUS_UNDER_REVIEW,
    EVENT_STATUS_ACTION_REQUIRED,
    EVENT_STATUS_CLOSED,
    EVENT_STATUS_CANCELLED,
    INCIDENT_STATUS_OPEN,
    INCIDENT_STATUS_CONTAINED,
    INCIDENT_STATUS_UNDER_REVIEW,
    INCIDENT_STATUS_CLOSED,
    MATERIAL_ISSUE_STATUS_OPEN,
    MATERIAL_ISSUE_STATUS_CONTAINED,
    MATERIAL_ISSUE_STATUS_RESOLVED,
    MATERIAL_ISSUE_STATUS_CLOSED,
    CLAIM_STATUS_DRAFT,
    CLAIM_STATUS_OPEN,
    CLAIM_STATUS_UNDER_REVIEW,
    CLAIM_STATUS_WAITING_INFO,
    CLAIM_STATUS_CLOSED,
    CLAIM_STATUS_CANCELLED,
    MEDICAL_STATUS_DRAFT,
    MEDICAL_STATUS_OPEN,
    MEDICAL_STATUS_MONITORING,
    MEDICAL_STATUS_RETURNED_TO_WORK,
    MEDICAL_STATUS_CLOSED,
    MEDICAL_STATUS_CANCELLED,
    ENV_REPORT_STATUS_DRAFT,
    ENV_REPORT_STATUS_REPORTED,
    ENV_REPORT_STATUS_UNDER_REVIEW,
    ENV_REPORT_STATUS_ACTION_REQUIRED,
    ENV_REPORT_STATUS_CLOSED,
    ENV_REPORT_STATUS_CANCELLED,
    CAPA_STATUS_DRAFT,
    CAPA_STATUS_OPEN,
    CAPA_STATUS_IN_PROGRESS,
    CAPA_STATUS_PENDING_EFFECTIVENESS,
    CAPA_STATUS_EFFECTIVE,
    CAPA_STATUS_INEFFECTIVE,
    CAPA_STATUS_CLOSED,
    CAPA_STATUS_CANCELLED,
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


# ── Safety Event transitions ──

def can_report_event(current_status: str) -> bool:
    return current_status == EVENT_STATUS_DRAFT

def can_review_event(current_status: str) -> bool:
    return current_status == EVENT_STATUS_REPORTED

def can_require_action_event(current_status: str) -> bool:
    return current_status == EVENT_STATUS_UNDER_REVIEW

def can_close_event(current_status: str) -> bool:
    return current_status in (EVENT_STATUS_UNDER_REVIEW, EVENT_STATUS_ACTION_REQUIRED)

def can_cancel_event(current_status: str) -> bool:
    return current_status in (EVENT_STATUS_DRAFT, EVENT_STATUS_REPORTED, EVENT_STATUS_UNDER_REVIEW)

# ── Safety Incident transitions (legacy) ──

def can_contain_safety_incident(current_status: str) -> bool:
    return current_status == INCIDENT_STATUS_OPEN


def can_review_safety_incident(current_status: str) -> bool:
    return current_status == INCIDENT_STATUS_CONTAINED


def can_close_safety_incident(current_status: str) -> bool:
    return current_status == INCIDENT_STATUS_UNDER_REVIEW


def can_cancel_safety_incident(current_status: str) -> bool:
    return current_status in (INCIDENT_STATUS_OPEN, INCIDENT_STATUS_CONTAINED, INCIDENT_STATUS_UNDER_REVIEW)


# ── Safety Injury Claim transitions ──

def can_open_claim(current_status: str) -> bool:
    return current_status == CLAIM_STATUS_DRAFT

def can_review_claim(current_status: str) -> bool:
    return current_status == CLAIM_STATUS_OPEN

def can_wait_info_claim(current_status: str) -> bool:
    return current_status == CLAIM_STATUS_UNDER_REVIEW

def can_close_claim(current_status: str) -> bool:
    return current_status in (CLAIM_STATUS_UNDER_REVIEW, CLAIM_STATUS_WAITING_INFO)

def can_cancel_claim(current_status: str) -> bool:
    return current_status in (CLAIM_STATUS_DRAFT, CLAIM_STATUS_OPEN, CLAIM_STATUS_UNDER_REVIEW, CLAIM_STATUS_WAITING_INFO)

# ── Safety Medical Case transitions ──

def can_open_medical(current_status: str) -> bool:
    return current_status == MEDICAL_STATUS_DRAFT

def can_monitor_medical(current_status: str) -> bool:
    return current_status == MEDICAL_STATUS_OPEN

def can_return_to_work(current_status: str) -> bool:
    return current_status == MEDICAL_STATUS_MONITORING

def can_close_medical(current_status: str) -> bool:
    return current_status in (MEDICAL_STATUS_MONITORING, MEDICAL_STATUS_RETURNED_TO_WORK)

def can_cancel_medical(current_status: str) -> bool:
    return current_status in (MEDICAL_STATUS_DRAFT, MEDICAL_STATUS_OPEN, MEDICAL_STATUS_MONITORING)

# ── Safety Environmental Report transitions ──

def can_report_env_report(current_status: str) -> bool:
    return current_status == ENV_REPORT_STATUS_DRAFT

def can_review_env_report(current_status: str) -> bool:
    return current_status == ENV_REPORT_STATUS_REPORTED

def can_require_action_env_report(current_status: str) -> bool:
    return current_status == ENV_REPORT_STATUS_UNDER_REVIEW

def can_close_env_report(current_status: str) -> bool:
    return current_status in (ENV_REPORT_STATUS_UNDER_REVIEW, ENV_REPORT_STATUS_ACTION_REQUIRED)

def can_cancel_env_report(current_status: str) -> bool:
    return current_status in (ENV_REPORT_STATUS_DRAFT, ENV_REPORT_STATUS_REPORTED, ENV_REPORT_STATUS_UNDER_REVIEW)

# ── Safety CAPA transitions ──

def can_open_capa(current_status: str) -> bool:
    return current_status == CAPA_STATUS_DRAFT

def can_start_capa(current_status: str) -> bool:
    return current_status == CAPA_STATUS_OPEN

def can_pending_effectiveness_capa(current_status: str) -> bool:
    return current_status == CAPA_STATUS_IN_PROGRESS

def can_complete_effectiveness_capa(current_status: str) -> bool:
    return current_status == CAPA_STATUS_PENDING_EFFECTIVENESS

def can_close_effective_capa(current_status: str) -> bool:
    return current_status == CAPA_STATUS_EFFECTIVE

def can_reopen_capa(current_status: str) -> bool:
    return current_status == CAPA_STATUS_INEFFECTIVE

def can_close_capa(current_status: str) -> bool:
    return current_status in (CAPA_STATUS_EFFECTIVE, CAPA_STATUS_INEFFECTIVE)

def can_cancel_capa(current_status: str) -> bool:
    return current_status in (CAPA_STATUS_DRAFT, CAPA_STATUS_OPEN, CAPA_STATUS_IN_PROGRESS, CAPA_STATUS_PENDING_EFFECTIVENESS)

# ── Material Issue transitions ──

def can_contain_material_issue(current_status: str) -> bool:
    return current_status == MATERIAL_ISSUE_STATUS_OPEN


def can_resolve_material_issue(current_status: str) -> bool:
    return current_status == MATERIAL_ISSUE_STATUS_CONTAINED


def can_close_material_issue(current_status: str) -> bool:
    return current_status == MATERIAL_ISSUE_STATUS_RESOLVED


def can_cancel_material_issue(current_status: str) -> bool:
    return current_status in (MATERIAL_ISSUE_STATUS_OPEN, MATERIAL_ISSUE_STATUS_CONTAINED, MATERIAL_ISSUE_STATUS_RESOLVED)
