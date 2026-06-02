"""Selectors for improvement domain — read-only data retrieval."""

from improvement.constants import (
    SUGGESTION_STATUS_ACCEPTED, SUGGESTION_STATUS_REJECTED, SUGGESTION_STATUS_CONVERTED_TO_KAIZEN,
    KAIZEN_STATUS_IN_PROGRESS, KAIZEN_STATUS_COMPLETED,
    A3_STATUS_COMPLETED,
)
from improvement.repositories import (
    SuggestionRepository, KaizenRepository, A3PDCARepository,
)
from datetime import date


class ImprovementSelector:
    def __init__(self):
        self.suggestion_repo = SuggestionRepository()
        self.kaizen_repo = KaizenRepository()
        self.a3_repo = A3PDCARepository()

    def get_summary(self, filters: dict | None = None) -> dict:
        suggestions = self.suggestion_repo.list_all(filters)
        kaizens = self.kaizen_repo.list_all(filters)
        a3s = self.a3_repo.list_all(filters)
        today = date.today()

        return {
            "total_suggestions": len(suggestions),
            "accepted_suggestions": sum(1 for s in suggestions if s.status == SUGGESTION_STATUS_ACCEPTED),
            "rejected_suggestions": sum(1 for s in suggestions if s.status == SUGGESTION_STATUS_REJECTED),
            "converted_suggestions": sum(1 for s in suggestions if s.status == SUGGESTION_STATUS_CONVERTED_TO_KAIZEN),
            "active_kaizen_count": sum(1 for k in kaizens if k.status == KAIZEN_STATUS_IN_PROGRESS),
            "completed_kaizen_count": sum(1 for k in kaizens if k.status == KAIZEN_STATUS_COMPLETED),
            "overdue_kaizen_count": sum(1 for k in kaizens if k.due_date and k.due_date < today and k.status not in (KAIZEN_STATUS_COMPLETED,)),
            "active_a3_count": sum(1 for a in a3s if a.status not in (A3_STATUS_COMPLETED,)),
            "completed_a3_count": sum(1 for a in a3s if a.status == A3_STATUS_COMPLETED),
            "overdue_a3_count": sum(1 for a in a3s if a.due_date and a.due_date < today and a.status not in (A3_STATUS_COMPLETED,)),
        }

    def get_improvements_by_status(self) -> list[dict]:
        data: dict[str, int] = {}
        for s in self.suggestion_repo.list_all():
            data[s.status] = data.get(s.status, 0) + 1
        for k in self.kaizen_repo.list_all():
            data[k.status] = data.get(k.status, 0) + 1
        for a in self.a3_repo.list_all():
            data[a.status] = data.get(a.status, 0) + 1
        return [{"status": k, "count": v} for k, v in sorted(data.items())]

    def get_improvements_by_target(self) -> list[dict]:
        data: dict[str, int] = {}
        for s in self.suggestion_repo.list_all():
            if s.target_type: data[s.target_type] = data.get(s.target_type, 0) + 1
        for k in self.kaizen_repo.list_all():
            if k.target_type: data[k.target_type] = data.get(k.target_type, 0) + 1
        for a in self.a3_repo.list_all():
            if a.target_type: data[a.target_type] = data.get(a.target_type, 0) + 1
        return [{"target_type": k, "count": v} for k, v in sorted(data.items())]

    def get_suggestions_summary(self, filters: dict | None = None) -> dict:
        suggestions = self.suggestion_repo.list_all(filters)
        return {
            "total": len(suggestions),
            "by_status": {s: sum(1 for x in suggestions if x.status == s) for s in set(x.status for x in suggestions)},
        }

    def get_kaizen_summary(self, filters: dict | None = None) -> dict:
        kaizens = self.kaizen_repo.list_all(filters)
        return {
            "total": len(kaizens),
            "by_status": {s: sum(1 for x in kaizens if x.status == s) for s in set(x.status for x in kaizens)},
        }

    def get_a3_pdca_summary(self, filters: dict | None = None) -> dict:
        a3s = self.a3_repo.list_all(filters)
        return {
            "total": len(a3s),
            "by_phase": {s: sum(1 for x in a3s if x.status == s) for s in set(x.status for x in a3s)},
        }
