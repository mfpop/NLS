"""Domain rules for Gemba Walk lifecycle transitions."""

from execution.constants import (
    GEMBA_SESSION_PLANNED,
    GEMBA_SESSION_IN_PROGRESS,
    GEMBA_SESSION_COMPLETED,
    GEMBA_SESSION_CANCELLED,
    GEMBA_OBSERVATION_STATUS_OPEN,
    GEMBA_OBSERVATION_STATUS_IN_REVIEW,
    GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED,
    GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ACTION,
    GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ISSUE,
    GEMBA_OBSERVATION_STATUS_RESOLVED,
    GEMBA_OBSERVATION_STATUS_VERIFIED,
    GEMBA_OBSERVATION_STATUS_CLOSED,
    GEMBA_OBSERVATION_STATUS_REOPENED,
    GEMBA_OBSERVATION_STATUS_CANCELLED,
)


# ── Session transitions ──

def can_start_session(current_status: str) -> bool:
    return current_status == GEMBA_SESSION_PLANNED


def can_complete_session(current_status: str) -> bool:
    return current_status == GEMBA_SESSION_IN_PROGRESS


def can_cancel_session(current_status: str) -> bool:
    return current_status in (GEMBA_SESSION_PLANNED, GEMBA_SESSION_IN_PROGRESS)


def can_reopen_session(current_status: str) -> bool:
    return current_status == GEMBA_SESSION_COMPLETED


def can_add_observation_to_session(session_status: str) -> bool:
    return session_status in (GEMBA_SESSION_PLANNED, GEMBA_SESSION_IN_PROGRESS)


# ── Observation transitions ──

def can_review_observation(current_status: str) -> bool:
    return current_status == GEMBA_OBSERVATION_STATUS_OPEN


def can_require_action(current_status: str) -> bool:
    return current_status in (
        GEMBA_OBSERVATION_STATUS_OPEN,
        GEMBA_OBSERVATION_STATUS_IN_REVIEW,
    )


def can_resolve_observation(current_status: str) -> bool:
    return current_status in (
        GEMBA_OBSERVATION_STATUS_OPEN,
        GEMBA_OBSERVATION_STATUS_IN_REVIEW,
        GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED,
    )


def can_verify_observation(current_status: str) -> bool:
    return current_status == GEMBA_OBSERVATION_STATUS_RESOLVED


def can_close_observation(current_status: str) -> bool:
    return current_status in (
        GEMBA_OBSERVATION_STATUS_VERIFIED,
        GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ACTION,
        GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ISSUE,
    )


def can_reopen_observation(current_status: str) -> bool:
    return current_status in (
        GEMBA_OBSERVATION_STATUS_CLOSED,
        GEMBA_OBSERVATION_STATUS_CANCELLED,
        GEMBA_OBSERVATION_STATUS_RESOLVED,
        GEMBA_OBSERVATION_STATUS_VERIFIED,
    )


def can_cancel_observation(current_status: str) -> bool:
    return current_status not in (
        GEMBA_OBSERVATION_STATUS_CLOSED,
        GEMBA_OBSERVATION_STATUS_CANCELLED,
    )


def can_convert_to_issue(current_status: str) -> bool:
    return current_status not in (
        GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ISSUE,
        GEMBA_OBSERVATION_STATUS_CLOSED,
        GEMBA_OBSERVATION_STATUS_CANCELLED,
    )


def can_convert_to_action(current_status: str) -> bool:
    return current_status not in (
        GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ACTION,
        GEMBA_OBSERVATION_STATUS_CLOSED,
        GEMBA_OBSERVATION_STATUS_CANCELLED,
    )


def can_assign_observation(current_status: str) -> bool:
    return current_status not in (
        GEMBA_OBSERVATION_STATUS_CLOSED,
        GEMBA_OBSERVATION_STATUS_CANCELLED,
    )
