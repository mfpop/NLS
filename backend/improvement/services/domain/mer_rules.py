"""Domain rules for Manufacturing Engineering Request lifecycle transitions."""

from improvement.constants import (
    MER_STATUS_SUBMITTED,
    MER_STATUS_UNDER_REVIEW,
    MER_STATUS_APPROVED,
    MER_STATUS_IN_PROGRESS,
    MER_STATUS_COMPLETED,
    MER_STATUS_REJECTED,
    MER_STATUS_CANCELLED,
)


def can_review_mer(current_status: str) -> bool:
    return current_status in (MER_STATUS_SUBMITTED,)


def can_approve_mer(current_status: str) -> bool:
    return current_status in (MER_STATUS_SUBMITTED, MER_STATUS_UNDER_REVIEW)


def can_reject_mer(current_status: str) -> bool:
    return current_status in (MER_STATUS_SUBMITTED, MER_STATUS_UNDER_REVIEW)


def can_start_mer(current_status: str) -> bool:
    return current_status == MER_STATUS_APPROVED


def can_complete_mer(current_status: str) -> bool:
    return current_status == MER_STATUS_IN_PROGRESS


def can_cancel_mer(current_status: str) -> bool:
    return current_status in (
        MER_STATUS_SUBMITTED,
        MER_STATUS_UNDER_REVIEW,
        MER_STATUS_APPROVED,
        MER_STATUS_IN_PROGRESS,
    )


def can_convert_to_kaizen(current_status: str) -> bool:
    return current_status in (MER_STATUS_APPROVED, MER_STATUS_COMPLETED)
