"""Application service for A3/PDCA operations."""

from improvement.models import A3PDCA, A3PDCAAction
from improvement.repositories import A3PDCARepository, A3PDCAActionRepository
from improvement.validators import validate_non_empty, validate_target_type
from improvement.constants import (
    A3_PHASE_PLAN, A3_PHASE_DO, A3_PHASE_CHECK, A3_PHASE_ACT,
    A3_STATUS_COMPLETED, A3_STATUS_CANCELLED,
    A3_ACTION_STATUS_IN_PROGRESS, A3_ACTION_STATUS_DONE, A3_ACTION_STATUS_CANCELLED,
)
from improvement.exceptions import (
    A3PDCANotFoundError, A3PDCAActionNotFoundError, InvalidStatusTransitionError,
)
from datetime import date

_PHASE_FLOW = ["DRAFT", "PLAN", "DO", "CHECK", "ACT"]


class A3PDCAService:
    def __init__(self):
        self.repo = A3PDCARepository()
        self.action_repo = A3PDCAActionRepository()

    def create_a3_pdca(self, **kwargs) -> A3PDCA:
        validate_non_empty(kwargs.get("title", ""), "title")
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        a3 = A3PDCA(**kwargs)
        return self.repo.save(a3)

    def update_a3_pdca(self, a3_id: int, **kwargs) -> A3PDCA:
        a3 = self._get(a3_id)
        if kwargs.get("target_type"):
            validate_target_type(kwargs["target_type"])
        for key, value in kwargs.items():
            setattr(a3, key, value)
        return self.repo.save(a3)

    def _transition_to(self, a3_id: int, target_status: str) -> A3PDCA:
        a3 = self._get(a3_id)
        if a3.status in (A3_STATUS_COMPLETED, A3_STATUS_CANCELLED):
            raise InvalidStatusTransitionError(
                f"Cannot transition A3/PDCA in status '{a3.status}'"
            )
        if target_status not in _PHASE_FLOW and target_status not in (A3_STATUS_COMPLETED, A3_STATUS_CANCELLED):
            raise InvalidStatusTransitionError(f"Invalid target status '{target_status}'")
        a3.status = target_status
        if target_status == A3_STATUS_COMPLETED:
            a3.completed_date = date.today()
        return self.repo.save(a3)

    def move_to_plan(self, a3_id: int) -> A3PDCA:
        return self._transition_to(a3_id, A3_PHASE_PLAN)

    def move_to_do(self, a3_id: int) -> A3PDCA:
        return self._transition_to(a3_id, A3_PHASE_DO)

    def move_to_check(self, a3_id: int) -> A3PDCA:
        return self._transition_to(a3_id, A3_PHASE_CHECK)

    def move_to_act(self, a3_id: int) -> A3PDCA:
        return self._transition_to(a3_id, A3_PHASE_ACT)

    def complete_a3_pdca(self, a3_id: int) -> A3PDCA:
        return self._transition_to(a3_id, A3_STATUS_COMPLETED)

    def cancel_a3_pdca(self, a3_id: int) -> A3PDCA:
        return self._transition_to(a3_id, A3_STATUS_CANCELLED)

    def add_a3_action(self, a3_id: int, **kwargs) -> A3PDCAAction:
        a3 = self._get(a3_id)
        action = A3PDCAAction(a3_pdca=a3, **kwargs)
        return self.action_repo.save(action)

    def update_a3_action(self, action_id: int, **kwargs) -> A3PDCAAction:
        action = self.action_repo.get_by_id(action_id)
        if not action:
            raise A3PDCAActionNotFoundError(f"A3PDCAAction {action_id} not found")
        for key, value in kwargs.items():
            setattr(action, key, value)
        return self.action_repo.save(action)

    def complete_a3_action(self, action_id: int) -> A3PDCAAction:
        action = self.action_repo.get_by_id(action_id)
        if not action:
            raise A3PDCAActionNotFoundError(f"A3PDCAAction {action_id} not found")
        action.status = A3_ACTION_STATUS_DONE
        return self.action_repo.save(action)

    def cancel_a3_action(self, action_id: int) -> A3PDCAAction:
        action = self.action_repo.get_by_id(action_id)
        if not action:
            raise A3PDCAActionNotFoundError(f"A3PDCAAction {action_id} not found")
        action.status = A3_ACTION_STATUS_CANCELLED
        return self.action_repo.save(action)

    def list_a3_pdca(self, filters: dict | None = None) -> list[A3PDCA]:
        return self.repo.list_all(filters)

    def get_a3_pdca(self, a3_id: int) -> A3PDCA | None:
        return self.repo.get_by_id(a3_id)

    def _get(self, a3_id: int) -> A3PDCA:
        a3 = self.repo.get_by_id(a3_id)
        if not a3:
            raise A3PDCANotFoundError(f"A3/PDCA {a3_id} not found")
        return a3
