"""Application service for Kaizen and KaizenAction operations."""

from improvement.models import Kaizen, KaizenAction
from improvement.repositories import KaizenRepository, KaizenActionRepository
from improvement.validators import validate_non_empty, validate_target_type
from improvement.services.domain.kaizen_rules import (
    can_start_kaizen, can_complete_kaizen, can_cancel_kaizen,
)
from improvement.constants import (
    KAIZEN_STATUS_IN_PROGRESS, KAIZEN_STATUS_COMPLETED, KAIZEN_STATUS_CANCELLED,
    KAIZEN_ACTION_STATUS_DONE, KAIZEN_ACTION_STATUS_CANCELLED,
    SOURCE_TYPE_MANUAL,
)
from improvement.exceptions import (
    KaizenNotFoundError, KaizenActionNotFoundError, InvalidStatusTransitionError,
)
from datetime import date


class KaizenService:
    def __init__(self):
        self.repo = KaizenRepository()
        self.action_repo = KaizenActionRepository()

    def create_kaizen(self, **kwargs) -> Kaizen:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        kwargs.setdefault("source_type", SOURCE_TYPE_MANUAL)
        kaizen = Kaizen(**kwargs)
        return self.repo.save(kaizen)

    def update_kaizen(self, kaizen_id: int, **kwargs) -> Kaizen:
        kaizen = self._get(kaizen_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(kaizen, key, value)
        return self.repo.save(kaizen)

    def start_kaizen(self, kaizen_id: int) -> Kaizen:
        kaizen = self._get(kaizen_id)
        if not can_start_kaizen(kaizen.status):
            raise InvalidStatusTransitionError(
                f"Cannot start kaizen in status '{kaizen.status}'"
            )
        kaizen.status = KAIZEN_STATUS_IN_PROGRESS
        return self.repo.save(kaizen)

    def complete_kaizen(self, kaizen_id: int, result_summary: str = "") -> Kaizen:
        kaizen = self._get(kaizen_id)
        if not can_complete_kaizen(kaizen.status):
            raise InvalidStatusTransitionError(
                f"Cannot complete kaizen in status '{kaizen.status}'"
            )
        kaizen.status = KAIZEN_STATUS_COMPLETED
        kaizen.completed_date = date.today()
        if result_summary:
            kaizen.result_summary = result_summary
        return self.repo.save(kaizen)

    def cancel_kaizen(self, kaizen_id: int) -> Kaizen:
        kaizen = self._get(kaizen_id)
        if not can_cancel_kaizen(kaizen.status):
            raise InvalidStatusTransitionError(
                f"Cannot cancel kaizen in status '{kaizen.status}'"
            )
        kaizen.status = KAIZEN_STATUS_CANCELLED
        return self.repo.save(kaizen)

    def add_kaizen_action(self, kaizen_id: int, **kwargs) -> KaizenAction:
        kaizen = self._get(kaizen_id)
        validate_non_empty(kwargs.get("title", ""), "title")
        action = KaizenAction(kaizen=kaizen, **kwargs)
        return self.action_repo.save(action)

    def update_kaizen_action(self, action_id: int, **kwargs) -> KaizenAction:
        action = self._get_action(action_id)
        if kwargs.get("title"):
            validate_non_empty(kwargs["title"], "title")
        for key, value in kwargs.items():
            setattr(action, key, value)
        return self.action_repo.save(action)

    def complete_kaizen_action(self, action_id: int) -> KaizenAction:
        action = self._get_action(action_id)
        action.status = KAIZEN_ACTION_STATUS_DONE
        return self.action_repo.save(action)

    def cancel_kaizen_action(self, action_id: int) -> KaizenAction:
        action = self._get_action(action_id)
        action.status = KAIZEN_ACTION_STATUS_CANCELLED
        return self.action_repo.save(action)

    def delete_kaizen(self, kaizen_id: int) -> None:
        kaizen = self._get(kaizen_id)
        self.repo.delete(kaizen)

    def delete_kaizen_action(self, action_id: int) -> None:
        action = self._get_action(action_id)
        self.action_repo.delete(action)

    def create_a3_from_kaizen(self, kaizen_id: int, **kwargs) -> Kaizen:
        from improvement.models.a3_pdca import A3PDCA
        from improvement.constants import A3_PHASE_DRAFT
        kaizen = self._get(kaizen_id)
        kwargs.setdefault("title", f"A3: {kaizen.title}")
        kwargs.setdefault("source_type", "KAIZEN")
        kwargs.setdefault("source_kaizen", kaizen)
        kwargs.setdefault("target_type", kaizen.target_type)
        kwargs.setdefault("target_id", kaizen.target_id)
        kwargs.setdefault("owner", kaizen.owner)
        kwargs.setdefault("problem_statement", kaizen.problem_statement)
        kwargs.setdefault("current_condition", kaizen.current_condition)
        kwargs.setdefault("target_condition", kaizen.target_condition)
        a3 = A3PDCA(**kwargs)
        a3.save()
        return kaizen

    def list_kaizens(self, filters: dict | None = None) -> list[Kaizen]:
        return self.repo.list_all(filters)

    def get_kaizen(self, kaizen_id: int) -> Kaizen | None:
        return self.repo.get_by_id(kaizen_id)

    def _get(self, kaizen_id: int) -> Kaizen:
        kaizen = self.repo.get_by_id(kaizen_id)
        if not kaizen:
            raise KaizenNotFoundError(f"Kaizen {kaizen_id} not found")
        return kaizen

    def _get_action(self, action_id: int) -> KaizenAction:
        action = self.action_repo.get_by_id(action_id)
        if not action:
            raise KaizenActionNotFoundError(f"KaizenAction {action_id} not found")
        return action
