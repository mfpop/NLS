import strawberry
from typing import Optional
from datetime import datetime

from api.permissions import ensure_access
from api.types.mer import MERNode, MERPayload, MERError, MERInput, MERUpdateInput
from improvement.services.application.mer_service import MERService


def _user(info):
    return info.context.user


def _ok(mer=None) -> MERPayload:
    return MERPayload(ok=True, mer=MERNode.from_db(mer) if mer else None)


def _err(message: str, field: str = "_form") -> MERPayload:
    return MERPayload(ok=False, errors=[MERError(field=field, code="ERROR", message=message)])


@strawberry.type
class MERMutation:
    @strawberry.mutation
    def create_mer(self, info: strawberry.types.Info, input: MERInput) -> MERPayload:
        ensure_access(user=_user(info), action="create_mer")
        try:
            svc = MERService()
            kwargs = {
                "title": input.title, "description": input.description,
                "request_type": input.request_type, "category": input.category,
                "priority": input.priority, "target_type": input.target_type,
                "target_id": input.target_id, "submitted_by": input.submitted_by,
                "assigned_to": input.assigned_to, "reviewer": input.reviewer,
                "impact_cost": input.impact_cost, "impact_quality": input.impact_quality,
                "impact_delivery": input.impact_delivery, "impact_safety": input.impact_safety,
            }
            if input.estimated_cost is not None:
                kwargs["estimated_cost"] = input.estimated_cost
            if input.start_date:
                kwargs["start_date"] = datetime.strptime(input.start_date, "%Y-%m-%d").date()
            if input.due_date:
                kwargs["due_date"] = datetime.strptime(input.due_date, "%Y-%m-%d").date()
            m = svc.create_mer(**kwargs)
            return _ok(m)
        except Exception as e:
            return _err(str(e))

    @strawberry.mutation
    def update_mer(self, info: strawberry.types.Info, id: int, input: MERUpdateInput) -> MERPayload:
        ensure_access(user=_user(info), action="update_mer")
        try:
            svc = MERService()
            kwargs = {}
            for field in ("title", "description", "request_type", "category", "priority",
                          "target_type", "target_id", "assigned_to", "reviewer",
                          "impact_cost", "impact_quality", "impact_delivery", "impact_safety",
                          "estimated_cost", "actual_cost", "result_summary", "lessons_learned"):
                val = getattr(input, field)
                if val is not None:
                    kwargs[field] = val
            if input.start_date is not None:
                kwargs["start_date"] = datetime.strptime(input.start_date, "%Y-%m-%d").date() if input.start_date else None
            if input.due_date is not None:
                kwargs["due_date"] = datetime.strptime(input.due_date, "%Y-%m-%d").date() if input.due_date else None
            m = svc.update_mer(id, **kwargs)
            return _ok(m)
        except Exception as e:
            return _err(str(e))

    @strawberry.mutation
    def review_mer(self, info: strawberry.types.Info, id: int) -> MERPayload:
        ensure_access(user=_user(info), action="update_mer")
        try:
            m = MERService().review_mer(id)
            return _ok(m)
        except Exception as e:
            return _err(str(e))

    @strawberry.mutation
    def approve_mer(self, info: strawberry.types.Info, id: int, review_notes: str = "") -> MERPayload:
        ensure_access(user=_user(info), action="approve_mer")
        try:
            m = MERService().approve_mer(id, review_notes)
            return _ok(m)
        except Exception as e:
            return _err(str(e))

    @strawberry.mutation
    def reject_mer(self, info: strawberry.types.Info, id: int, reason: str = "") -> MERPayload:
        ensure_access(user=_user(info), action="reject_mer")
        try:
            m = MERService().reject_mer(id, reason)
            return _ok(m)
        except Exception as e:
            return _err(str(e))

    @strawberry.mutation
    def start_mer(self, info: strawberry.types.Info, id: int) -> MERPayload:
        ensure_access(user=_user(info), action="start_mer")
        try:
            m = MERService().start_mer(id)
            return _ok(m)
        except Exception as e:
            return _err(str(e))

    @strawberry.mutation
    def complete_mer(self, info: strawberry.types.Info, id: int, result_summary: str = "") -> MERPayload:
        ensure_access(user=_user(info), action="complete_mer")
        try:
            m = MERService().complete_mer(id, result_summary)
            return _ok(m)
        except Exception as e:
            return _err(str(e))

    @strawberry.mutation
    def cancel_mer(self, info: strawberry.types.Info, id: int) -> MERPayload:
        ensure_access(user=_user(info), action="cancel_mer")
        try:
            m = MERService().cancel_mer(id)
            return _ok(m)
        except Exception as e:
            return _err(str(e))

    @strawberry.mutation
    def convert_mer_to_kaizen(self, info: strawberry.types.Info, id: int) -> MERPayload:
        ensure_access(user=_user(info), action="convert_mer_to_kaizen")
        try:
            svc = MERService()
            svc.convert_to_kaizen(id)
            m = svc.get_mer(id)
            return _ok(m)
        except Exception as e:
            return _err(str(e))

    @strawberry.mutation
    def delete_mer(self, info: strawberry.types.Info, id: int) -> MERPayload:
        ensure_access(user=_user(info), action="delete_mer")
        try:
            MERService().delete_mer(id)
            return MERPayload(ok=True)
        except Exception as e:
            return _err(str(e))
