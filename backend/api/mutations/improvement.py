import strawberry
from typing import Optional

from api.permissions import ensure_access
from improvement.services.application.suggestion_service import SuggestionService
from improvement.services.application.kaizen_service import KaizenService
from improvement.services.application.a3_pdca_service import A3PDCAService


def _user(info):
    return info.context.user


@strawberry.type
class ImprovementMutation:
    # ── Suggestions ──
    @strawberry.mutation
    def create_suggestion(self, info: strawberry.types.Info, title: str, description: str = "",
                          submitted_by: str = "", target_type: str = "", target_id: Optional[int] = None,
                          category: str = "", priority: str = "MEDIUM") -> str:
        ensure_access(user=_user(info), action="create_suggestion")
        s = SuggestionService().create_suggestion(title=title, description=description,
            submitted_by=submitted_by, target_type=target_type, target_id=target_id,
            category=category, priority=priority)
        return f"Suggestion created: {s.title}"

    @strawberry.mutation
    def update_suggestion(self, info: strawberry.types.Info, id: int,
                          title: Optional[str] = None, description: Optional[str] = None,
                          category: Optional[str] = None, priority: Optional[str] = None,
                          comments: Optional[str] = None) -> str:
        ensure_access(user=_user(info), action="update_suggestion")
        kwargs = {k: v for k, v in {"title": title, "description": description,
                   "category": category, "priority": priority, "comments": comments}.items() if v is not None}
        s = SuggestionService().update_suggestion(id, **kwargs)
        return f"Suggestion updated: {s.title}"

    @strawberry.mutation
    def review_suggestion(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="review_suggestion")
        SuggestionService().review_suggestion(id)
        return "Suggestion moved to UNDER_REVIEW"

    @strawberry.mutation
    def accept_suggestion(self, info: strawberry.types.Info, id: int, decision: str = "") -> str:
        ensure_access(user=_user(info), action="accept_suggestion")
        SuggestionService().accept_suggestion(id, decision)
        return "Suggestion accepted"

    @strawberry.mutation
    def reject_suggestion(self, info: strawberry.types.Info, id: int, decision: str = "") -> str:
        ensure_access(user=_user(info), action="reject_suggestion")
        SuggestionService().reject_suggestion(id, decision)
        return "Suggestion rejected"

    @strawberry.mutation
    def convert_suggestion_to_kaizen(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="convert_suggestion_to_kaizen")
        SuggestionService().convert_suggestion_to_kaizen(id)
        return "Suggestion converted to Kaizen"

    @strawberry.mutation
    def delete_suggestion(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="delete_suggestion")
        SuggestionService().delete_suggestion(id)
        return "Suggestion deleted"

    # ── Kaizen ──
    @strawberry.mutation
    def create_kaizen(self, info: strawberry.types.Info, title: str, problem_statement: str = "",
                      target_type: str = "", target_id: Optional[int] = None,
                      current_condition: str = "", target_condition: str = "",
                      owner: str = "", source_type: str = "MANUAL",
                      priority: str = "MEDIUM",
                      source_suggestion_id: Optional[int] = None,
                      start_date: Optional[str] = None, due_date: Optional[str] = None) -> str:
        ensure_access(user=_user(info), action="create_kaizen")
        kwargs = {"title": title, "problem_statement": problem_statement,
                  "target_type": target_type, "target_id": target_id,
                  "current_condition": current_condition, "target_condition": target_condition,
                  "owner": owner, "source_type": source_type, "priority": priority}
        if start_date:
            from datetime import datetime
            kwargs["start_date"] = datetime.strptime(start_date, "%Y-%m-%d").date()
        if due_date:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date()
        if source_suggestion_id is not None:
            kwargs["source_suggestion_id"] = source_suggestion_id
        k = KaizenService().create_kaizen(**kwargs)
        return f"Kaizen created: {k.title}"

    @strawberry.mutation
    def update_kaizen(self, info: strawberry.types.Info, id: int, title: Optional[str] = None,
                      problem_statement: Optional[str] = None, current_condition: Optional[str] = None,
                      target_condition: Optional[str] = None, owner: Optional[str] = None,
                      priority: Optional[str] = None, source_type: Optional[str] = None,
                      result_summary: Optional[str] = None) -> str:
        ensure_access(user=_user(info), action="update_kaizen")
        kwargs = {k: v for k, v in {"title": title, "problem_statement": problem_statement,
                   "current_condition": current_condition, "target_condition": target_condition,
                   "owner": owner, "priority": priority, "source_type": source_type,
                   "result_summary": result_summary}.items() if v is not None}
        KaizenService().update_kaizen(id, **kwargs)
        return "Kaizen updated"

    @strawberry.mutation
    def start_kaizen(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="start_kaizen")
        KaizenService().start_kaizen(id)
        return "Kaizen started"

    @strawberry.mutation
    def complete_kaizen(self, info: strawberry.types.Info, id: int, result_summary: str = "") -> str:
        ensure_access(user=_user(info), action="complete_kaizen")
        KaizenService().complete_kaizen(id, result_summary)
        return "Kaizen completed"

    @strawberry.mutation
    def cancel_kaizen(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="cancel_kaizen")
        KaizenService().cancel_kaizen(id)
        return "Kaizen cancelled"

    @strawberry.mutation
    def add_kaizen_action(self, info: strawberry.types.Info, kaizen_id: int, title: str,
                          description: str = "", owner: str = "", due_date: Optional[str] = None) -> str:
        ensure_access(user=_user(info), action="add_kaizen_action")
        kwargs = {"title": title, "description": description, "owner": owner}
        if due_date:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date()
        KaizenService().add_kaizen_action(kaizen_id, **kwargs)
        return "Kaizen action added"

    @strawberry.mutation
    def update_kaizen_action(self, info: strawberry.types.Info, id: int,
                             title: Optional[str] = None, description: Optional[str] = None,
                             owner: Optional[str] = None) -> str:
        ensure_access(user=_user(info), action="update_kaizen_action")
        kwargs = {k: v for k, v in {"title": title, "description": description, "owner": owner}.items() if v is not None}
        KaizenService().update_kaizen_action(id, **kwargs)
        return "Kaizen action updated"

    @strawberry.mutation
    def complete_kaizen_action(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="complete_kaizen_action")
        KaizenService().complete_kaizen_action(id)
        return "Kaizen action completed"

    @strawberry.mutation
    def cancel_kaizen_action(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="cancel_kaizen_action")
        KaizenService().cancel_kaizen_action(id)
        return "Kaizen action cancelled"

    @strawberry.mutation
    def create_a3_from_kaizen(self, info: strawberry.types.Info, kaizen_id: int) -> str:
        ensure_access(user=_user(info), action="create_a3_from_kaizen")
        KaizenService().create_a3_from_kaizen(kaizen_id)
        return "A3/PDCA created from Kaizen"

    # ── A3 / PDCA ──
    @strawberry.mutation
    def create_a3_pdca(self, info: strawberry.types.Info, title: str, background: str = "",
                       problem_statement: str = "", current_condition: str = "",
                       target_condition: str = "", root_cause_analysis: str = "",
                       countermeasures: str = "", implementation_plan: str = "",
                       target_type: str = "", target_id: Optional[int] = None,
                       owner: str = "", priority: str = "MEDIUM", source_type: str = "",
                       source_kaizen_id: Optional[int] = None,
                       start_date: Optional[str] = None, due_date: Optional[str] = None) -> str:
        ensure_access(user=_user(info), action="create_a3_pdca")
        kwargs = {k: v for k, v in {"title": title, "background": background,
                   "problem_statement": problem_statement, "current_condition": current_condition,
                   "target_condition": target_condition, "root_cause_analysis": root_cause_analysis,
                   "countermeasures": countermeasures, "implementation_plan": implementation_plan,
                   "target_type": target_type, "target_id": target_id, "owner": owner,
                   "priority": priority, "source_type": source_type}.items() if v}
        if source_kaizen_id is not None:
            kwargs["source_kaizen_id"] = source_kaizen_id
        if start_date:
            from datetime import datetime
            kwargs["start_date"] = datetime.strptime(start_date, "%Y-%m-%d").date()
        if due_date:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date()
        a = A3PDCAService().create_a3_pdca(**kwargs)
        return f"A3/PDCA created: {a.title}"

    @strawberry.mutation
    def update_a3_pdca(self, info: strawberry.types.Info, id: int, title: Optional[str] = None,
                       background: Optional[str] = None, problem_statement: Optional[str] = None,
                       current_condition: Optional[str] = None, target_condition: Optional[str] = None,
                       root_cause_analysis: Optional[str] = None, countermeasures: Optional[str] = None,
                       implementation_plan: Optional[str] = None, do_notes: Optional[str] = None,
                       blockers: Optional[str] = None, result_validation: Optional[str] = None,
                       before_after_comparison: Optional[str] = None,
                       effectiveness_check: Optional[str] = None,
                       standardization_actions: Optional[str] = None,
                       lessons_learned: Optional[str] = None,
                       follow_up_plan: Optional[str] = None,
                       priority: Optional[str] = None,
                       result_summary: Optional[str] = None) -> str:
        ensure_access(user=_user(info), action="update_a3_pdca")
        kwargs = {k: v for k, v in {"title": title, "background": background,
                   "problem_statement": problem_statement, "current_condition": current_condition,
                   "target_condition": target_condition, "root_cause_analysis": root_cause_analysis,
                   "countermeasures": countermeasures, "implementation_plan": implementation_plan,
                   "do_notes": do_notes, "blockers": blockers,
                   "result_validation": result_validation, "before_after_comparison": before_after_comparison,
                   "effectiveness_check": effectiveness_check,
                   "standardization_actions": standardization_actions, "lessons_learned": lessons_learned,
                   "follow_up_plan": follow_up_plan, "priority": priority,
                   "result_summary": result_summary}.items() if v is not None}
        A3PDCAService().update_a3_pdca(id, **kwargs)
        return "A3/PDCA updated"

    @strawberry.mutation
    def move_a3_pdca_to_plan(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="move_a3_pdca_to_plan")
        A3PDCAService().move_to_plan(id)
        return "A3/PDCA moved to PLAN"

    @strawberry.mutation
    def move_a3_pdca_to_do(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="move_a3_pdca_to_do")
        A3PDCAService().move_to_do(id)
        return "A3/PDCA moved to DO"

    @strawberry.mutation
    def move_a3_pdca_to_check(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="move_a3_pdca_to_check")
        A3PDCAService().move_to_check(id)
        return "A3/PDCA moved to CHECK"

    @strawberry.mutation
    def move_a3_pdca_to_act(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="move_a3_pdca_to_act")
        A3PDCAService().move_to_act(id)
        return "A3/PDCA moved to ACT"

    @strawberry.mutation
    def complete_a3_pdca(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="complete_a3_pdca")
        A3PDCAService().complete_a3_pdca(id)
        return "A3/PDCA completed"

    @strawberry.mutation
    def cancel_a3_pdca(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="cancel_a3_pdca")
        A3PDCAService().cancel_a3_pdca(id)
        return "A3/PDCA cancelled"

    @strawberry.mutation
    def add_a3_pdca_action(self, info: strawberry.types.Info, a3_pdca_id: int, title: str,
                           phase: str = "", description: str = "", owner: str = "",
                           due_date: Optional[str] = None) -> str:
        ensure_access(user=_user(info), action="add_a3_pdca_action")
        kwargs = {"title": title, "phase": phase, "description": description, "owner": owner}
        if due_date:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date()
        A3PDCAService().add_a3_action(a3_pdca_id, **kwargs)
        return "A3/PDCA action added"

    @strawberry.mutation
    def update_a3_pdca_action(self, info: strawberry.types.Info, id: int,
                              title: Optional[str] = None, description: Optional[str] = None,
                              owner: Optional[str] = None) -> str:
        ensure_access(user=_user(info), action="update_a3_pdca_action")
        kwargs = {k: v for k, v in {"title": title, "description": description, "owner": owner}.items() if v is not None}
        A3PDCAService().update_a3_action(id, **kwargs)
        return "A3/PDCA action updated"

    @strawberry.mutation
    def complete_a3_pdca_action(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="complete_a3_pdca_action")
        A3PDCAService().complete_a3_action(id)
        return "A3/PDCA action completed"

    @strawberry.mutation
    def cancel_a3_pdca_action(self, info: strawberry.types.Info, id: int) -> str:
        ensure_access(user=_user(info), action="cancel_a3_pdca_action")
        A3PDCAService().cancel_a3_action(id)
        return "A3/PDCA action cancelled"
