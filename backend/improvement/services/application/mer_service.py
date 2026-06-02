"""Application service for Manufacturing Engineering Request operations."""

from improvement.models import ManufacturingEngineeringRequest, Kaizen
from improvement.repositories import MERRepository
from improvement.validators import validate_non_empty, validate_target_type
from improvement.services.domain.mer_rules import (
    can_review_mer, can_approve_mer, can_reject_mer,
    can_start_mer, can_complete_mer, can_cancel_mer, can_convert_to_kaizen,
)
from improvement.constants import (
    MER_STATUS_UNDER_REVIEW, MER_STATUS_APPROVED, MER_STATUS_IN_PROGRESS,
    MER_STATUS_COMPLETED, MER_STATUS_REJECTED, MER_STATUS_CANCELLED,
    SOURCE_TYPE_MER, KAIZEN_STATUS_PLANNED,
)
from improvement.exceptions import (
    MERNotFoundError, InvalidStatusTransitionError,
)


class MERService:
    def __init__(self):
        self.repo = MERRepository()

    def create_mer(self, **kwargs) -> ManufacturingEngineeringRequest:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        mer = ManufacturingEngineeringRequest(**kwargs)
        return self.repo.save(mer)

    def update_mer(self, mer_id: int, **kwargs) -> ManufacturingEngineeringRequest:
        mer = self._get(mer_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(mer, key, value)
        return self.repo.save(mer)

    def review_mer(self, mer_id: int) -> ManufacturingEngineeringRequest:
        mer = self._get(mer_id)
        if not can_review_mer(mer.status):
            raise InvalidStatusTransitionError(
                f"Cannot review MER in status '{mer.status}'"
            )
        mer.status = MER_STATUS_UNDER_REVIEW
        return self.repo.save(mer)

    def approve_mer(self, mer_id: int, review_notes: str = "") -> ManufacturingEngineeringRequest:
        mer = self._get(mer_id)
        if not can_approve_mer(mer.status):
            raise InvalidStatusTransitionError(
                f"Cannot approve MER in status '{mer.status}'"
            )
        mer.status = MER_STATUS_APPROVED
        if review_notes:
            mer.review_notes = review_notes
        return self.repo.save(mer)

    def reject_mer(self, mer_id: int, reason: str = "") -> ManufacturingEngineeringRequest:
        mer = self._get(mer_id)
        if not can_reject_mer(mer.status):
            raise InvalidStatusTransitionError(
                f"Cannot reject MER in status '{mer.status}'"
            )
        mer.status = MER_STATUS_REJECTED
        if reason:
            mer.rejection_reason = reason
        return self.repo.save(mer)

    def start_mer(self, mer_id: int) -> ManufacturingEngineeringRequest:
        mer = self._get(mer_id)
        if not can_start_mer(mer.status):
            raise InvalidStatusTransitionError(
                f"Cannot start MER in status '{mer.status}'"
            )
        mer.status = MER_STATUS_IN_PROGRESS
        from datetime import date
        if not mer.start_date:
            mer.start_date = date.today()
        return self.repo.save(mer)

    def complete_mer(self, mer_id: int, result_summary: str = "") -> ManufacturingEngineeringRequest:
        mer = self._get(mer_id)
        if not can_complete_mer(mer.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete MER in status '{mer.status}'"
            )
        mer.status = MER_STATUS_COMPLETED
        from datetime import date
        mer.completed_date = date.today()
        if result_summary:
            mer.result_summary = result_summary
        return self.repo.save(mer)

    def cancel_mer(self, mer_id: int) -> ManufacturingEngineeringRequest:
        mer = self._get(mer_id)
        if not can_cancel_mer(mer.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel MER in status '{mer.status}'"
            )
        mer.status = MER_STATUS_CANCELLED
        return self.repo.save(mer)

    def convert_to_kaizen(self, mer_id: int, **kaizen_kwargs) -> Kaizen:
        mer = self._get(mer_id)
        if not can_convert_to_kaizen(mer.status):
            raise InvalidStatusTransitionError(
                f"Cannot convert MER in status '{mer.status}' to Kaizen"
            )
        kaizen_defaults = {
            "title": kaizen_kwargs.get("title", f"Kaizen: {mer.title}"),
            "problem_statement": kaizen_kwargs.get("problem_statement", mer.description),
            "target_type": kaizen_kwargs.get("target_type", mer.target_type),
            "target_id": kaizen_kwargs.get("target_id", mer.target_id),
            "current_condition": kaizen_kwargs.get("current_condition", ""),
            "target_condition": kaizen_kwargs.get("target_condition", ""),
            "owner": kaizen_kwargs.get("owner", mer.assigned_to or mer.submitted_by),
            "source_type": SOURCE_TYPE_MER,
            "priority": kaizen_kwargs.get("priority", mer.priority),
            "source_suggestion": None,
        }
        kaizen = Kaizen(**kaizen_defaults)
        kaizen.save()
        mer.linked_kaizen = kaizen
        self.repo.save(mer)
        return kaizen

    def delete_mer(self, mer_id: int) -> None:
        mer = self._get(mer_id)
        self.repo.delete(mer)

    def list_mers(self, filters: dict | None = None) -> list[ManufacturingEngineeringRequest]:
        return self.repo.list_all(filters)

    def get_mer(self, mer_id: int) -> ManufacturingEngineeringRequest | None:
        return self.repo.get_by_id(mer_id)

    def get_summary(self) -> dict:
        return self.repo.get_summary()

    def _get(self, mer_id: int) -> ManufacturingEngineeringRequest:
        mer = self.repo.get_by_id(mer_id)
        if not mer:
            raise MERNotFoundError(f"MER {mer_id} not found")
        return mer
