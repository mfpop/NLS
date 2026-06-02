"""Application service for Suggestion operations."""

from improvement.models import Suggestion
from improvement.repositories import SuggestionRepository
from improvement.validators import validate_non_empty, validate_target_type
from improvement.services.domain.suggestion_rules import (
    can_review_suggestion,
    can_accept_suggestion,
    can_reject_suggestion,
    can_convert_to_kaizen,
)
from improvement.constants import (
    SUGGESTION_STATUS_UNDER_REVIEW,
    SUGGESTION_STATUS_ACCEPTED,
    SUGGESTION_STATUS_REJECTED,
    SUGGESTION_STATUS_CONVERTED_TO_KAIZEN,
)
from improvement.exceptions import (
    SuggestionNotFoundError,
    InvalidStatusTransitionError,
)


class SuggestionService:
    def __init__(self):
        self.repo = SuggestionRepository()

    def create_suggestion(self, **kwargs) -> Suggestion:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        suggestion = Suggestion(**kwargs)
        return self.repo.save(suggestion)

    def update_suggestion(self, suggestion_id: int, **kwargs) -> Suggestion:
        suggestion = self.repo.get_by_id(suggestion_id)
        if not suggestion:
            raise SuggestionNotFoundError(f"Suggestion {suggestion_id} not found")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(suggestion, key, value)
        return self.repo.save(suggestion)

    def review_suggestion(self, suggestion_id: int) -> Suggestion:
        suggestion = self._get(suggestion_id)
        if not can_review_suggestion(suggestion.status):
            raise InvalidStatusTransitionError(
                f"Cannot review suggestion in status '{suggestion.status}'"
            )
        suggestion.status = SUGGESTION_STATUS_UNDER_REVIEW
        return self.repo.save(suggestion)

    def accept_suggestion(self, suggestion_id: int, decision: str = "") -> Suggestion:
        suggestion = self._get(suggestion_id)
        if not can_accept_suggestion(suggestion.status):
            raise InvalidStatusTransitionError(
                f"Cannot accept suggestion in status '{suggestion.status}'"
            )
        suggestion.status = SUGGESTION_STATUS_ACCEPTED
        if decision:
            suggestion.decision = decision
        return self.repo.save(suggestion)

    def reject_suggestion(self, suggestion_id: int, decision: str = "") -> Suggestion:
        suggestion = self._get(suggestion_id)
        if not can_reject_suggestion(suggestion.status):
            raise InvalidStatusTransitionError(
                f"Cannot reject suggestion in status '{suggestion.status}'"
            )
        suggestion.status = SUGGESTION_STATUS_REJECTED
        if decision:
            suggestion.decision = decision
        return self.repo.save(suggestion)

    def convert_suggestion_to_kaizen(self, suggestion_id: int) -> Suggestion:
        suggestion = self._get(suggestion_id)
        if not can_convert_to_kaizen(suggestion.status):
            raise InvalidStatusTransitionError(
                f"Cannot convert suggestion in status '{suggestion.status}' to Kaizen"
            )
        suggestion.status = SUGGESTION_STATUS_CONVERTED_TO_KAIZEN
        return self.repo.save(suggestion)

    def delete_suggestion(self, suggestion_id: int) -> None:
        suggestion = self._get(suggestion_id)
        self.repo.delete(suggestion)

    def list_suggestions(self, filters: dict | None = None) -> list[Suggestion]:
        return self.repo.list_all(filters)

    def get_suggestion(self, suggestion_id: int) -> Suggestion | None:
        return self.repo.get_by_id(suggestion_id)

    def _get(self, suggestion_id: int) -> Suggestion:
        suggestion = self.repo.get_by_id(suggestion_id)
        if not suggestion:
            raise SuggestionNotFoundError(f"Suggestion {suggestion_id} not found")
        return suggestion
