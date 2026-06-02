from __future__ import annotations
import strawberry
from typing import Optional


@strawberry.type
class SuggestionNode:
    id: int
    title: str
    description: str
    submitted_by: str
    target_type: str
    target_id: Optional[int]
    category: str
    priority: str
    status: str
    decision: str
    comments: str
    created_at: str
    updated_at: str


@strawberry.type
class KaizenActionNode:
    id: int
    kaizen_id: int
    title: str
    description: str
    owner: str
    due_date: Optional[str]
    status: str
    notes: str
    created_at: str
    updated_at: str


@strawberry.type
class KaizenDetailNode:
    id: int
    title: str
    kaizen_code: str
    problem_statement: str
    target_type: str
    target_id: Optional[int]
    current_condition: str
    target_condition: str
    owner: str
    priority: str
    source_type: str
    source_suggestion_id: Optional[int]
    start_date: Optional[str]
    due_date: Optional[str]
    completed_date: Optional[str]
    status: str
    result_summary: str
    actions: list[KaizenActionNode]
    created_at: str
    updated_at: str


@strawberry.type
class A3PDCAActionNode:
    id: int
    a3_pdca_id: int
    phase: str
    title: str
    description: str
    owner: str
    due_date: Optional[str]
    status: str
    notes: str
    created_at: str
    updated_at: str


@strawberry.type
class A3PDCANode:
    id: int
    title: str
    a3_code: str
    source_type: str
    source_kaizen_id: Optional[int]
    target_type: str
    target_id: Optional[int]
    owner: str
    priority: str
    background: str
    problem_statement: str
    current_condition: str
    target_condition: str
    root_cause_analysis: str
    countermeasures: str
    implementation_plan: str
    do_notes: str
    blockers: str
    result_validation: str
    before_after_comparison: str
    effectiveness_check: str
    standardization_actions: str
    lessons_learned: str
    follow_up_plan: str
    result_summary: str
    status: str
    start_date: Optional[str]
    due_date: Optional[str]
    completed_date: Optional[str]
    actions: list[A3PDCAActionNode]
    created_at: str
    updated_at: str


@strawberry.type
class ImprovementSnapshot:
    open_kaizens: int
    gemba_walks_this_week: int
    observations_this_week: int


@strawberry.type
class ImprovementByTarget:
    target_type: str
    count: int


@strawberry.type
class ImprovementByStatus:
    status: str
    count: int


@strawberry.type
class ContinuousImprovementSummary:
    total_suggestions: int
    accepted_suggestions: int
    rejected_suggestions: int
    converted_suggestions: int
    active_kaizen_count: int
    completed_kaizen_count: int
    overdue_kaizen_count: int
    active_a3_count: int
    completed_a3_count: int
    overdue_a3_count: int
    improvements_by_target: list[ImprovementByTarget]
    improvements_by_status: list[ImprovementByStatus]
