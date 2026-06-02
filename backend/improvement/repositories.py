"""Repository layer for improvement domain persistence operations."""

from improvement.models import Suggestion, Kaizen, KaizenAction, A3PDCA, A3PDCAAction


class SuggestionRepository:
    def get_by_id(self, suggestion_id: int) -> Suggestion | None:
        return Suggestion.objects.filter(id=suggestion_id).first()

    def list_all(self, filters: dict | None = None) -> list[Suggestion]:
        qs = Suggestion.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("priority"):
                qs = qs.filter(priority=filters["priority"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def save(self, suggestion: Suggestion) -> Suggestion:
        suggestion.save()
        return suggestion

    def delete(self, suggestion: Suggestion) -> None:
        suggestion.delete()


class KaizenRepository:
    def get_by_id(self, kaizen_id: int) -> Kaizen | None:
        return Kaizen.objects.filter(id=kaizen_id).first()

    def list_all(self, filters: dict | None = None) -> list[Kaizen]:
        qs = Kaizen.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def save(self, kaizen: Kaizen) -> Kaizen:
        kaizen.save()
        return kaizen

    def delete(self, kaizen: Kaizen) -> None:
        kaizen.delete()


class KaizenActionRepository:
    def get_by_id(self, action_id: int) -> KaizenAction | None:
        return KaizenAction.objects.filter(id=action_id).first()

    def save(self, action: KaizenAction) -> KaizenAction:
        action.save()
        return action

    def delete(self, action: KaizenAction) -> None:
        action.delete()


class A3PDCARepository:
    def get_by_id(self, a3_id: int) -> A3PDCA | None:
        return A3PDCA.objects.filter(id=a3_id).first()

    def list_all(self, filters: dict | None = None) -> list[A3PDCA]:
        qs = A3PDCA.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def save(self, a3: A3PDCA) -> A3PDCA:
        a3.save()
        return a3


class A3PDCAActionRepository:
    def get_by_id(self, action_id: int) -> A3PDCAAction | None:
        return A3PDCAAction.objects.filter(id=action_id).first()

    def save(self, action: A3PDCAAction) -> A3PDCAAction:
        action.save()
        return action


class MERRepository:
    def get_by_id(self, mer_id: int):
        from improvement.models import ManufacturingEngineeringRequest
        return ManufacturingEngineeringRequest.objects.filter(id=mer_id).first()

    def list_all(self, filters: dict | None = None):
        from improvement.models import ManufacturingEngineeringRequest
        qs = ManufacturingEngineeringRequest.objects.all()
        if filters:
            if filters.get("status"):
                qs = qs.filter(status=filters["status"])
            if filters.get("request_type"):
                qs = qs.filter(request_type=filters["request_type"])
            if filters.get("target_type"):
                qs = qs.filter(target_type=filters["target_type"])
            if filters.get("priority"):
                qs = qs.filter(priority=filters["priority"])
            if filters.get("search"):
                qs = qs.filter(title__icontains=filters["search"])
        return list(qs)

    def save(self, mer):
        mer.save()
        return mer

    def delete(self, mer) -> None:
        mer.delete()

    def get_summary(self) -> dict:
        from improvement.models import ManufacturingEngineeringRequest
        from django.db.models import Count, Q
        from datetime import date
        qs = ManufacturingEngineeringRequest.objects.all()
        overdue_qs = qs.filter(
            due_date__lt=date.today(),
            status__in=["SUBMITTED", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS"],
        )
        return {
            "total": qs.count(),
            "submitted": qs.filter(status="SUBMITTED").count(),
            "under_review": qs.filter(status="UNDER_REVIEW").count(),
            "approved": qs.filter(status="APPROVED").count(),
            "in_progress": qs.filter(status="IN_PROGRESS").count(),
            "completed": qs.filter(status="COMPLETED").count(),
            "rejected": qs.filter(status="REJECTED").count(),
            "cancelled": qs.filter(status="CANCELLED").count(),
            "overdue": overdue_qs.count(),
            "by_type": list(qs.values("request_type").annotate(count=Count("id")).order_by("request_type")),
            "by_priority": list(qs.values("priority").annotate(count=Count("id")).order_by("priority")),
        }
