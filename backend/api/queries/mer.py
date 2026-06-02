import strawberry
from typing import Optional

from api.types.mer import (
    MERNode, MERSummary, MERTypeCount, MERPriorityCount,
)
from improvement.services.application.mer_service import MERService


@strawberry.type
class MERQuery:
    @strawberry.field
    def manufacturing_engineering_requests(
        self,
        status: Optional[str] = None,
        request_type: Optional[str] = None,
        target_type: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
    ) -> list[MERNode]:
        filters = {}
        if status: filters["status"] = status
        if request_type: filters["request_type"] = request_type
        if target_type: filters["target_type"] = target_type
        if priority: filters["priority"] = priority
        if search: filters["search"] = search
        svc = MERService()
        return [MERNode.from_db(m) for m in svc.list_mers(filters)]

    @strawberry.field
    def manufacturing_engineering_request(self, id: int) -> Optional[MERNode]:
        m = MERService().get_mer(id)
        return MERNode.from_db(m) if m else None

    @strawberry.field
    def mer_summary(self) -> MERSummary:
        svc = MERService()
        s = svc.get_summary()
        return MERSummary(
            total=s["total"],
            submitted=s["submitted"],
            under_review=s["under_review"],
            approved=s["approved"],
            in_progress=s["in_progress"],
            completed=s["completed"],
            rejected=s["rejected"],
            cancelled=s["cancelled"],
            overdue=s["overdue"],
            by_type=[MERTypeCount(request_type=t["request_type"], count=t["count"]) for t in s["by_type"]],
            by_priority=[MERPriorityCount(priority=p["priority"], count=p["count"]) for p in s["by_priority"]],
        )
