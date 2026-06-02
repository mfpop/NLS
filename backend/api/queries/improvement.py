import strawberry
from typing import Optional

from api.types.improvement import (
    SuggestionNode, KaizenDetailNode, KaizenActionNode,
    A3PDCANode, A3PDCAActionNode,
    ContinuousImprovementSummary, ImprovementByTarget, ImprovementByStatus,
)
from improvement.services.application.suggestion_service import SuggestionService
from improvement.services.application.kaizen_service import KaizenService
from improvement.services.application.a3_pdca_service import A3PDCAService
from improvement.services.application.continuous_improvement_service import (
    ContinuousImprovementService,
)


def _to_suggestion_node(s) -> SuggestionNode:
    return SuggestionNode(
        id=s.id, title=s.title, description=s.description,
        submitted_by=s.submitted_by, target_type=s.target_type,
        target_id=s.target_id, category=s.category, priority=s.priority,
        status=s.status, decision=s.decision, comments=s.comments,
        created_at=s.created_at.isoformat() if s.created_at else "",
        updated_at=s.updated_at.isoformat() if s.updated_at else "",
    )


def _to_action_node(a) -> KaizenActionNode:
    return KaizenActionNode(
        id=a.id, kaizen_id=a.kaizen_id, title=a.title,
        description=a.description, owner=a.owner,
        due_date=a.due_date.isoformat() if a.due_date else None,
        status=a.status, notes=a.notes,
        created_at=a.created_at.isoformat() if a.created_at else "",
        updated_at=a.updated_at.isoformat() if a.updated_at else "",
    )


def _to_kaizen_node(k) -> KaizenDetailNode:
    return KaizenDetailNode(
        id=k.id, title=k.title, kaizen_code=k.kaizen_code or "",
        problem_statement=k.problem_statement,
        target_type=k.target_type, target_id=k.target_id,
        current_condition=k.current_condition,
        target_condition=k.target_condition, owner=k.owner,
        priority=k.priority, source_type=k.source_type,
        source_suggestion_id=k.source_suggestion_id,
        start_date=k.start_date.isoformat() if k.start_date else None,
        due_date=k.due_date.isoformat() if k.due_date else None,
        completed_date=k.completed_date.isoformat() if k.completed_date else None,
        status=k.status, result_summary=k.result_summary,
        actions=[_to_action_node(a) for a in k.actions.all()],
        created_at=k.created_at.isoformat() if k.created_at else "",
        updated_at=k.updated_at.isoformat() if k.updated_at else "",
    )


def _to_a3_action_node(a) -> A3PDCAActionNode:
    return A3PDCAActionNode(
        id=a.id, a3_pdca_id=a.a3_pdca_id, phase=a.phase,
        title=a.title, description=a.description, owner=a.owner,
        due_date=a.due_date.isoformat() if a.due_date else None,
        status=a.status, notes=a.notes,
        created_at=a.created_at.isoformat() if a.created_at else "",
        updated_at=a.updated_at.isoformat() if a.updated_at else "",
    )


def _to_a3_node(a) -> A3PDCANode:
    return A3PDCANode(
        id=a.id, title=a.title, a3_code=a.a3_code or "",
        source_type=a.source_type,
        source_kaizen_id=a.source_kaizen_id,
        target_type=a.target_type, target_id=a.target_id,
        owner=a.owner, priority=a.priority,
        background=a.background, problem_statement=a.problem_statement,
        current_condition=a.current_condition,
        target_condition=a.target_condition,
        root_cause_analysis=a.root_cause_analysis,
        countermeasures=a.countermeasures,
        implementation_plan=a.implementation_plan,
        do_notes=a.do_notes, blockers=a.blockers,
        result_validation=a.result_validation,
        before_after_comparison=a.before_after_comparison,
        effectiveness_check=a.effectiveness_check,
        standardization_actions=a.standardization_actions,
        lessons_learned=a.lessons_learned,
        follow_up_plan=a.follow_up_plan,
        result_summary=a.result_summary,
        status=a.status,
        start_date=a.start_date.isoformat() if a.start_date else None,
        due_date=a.due_date.isoformat() if a.due_date else None,
        completed_date=a.completed_date.isoformat() if a.completed_date else None,
        actions=[_to_a3_action_node(x) for x in a.actions.all()],
        created_at=a.created_at.isoformat() if a.created_at else "",
        updated_at=a.updated_at.isoformat() if a.updated_at else "",
    )


@strawberry.type
class ImprovementQuery:
    @strawberry.field
    def suggestions(self, status: Optional[str] = None,
                    target_type: Optional[str] = None,
                    search: Optional[str] = None) -> list[SuggestionNode]:
        filters = {}
        if status: filters["status"] = status
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        svc = SuggestionService()
        return [_to_suggestion_node(s) for s in svc.list_suggestions(filters)]

    @strawberry.field
    def suggestion(self, id: int) -> Optional[SuggestionNode]:
        s = SuggestionService().get_suggestion(id)
        return _to_suggestion_node(s) if s else None

    @strawberry.field
    def kaizens(self, status: Optional[str] = None,
                target_type: Optional[str] = None,
                search: Optional[str] = None) -> list[KaizenDetailNode]:
        filters = {}
        if status: filters["status"] = status
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        svc = KaizenService()
        return [_to_kaizen_node(k) for k in svc.list_kaizens(filters)]

    @strawberry.field
    def kaizen(self, id: int) -> Optional[KaizenDetailNode]:
        k = KaizenService().get_kaizen(id)
        return _to_kaizen_node(k) if k else None

    @strawberry.field
    def a3_pdca_records(self, status: Optional[str] = None,
                        target_type: Optional[str] = None,
                        search: Optional[str] = None) -> list[A3PDCANode]:
        filters = {}
        if status: filters["status"] = status
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        svc = A3PDCAService()
        return [_to_a3_node(a) for a in svc.list_a3_pdca(filters)]

    @strawberry.field
    def a3_pdca(self, id: int) -> Optional[A3PDCANode]:
        a = A3PDCAService().get_a3_pdca(id)
        return _to_a3_node(a) if a else None

    @strawberry.field
    def continuous_improvement_summary(
            self, target_type: Optional[str] = None) -> ContinuousImprovementSummary:
        filters = {}
        if target_type: filters["target_type"] = target_type
        ci = ContinuousImprovementService()
        s = ci.get_improvement_summary(filters)
        bt = ci.get_improvements_by_target()
        bs = ci.get_improvements_by_status()
        return ContinuousImprovementSummary(
            total_suggestions=s["total_suggestions"],
            accepted_suggestions=s["accepted_suggestions"],
            rejected_suggestions=s["rejected_suggestions"],
            converted_suggestions=s["converted_suggestions"],
            active_kaizen_count=s["active_kaizen_count"],
            completed_kaizen_count=s["completed_kaizen_count"],
            overdue_kaizen_count=s["overdue_kaizen_count"],
            active_a3_count=s.get("active_a3_count", 0),
            completed_a3_count=s.get("completed_a3_count", 0),
            overdue_a3_count=s.get("overdue_a3_count", 0),
            improvements_by_target=[ImprovementByTarget(target_type=t["target_type"], count=t["count"]) for t in bt],
            improvements_by_status=[ImprovementByStatus(status=s["status"], count=s["count"]) for s in bs],
        )
