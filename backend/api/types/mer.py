from __future__ import annotations
import strawberry
from typing import Optional


@strawberry.type
class MERTypeCount:
    request_type: str
    count: int


@strawberry.type
class MERPriorityCount:
    priority: str
    count: int


@strawberry.type
class MERNode:
    id: int
    mer_code: str
    title: str
    description: str
    request_type: str
    category: str
    priority: str
    target_type: str
    target_id: Optional[int]
    submitted_by: str
    owner: str
    assigned_to: str
    reviewer: str
    status: str
    review_notes: str
    rejection_reason: str
    impact_cost: str
    impact_quality: str
    impact_delivery: str
    impact_safety: str
    estimated_cost: Optional[float]
    actual_cost: Optional[float]
    start_date: Optional[str]
    due_date: Optional[str]
    completed_date: Optional[str]
    linked_kaizen_id: Optional[int]
    linked_a3_id: Optional[int]
    result_summary: str
    lessons_learned: str
    created_at: str
    updated_at: str

    @classmethod
    def from_db(cls, m) -> MERNode:
        return cls(
            id=m.id, mer_code=m.mer_code or "", title=m.title,
            description=m.description, request_type=m.request_type,
            category=m.category, priority=m.priority,
            target_type=m.target_type, target_id=m.target_id,
            submitted_by=m.submitted_by, owner=m.owner,
            assigned_to=m.assigned_to, reviewer=m.reviewer, status=m.status,
            review_notes=m.review_notes, rejection_reason=m.rejection_reason,
            impact_cost=m.impact_cost, impact_quality=m.impact_quality,
            impact_delivery=m.impact_delivery, impact_safety=m.impact_safety,
            estimated_cost=float(m.estimated_cost) if m.estimated_cost else None,
            actual_cost=float(m.actual_cost) if m.actual_cost else None,
            start_date=m.start_date.isoformat() if m.start_date else None,
            due_date=m.due_date.isoformat() if m.due_date else None,
            completed_date=m.completed_date.isoformat() if m.completed_date else None,
            linked_kaizen_id=m.linked_kaizen_id,
            linked_a3_id=m.linked_a3_id,
            result_summary=m.result_summary,
            lessons_learned=m.lessons_learned,
            created_at=m.created_at.isoformat() if m.created_at else "",
            updated_at=m.updated_at.isoformat() if m.updated_at else "",
        )


@strawberry.type
class MERError:
    field: Optional[str]
    code: str
    message: str


@strawberry.type
class MERPayload:
    ok: bool
    mer: Optional[MERNode] = None
    errors: Optional[list[MERError]] = None


@strawberry.type
class MERSummary:
    total: int
    submitted: int
    under_review: int
    approved: int
    in_progress: int
    completed: int
    rejected: int
    cancelled: int
    overdue: int
    by_type: list[MERTypeCount]
    by_priority: list[MERPriorityCount]


@strawberry.input
class MERInput:
    title: str
    description: str = ""
    request_type: str = "ENGINEERING_CHANGE"
    category: str = ""
    priority: str = "MEDIUM"
    target_type: str = ""
    target_id: Optional[int] = None
    submitted_by: str = ""
    owner: str = ""
    assigned_to: str = ""
    reviewer: str = ""
    impact_cost: str = ""
    impact_quality: str = ""
    impact_delivery: str = ""
    impact_safety: str = ""
    estimated_cost: Optional[float] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None


@strawberry.input
class MERUpdateInput:
    title: Optional[str] = None
    description: Optional[str] = None
    request_type: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    owner: Optional[str] = None
    assigned_to: Optional[str] = None
    reviewer: Optional[str] = None
    impact_cost: Optional[str] = None
    impact_quality: Optional[str] = None
    impact_delivery: Optional[str] = None
    impact_safety: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    result_summary: Optional[str] = None
    lessons_learned: Optional[str] = None
