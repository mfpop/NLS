"""GraphQL schema for the Gemba Walk module."""

from datetime import date, datetime
from enum import Enum
from typing import Optional

import strawberry

from execution.constants import (
    GEMBA_SESSION_PLANNED,
    GEMBA_SESSION_IN_PROGRESS,
    GEMBA_CATEGORY_PRODUCTIVITY,
    GEMBA_SEVERITY_INFO,
    GEMBA_PRIORITY_MEDIUM,
    GEMBA_OBSERVATION_STATUS_OPEN,
)
from execution.services.gemba import GembaWalkService


# ── Enums ──

@strawberry.enum
class GembaSessionStatus(Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


@strawberry.enum
class GembaCategory(Enum):
    PRODUCTIVITY = "PRODUCTIVITY"
    QUALITY = "QUALITY"
    SAFETY = "SAFETY"
    FIVE_S = "FIVE_S"
    MAINTENANCE = "MAINTENANCE"
    MATERIAL = "MATERIAL"
    MORALE = "MORALE"
    OTHER = "OTHER"


@strawberry.enum
class GembaSeverity(Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@strawberry.enum
class GembaPriority(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


@strawberry.enum
class GembaObservationStatus(Enum):
    OPEN = "OPEN"
    IN_REVIEW = "IN_REVIEW"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    CONVERTED_TO_ACTION = "CONVERTED_TO_ACTION"
    CONVERTED_TO_ISSUE = "CONVERTED_TO_ISSUE"
    RESOLVED = "RESOLVED"
    VERIFIED = "VERIFIED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"
    CANCELLED = "CANCELLED"


@strawberry.enum
class GembaActionCode(Enum):
    ASSIGN = "ASSIGN"
    CREATE_ISSUE = "CREATE_ISSUE"
    CREATE_ACTION = "CREATE_ACTION"
    MARK_ACTION_REQUIRED = "MARK_ACTION_REQUIRED"
    RESOLVE = "RESOLVE"
    VERIFY = "VERIFY"
    CLOSE = "CLOSE"
    REOPEN = "REOPEN"
    CANCEL = "CANCEL"


# ── Types ──

@strawberry.type
class GembaWalkSessionNode:
    id: int
    line_id: Optional[int] = strawberry.field(name="lineId", default=None)
    plant_id: Optional[int] = strawberry.field(name="plantId", default=None)
    shift_name: str = strawberry.field(name="shiftName")
    walk_date: Optional[str] = strawberry.field(name="walkDate", default=None)
    status: str
    observer: str
    started_at: Optional[str] = strawberry.field(name="startedAt", default=None)
    completed_at: Optional[str] = strawberry.field(name="completedAt", default=None)
    summary: str
    created_by_id: Optional[int] = strawberry.field(name="createdById", default=None)
    updated_by_id: Optional[int] = strawberry.field(name="updatedById", default=None)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")


@strawberry.type
class GembaObservationNode:
    id: int
    session_id: int = strawberry.field(name="sessionId")
    target_type: str = strawberry.field(name="targetType")
    target_id: Optional[int] = strawberry.field(name="targetId", default=None)
    title: str
    description: str
    area: str
    focus: str
    category: str
    severity: str
    priority: str
    linked_resource_text: str = strawberry.field(name="linkedResourceText")
    owner_id: Optional[int] = strawberry.field(name="ownerId", default=None)
    owner_name: Optional[str] = strawberry.field(name="ownerName", default=None)
    due_date: Optional[str] = strawberry.field(name="dueDate", default=None)
    status: str
    location_path: str = strawberry.field(name="locationPath")
    location_label: str = strawberry.field(name="locationLabel")
    resolution_note: str = strawberry.field(name="resolutionNote")
    resolved_by_id: Optional[int] = strawberry.field(name="resolvedById", default=None)
    resolved_at: Optional[str] = strawberry.field(name="resolvedAt", default=None)
    verification_note: str = strawberry.field(name="verificationNote")
    verified_by_id: Optional[int] = strawberry.field(name="verifiedById", default=None)
    verified_at: Optional[str] = strawberry.field(name="verifiedAt", default=None)
    closed_by_id: Optional[int] = strawberry.field(name="closedById", default=None)
    closed_at: Optional[str] = strawberry.field(name="closedAt", default=None)
    created_issue_id: Optional[int] = strawberry.field(name="createdIssueId", default=None)
    created_action_id: Optional[int] = strawberry.field(name="createdActionId", default=None)
    created_by_id: Optional[int] = strawberry.field(name="createdById", default=None)
    created_by_name: Optional[str] = strawberry.field(name="createdByName", default=None)
    available_actions: list[str] = strawberry.field(name="availableActions")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")


@strawberry.type
class GembaObservationActivityNode:
    id: int
    observation_id: int = strawberry.field(name="observationId")
    event_type: str = strawberry.field(name="eventType")
    message: str
    old_status: Optional[str] = strawberry.field(name="oldStatus", default=None)
    new_status: Optional[str] = strawberry.field(name="newStatus", default=None)
    actor_id: Optional[int] = strawberry.field(name="actorId", default=None)
    actor_name: Optional[str] = strawberry.field(name="actorName", default=None)
    created_at: str = strawberry.field(name="createdAt")


@strawberry.type
class GembaMetricsNode:
    total: int
    open: int
    in_review: int = strawberry.field(name="inReview")
    action_required: int = strawberry.field(name="actionRequired")
    converted: int
    resolved: int
    closed: int
    critical: int
    overdue: int
    by_category: str = strawberry.field(name="byCategory")  # JSON string


@strawberry.type
class DailyGembaBoardNode:
    active_session: Optional[GembaWalkSessionNode] = strawberry.field(name="activeSession")
    observations: list[GembaObservationNode]
    metrics: GembaMetricsNode


# ── Target Options Types (for cascading selector) ──

@strawberry.type
class GembaTargetOptionNode:
    id: str
    target_type: str = strawberry.field(name="targetType")
    name: str
    code: str
    department_id: Optional[str] = strawberry.field(name="departmentId", default=None)
    department_name: Optional[str] = strawberry.field(name="departmentName", default=None)
    resource_group_id: Optional[str] = strawberry.field(name="resourceGroupId", default=None)
    resource_group_name: Optional[str] = strawberry.field(name="resourceGroupName", default=None)
    production_line_id: Optional[str] = strawberry.field(name="productionLineId", default=None)
    location_path: str = strawberry.field(name="locationPath")


@strawberry.type
class GembaTargetOptionsNode:
    production_line: Optional[GembaTargetOptionNode] = strawberry.field(name="productionLine")
    departments: list[GembaTargetOptionNode]
    resource_groups: list[GembaTargetOptionNode]
    resources: list[GembaTargetOptionNode]


# ── Inputs ──

@strawberry.input
class CreateGembaObservationInput:
    session_id: int = strawberry.field(name="sessionId")
    title: str
    description: Optional[str] = ""
    area: Optional[str] = ""
    focus: Optional[str] = ""
    category: str
    severity: Optional[str] = GEMBA_SEVERITY_INFO
    priority: Optional[str] = GEMBA_PRIORITY_MEDIUM
    linked_resource_text: Optional[str] = strawberry.field(name="linkedResourceText", default="")
    owner_id: Optional[int] = strawberry.field(name="ownerId", default=None)
    due_date: Optional[str] = strawberry.field(name="dueDate", default=None)
    target_type: Optional[str] = strawberry.field(name="targetType", default="")
    target_id: Optional[int] = strawberry.field(name="targetId", default=None)
    location_path: Optional[str] = strawberry.field(name="locationPath", default="")
    location_label: Optional[str] = strawberry.field(name="locationLabel", default="")
    plant_id: Optional[int] = strawberry.field(name="plantId", default=None)
    production_line_id: Optional[int] = strawberry.field(name="productionLineId", default=None)


@strawberry.input
class UpdateGembaObservationInput:
    title: Optional[str] = None
    description: Optional[str] = None
    area: Optional[str] = None
    focus: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    linked_resource_text: Optional[str] = strawberry.field(name="linkedResourceText", default=None)


@strawberry.input
class AssignGembaObservationInput:
    owner_id: Optional[int] = strawberry.field(name="ownerId", default=None)
    due_date: Optional[str] = strawberry.field(name="dueDate", default=None)


@strawberry.input
class ConvertToIssueInput:
    title: Optional[str] = None
    description: Optional[str] = ""
    severity: Optional[str] = "MEDIUM"
    control_area: Optional[str] = strawberry.field(name="controlArea", default="PRODUCTION")
    owner: Optional[str] = ""
    due_date: Optional[str] = strawberry.field(name="dueDate", default=None)
    plant: Optional[str] = ""
    production_line: Optional[str] = strawberry.field(name="productionLine", default="")
    department: Optional[str] = ""
    resource_group: Optional[str] = strawberry.field(name="resourceGroup", default="")
    resource: Optional[str] = ""


@strawberry.input
class ConvertToActionInput:
    title: Optional[str] = None
    description: Optional[str] = ""
    action_type: Optional[str] = strawberry.field(name="actionType", default="CORRECTIVE")
    priority: Optional[str] = "MEDIUM"
    assigned_to: Optional[str] = strawberry.field(name="assignedTo", default="")
    due_date: Optional[str] = strawberry.field(name="dueDate", default=None)
    control_area: Optional[str] = strawberry.field(name="controlArea", default="PRODUCTION")
    plant: Optional[str] = ""
    production_line: Optional[str] = strawberry.field(name="productionLine", default="")
    department: Optional[str] = ""
    resource_group: Optional[str] = strawberry.field(name="resourceGroup", default="")
    resource: Optional[str] = ""


# ── Converter helpers ──

def _session_to_node(session) -> GembaWalkSessionNode:
    return GembaWalkSessionNode(
        id=session.id,
        line_id=session.line_id,
        plant_id=session.plant_id,
        shift_name=session.shift_name or "",
        walk_date=session.walk_date.isoformat() if session.walk_date else None,
        status=session.status,
        observer=session.observer or "",
        started_at=session.started_at.isoformat() if session.started_at else None,
        completed_at=session.completed_at.isoformat() if session.completed_at else None,
        summary=session.summary or "",
        created_by_id=session.created_by_id,
        updated_by_id=session.updated_by_id,
        created_at=session.created_at.isoformat() if session.created_at else "",
        updated_at=session.updated_at.isoformat() if session.updated_at else "",
    )


def _get_available_actions(observation) -> list[str]:
    """Return available action codes based on observation status."""
    from execution.domain_rules import (
        can_assign_observation, can_require_action,
        can_resolve_observation, can_verify_observation,
        can_close_observation, can_reopen_observation,
        can_cancel_observation, can_convert_to_issue,
        can_convert_to_action,
    )
    s = observation.status
    actions = []
    if can_assign_observation(s):
        actions.append("ASSIGN")
    if can_require_action(s):
        actions.append("MARK_ACTION_REQUIRED")
    if can_convert_to_issue(s):
        actions.append("CREATE_ISSUE")
    if can_convert_to_action(s):
        actions.append("CREATE_ACTION")
    if can_resolve_observation(s):
        actions.append("RESOLVE")
    if can_verify_observation(s):
        actions.append("VERIFY")
    if can_close_observation(s):
        actions.append("CLOSE")
    if can_reopen_observation(s):
        actions.append("REOPEN")
    if can_cancel_observation(s):
        actions.append("CANCEL")
    return actions


def _observation_to_node(obs) -> GembaObservationNode:
    return GembaObservationNode(
        id=obs.id,
        session_id=obs.session_id,
        target_type=obs.target_type or "",
        target_id=obs.target_id,
        title=obs.title,
        description=obs.description or "",
        area=obs.area,
        focus=obs.focus or "",
        category=obs.category,
        severity=obs.severity,
        priority=obs.priority or "MEDIUM",
        linked_resource_text=obs.linked_resource_text or "",
        owner_id=obs.owner_id,
        owner_name=str(obs.owner) if obs.owner else None,
        due_date=obs.due_date.isoformat() if obs.due_date else None,
        status=obs.status,
        location_path=obs.location_path or "",
        location_label=obs.location_label or "",
        resolution_note=obs.resolution_note or "",
        resolved_by_id=obs.resolved_by_id,
        resolved_at=obs.resolved_at.isoformat() if obs.resolved_at else None,
        verification_note=obs.verification_note or "",
        verified_by_id=obs.verified_by_id,
        verified_at=obs.verified_at.isoformat() if obs.verified_at else None,
        closed_by_id=obs.closed_by_id,
        closed_at=obs.closed_at.isoformat() if obs.closed_at else None,
        created_issue_id=obs.created_issue_id,
        created_action_id=obs.created_action_id,
        created_by_id=obs.created_by_id,
        created_by_name=str(obs.created_by) if obs.created_by else None,
        available_actions=_get_available_actions(obs),
        created_at=obs.created_at.isoformat() if obs.created_at else "",
        updated_at=obs.updated_at.isoformat() if obs.updated_at else "",
    )


def _activity_to_node(act) -> GembaObservationActivityNode:
    return GembaObservationActivityNode(
        id=act.id,
        observation_id=act.observation_id,
        event_type=act.event_type,
        message=act.message or "",
        old_status=act.old_status,
        new_status=act.new_status,
        actor_id=act.actor_id,
        actor_name=str(act.actor) if act.actor else None,
        created_at=act.created_at.isoformat() if act.created_at else "",
    )


def _metrics_to_node(metrics: dict) -> GembaMetricsNode:
    import json
    return GembaMetricsNode(
        total=metrics.get("total", 0),
        open=metrics.get("open", 0),
        in_review=metrics.get("in_review", 0),
        action_required=metrics.get("action_required", 0),
        converted=metrics.get("converted", 0),
        resolved=metrics.get("resolved", 0),
        closed=metrics.get("closed", 0),
        critical=metrics.get("critical", 0),
        overdue=metrics.get("overdue", 0),
        by_category=json.dumps(metrics.get("by_category", {})),
    )


# ── Query ──

_service = GembaWalkService()


@strawberry.type
class GembaQuery:
    @strawberry.field(name="dailyGembaBoard")
    def daily_gemba_board(
        self, info: strawberry.types.Info,
        line_id: Optional[int] = None,
        plant_id: Optional[int] = None,
        walk_date: Optional[str] = None,
        shift_name: Optional[str] = None,
    ) -> DailyGembaBoardNode:
        parsed_date = None
        if walk_date:
            parsed_date = date.fromisoformat(walk_date)
        result = _service.get_daily_gemba_board(
            line_id=line_id,
            plant_id=plant_id,
            walk_date=parsed_date,
            shift_name=shift_name or "",
            user=info.context.user,
        )
        return DailyGembaBoardNode(
            active_session=_session_to_node(result["active_session"]) if result.get("active_session") else None,
            observations=[_observation_to_node(o) for o in result.get("observations", [])],
            metrics=_metrics_to_node(result.get("metrics", {})),
        )

    @strawberry.field(name="gembaWalkSession")
    def gemba_walk_session(self, info: strawberry.types.Info, id: int) -> Optional[GembaWalkSessionNode]:
        from execution.models import GembaWalkSession
        try:
            session = GembaWalkSession.objects.get(id=id)
            return _session_to_node(session)
        except GembaWalkSession.DoesNotExist:
            return None

    @strawberry.field(name="gembaObservation")
    def gemba_observation(self, info: strawberry.types.Info, id: int) -> Optional[GembaObservationNode]:
        from execution.models import GembaObservation
        try:
            obs = GembaObservation.objects.get(id=id)
            return _observation_to_node(obs)
        except GembaObservation.DoesNotExist:
            return None

    @strawberry.field(name="gembaObservationActivities")
    def gemba_observation_activities(
        self, info: strawberry.types.Info,
        observation_id: int = strawberry.field(name="observationId"),
    ) -> list[GembaObservationActivityNode]:
        activities = GembaObservationActivity.objects.filter(
            observation_id=observation_id
        ).select_related("actor").order_by("-created_at")[:50]
        return [_activity_to_node(a) for a in activities]

    @strawberry.field(name="gembaTargetOptions")
    def gemba_target_options(
        self, info: strawberry.types.Info,
        plant_id: Optional[int] = None,
        production_line_id: Optional[int] = None,
    ) -> GembaTargetOptionsNode:
        result = _service.get_target_options(
            plant_id=plant_id,
            production_line_id=production_line_id,
        )
        def _opt(d: dict) -> GembaTargetOptionNode:
            return GembaTargetOptionNode(
                id=d["id"],
                target_type=d["target_type"],
                name=d["name"],
                code=d.get("code", ""),
                department_id=d.get("department_id") or None,
                department_name=d.get("department_name") or None,
                resource_group_id=d.get("resource_group_id") or None,
                resource_group_name=d.get("resource_group_name") or None,
                production_line_id=d.get("production_line_id") or None,
                location_path=d.get("location_path", ""),
            )
        return GembaTargetOptionsNode(
            production_line=_opt(result["production_line"]) if result.get("production_line") else None,
            departments=[_opt(d) for d in result.get("departments", [])],
            resource_groups=[_opt(rg) for rg in result.get("resource_groups", [])],
            resources=[_opt(r) for r in result.get("resources", [])],
        )


# ── Mutation ──


@strawberry.type
class GembaMutation:
    # ── Session mutations ──

    @strawberry.mutation(name="startGembaWalkSession")
    def start_gemba_walk_session(self, info: strawberry.types.Info, id: int) -> GembaWalkSessionNode:
        session = _service.start_session(id, user=info.context.user)
        return _session_to_node(session)

    @strawberry.mutation(name="completeGembaWalkSession")
    def complete_gemba_walk_session(
        self, info: strawberry.types.Info, id: int,
        summary: Optional[str] = "",
    ) -> GembaWalkSessionNode:
        session = _service.complete_session(id, summary=summary or "", user=info.context.user)
        return _session_to_node(session)

    @strawberry.mutation(name="cancelGembaWalkSession")
    def cancel_gemba_walk_session(self, info: strawberry.types.Info, id: int) -> GembaWalkSessionNode:
        session = _service.cancel_session(id, user=info.context.user)
        return _session_to_node(session)

    # ── Observation mutations ──

    @strawberry.mutation(name="createGembaObservation")
    def create_gemba_observation(
        self, info: strawberry.types.Info,
        input: CreateGembaObservationInput,
    ) -> GembaObservationNode:
        parsed_date = None
        if input.due_date:
            parsed_date = date.fromisoformat(input.due_date)
        obs = _service.create_observation(
            input.session_id,
            title=input.title,
            description=input.description or "",
            area=input.area or "",
            focus=input.focus or "",
            category=input.category,
            severity=input.severity or GEMBA_SEVERITY_INFO,
            priority=input.priority or GEMBA_PRIORITY_MEDIUM,
            linked_resource_text=input.linked_resource_text or "",
            owner_id=input.owner_id,
            due_date=parsed_date,
            target_type=input.target_type or "",
            target_id=input.target_id,
            location_path=input.location_path or "",
            location_label=input.location_label or "",
            plant_id=input.plant_id,
            production_line_id=input.production_line_id,
            user=info.context.user,
        )
        return _observation_to_node(obs)

    @strawberry.mutation(name="updateGembaObservation")
    def update_gemba_observation(
        self, info: strawberry.types.Info, id: int,
        input: UpdateGembaObservationInput,
    ) -> GembaObservationNode:
        obs = _service.update_observation(
            id,
            title=input.title,
            description=input.description,
            area=input.area,
            focus=input.focus,
            category=input.category,
            severity=input.severity,
            priority=input.priority,
            linked_resource_text=input.linked_resource_text,
            user=info.context.user,
        )
        return _observation_to_node(obs)

    @strawberry.mutation(name="assignGembaObservation")
    def assign_gemba_observation(
        self, info: strawberry.types.Info, id: int,
        input: AssignGembaObservationInput,
    ) -> GembaObservationNode:
        parsed_date = None
        if input.due_date:
            parsed_date = date.fromisoformat(input.due_date)
        obs = _service.assign_observation(id, owner_id=input.owner_id, due_date=parsed_date, user=info.context.user)
        return _observation_to_node(obs)

    @strawberry.mutation(name="markGembaObservationActionRequired")
    def mark_gemba_observation_action_required(
        self, info: strawberry.types.Info, id: int,
        owner_id: int,
        due_date: str,
    ) -> GembaObservationNode:
        parsed_date = date.fromisoformat(due_date)
        obs = _service.mark_observation_action_required(
            id, owner_id=owner_id, due_date=parsed_date, user=info.context.user,
        )
        return _observation_to_node(obs)

    @strawberry.mutation(name="resolveGembaObservation")
    def resolve_gemba_observation(
        self, info: strawberry.types.Info, id: int,
        resolution_note: str,
    ) -> GembaObservationNode:
        obs = _service.resolve_observation(id, resolution_note, user=info.context.user)
        return _observation_to_node(obs)

    @strawberry.mutation(name="verifyGembaObservation")
    def verify_gemba_observation(
        self, info: strawberry.types.Info, id: int,
        verification_note: str,
    ) -> GembaObservationNode:
        obs = _service.verify_observation(id, verification_note, user=info.context.user)
        return _observation_to_node(obs)

    @strawberry.mutation(name="closeGembaObservation")
    def close_gemba_observation(self, info: strawberry.types.Info, id: int) -> GembaObservationNode:
        obs = _service.close_observation(id, user=info.context.user)
        return _observation_to_node(obs)

    @strawberry.mutation(name="reopenGembaObservation")
    def reopen_gemba_observation(self, info: strawberry.types.Info, id: int) -> GembaObservationNode:
        obs = _service.reopen_observation(id, user=info.context.user)
        return _observation_to_node(obs)

    @strawberry.mutation(name="convertGembaObservationToIssue")
    def convert_gemba_observation_to_issue(
        self, info: strawberry.types.Info, id: int,
        input: ConvertToIssueInput,
    ) -> GembaObservationNode:
        parsed_date = None
        if input.due_date:
            parsed_date = date.fromisoformat(input.due_date)
        obs = _service.convert_observation_to_issue(
            id,
            title=input.title,
            description=input.description or "",
            severity=input.severity or "MEDIUM",
            control_area=input.control_area or "PRODUCTION",
            owner=input.owner or "",
            due_date=parsed_date,
            plant=input.plant or "",
            production_line=input.production_line or "",
            department=input.department or "",
            resource_group=input.resource_group or "",
            resource=input.resource or "",
            user=info.context.user,
        )
        return _observation_to_node(obs)

    @strawberry.mutation(name="convertGembaObservationToAction")
    def convert_gemba_observation_to_action(
        self, info: strawberry.types.Info, id: int,
        input: ConvertToActionInput,
    ) -> GembaObservationNode:
        parsed_date = None
        if input.due_date:
            parsed_date = date.fromisoformat(input.due_date)
        obs = _service.convert_observation_to_action(
            id,
            title=input.title,
            description=input.description or "",
            action_type=input.action_type or "CORRECTIVE",
            priority=input.priority or "MEDIUM",
            assigned_to=input.assigned_to or "",
            due_date=parsed_date,
            control_area=input.control_area or "PRODUCTION",
            plant=input.plant or "",
            production_line=input.production_line or "",
            department=input.department or "",
            resource_group=input.resource_group or "",
            resource=input.resource or "",
            user=info.context.user,
        )
        return _observation_to_node(obs)
