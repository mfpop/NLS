"""Domain rules for suggestion lifecycle transitions."""

from improvement.constants import (
    SUGGESTION_STATUS_NEW,
    SUGGESTION_STATUS_UNDER_REVIEW,
    SUGGESTION_STATUS_ACCEPTED,
    SUGGESTION_STATUS_REJECTED,
)


def can_review_suggestion(current_status: str) -> bool:
    return current_status == SUGGESTION_STATUS_NEW


def can_accept_suggestion(current_status: str) -> bool:
    return current_status in (SUGGESTION_STATUS_NEW, SUGGESTION_STATUS_UNDER_REVIEW)


def can_reject_suggestion(current_status: str) -> bool:
    return current_status in (SUGGESTION_STATUS_NEW, SUGGESTION_STATUS_UNDER_REVIEW)


def can_convert_to_kaizen(current_status: str) -> bool:
    return current_status in (SUGGESTION_STATUS_ACCEPTED, SUGGESTION_STATUS_UNDER_REVIEW)
