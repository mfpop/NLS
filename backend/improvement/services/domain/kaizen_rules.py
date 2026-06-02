"""Domain rules for kaizen lifecycle transitions."""

from improvement.constants import (
    KAIZEN_STATUS_PLANNED,
    KAIZEN_STATUS_IN_PROGRESS,
    KAIZEN_STATUS_COMPLETED,
    KAIZEN_STATUS_CANCELLED,
)


def can_start_kaizen(current_status: str) -> bool:
    return current_status == KAIZEN_STATUS_PLANNED


def can_complete_kaizen(current_status: str) -> bool:
    return current_status == KAIZEN_STATUS_IN_PROGRESS


def can_cancel_kaizen(current_status: str) -> bool:
    return current_status in (KAIZEN_STATUS_PLANNED, KAIZEN_STATUS_IN_PROGRESS)
