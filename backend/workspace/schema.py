from __future__ import annotations

import strawberry
from typing import Optional
from datetime import date, datetime

from workspace.models import WorkspaceTask
from workspace.services import WorkspaceTaskService, WorkspaceTaskServiceError


# ── Node type ──

@strawberry.type
class WorkspaceTaskNode:
    id: int
    title: str
    description: str
    status: str
    priority: str
    assigned_to: str = strawberry.field(name="assignedTo")
    due_date: Optional[str] = strawberry.field(name="dueDate", default=None)
    source_type: str = strawberry.field(name="sourceType")
    source_id: Optional[int] = strawberry.field(name="sourceId", default=None)
    source_title: str = strawberry.field(name="sourceTitle")
    source_module: str = strawberry.field(name="sourceModule")
    created_by: str = strawberry.field(name="createdBy")
    completed_at: Optional[str] = strawberry.field(name="completedAt", default=None)
    completed_by: str = strawberry.field(name="completedBy")
    notes: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")


@strawberry.type
class TaskSummaryNode:
    open: int
    in_progress: int = strawberry.field(name="inProgress")
    waiting: int
    completed: int
    overdue: int
    due_today: int = strawberry.field(name="dueToday")
    completed_this_week: int = strawberry.field(name="completedThisWeek")
    high_priority: int = strawberry.field(name="highPriority")
    total: int


@strawberry.type
class WorkspaceTaskPayload:
    task: Optional[WorkspaceTaskNode] = None
    errors: Optional[list["WorkspaceMutationError"]] = None


@strawberry.type
class WorkspaceMutationError:
    field: str
    code: str
    message: str


# ── Converter ──

def _to_task_node(t: WorkspaceTask) -> WorkspaceTaskNode:
    return WorkspaceTaskNode(
        id=t.id,
        title=t.title,
        description=t.description,
        status=t.status,
        priority=t.priority,
        assigned_to=t.assigned_to,
        due_date=t.due_date.isoformat() if t.due_date else None,
        source_type=t.source_type,
        source_id=t.source_id,
        source_title=t.source_title,
        source_module=t.source_module,
        created_by=t.created_by,
        completed_at=t.completed_at.isoformat() if t.completed_at else None,
        completed_by=t.completed_by,
        notes=t.notes,
        created_at=t.created_at.isoformat() if t.created_at else "",
        updated_at=t.updated_at.isoformat() if t.updated_at else "",
    )


# ── Queries ──

@strawberry.type
class WorkspaceQuery:
    @strawberry.field(name="myTasks")
    def my_tasks(self, info: strawberry.types.Info,
                 status: Optional[str] = None,
                 priority: Optional[str] = None,
                 search: Optional[str] = None,
                 is_overdue: Optional[bool] = strawberry.field(name="isOverdue", default=None)) -> list[WorkspaceTaskNode]:
        user = info.context.user
        assigned_to = user.username if user else ""
        return [
            _to_task_node(t) for t in WorkspaceTaskService.list(
                assigned_to=assigned_to,
                status=status or "",
                priority=priority or "",
                search=search or "",
                is_overdue=is_overdue or False,
            )
        ]

    @strawberry.field(name="task")
    def task(self, id: int) -> Optional[WorkspaceTaskNode]:
        t = WorkspaceTaskService.get(id)
        return _to_task_node(t) if t else None

    @strawberry.field(name="myWorkspaceDashboard")
    def my_workspace_dashboard(self, info: strawberry.types.Info) -> DashboardSummaryNode:
        from workspace.dashboard_service import DashboardService
        user = info.context.user
        username = user.username if user else ""
        dashboard = DashboardService.get_dashboard(username)
        return DashboardSummaryNode(
            open_tasks=dashboard["open_tasks"],
            overdue_tasks=dashboard["overdue_tasks"],
            due_today=dashboard["due_today"],
            in_progress=dashboard["in_progress"],
            completed_today=dashboard["completed_today"],
            waiting=dashboard["waiting"],
            high_priority=dashboard["high_priority"],
            total=dashboard["total"],
            priority_work=[_to_dashboard_item(i) for i in dashboard["priority_work"]],
            due_soon=[_to_dashboard_item(i) for i in dashboard["due_soon"]],
            recent_activity=[_to_dashboard_item(i) for i in dashboard["recent_activity"]],
        )

    @strawberry.field(name="taskSummary")
    def task_summary(self, info: strawberry.types.Info) -> TaskSummaryNode:
        user = info.context.user
        assigned_to = user.username if user else ""
        summary = WorkspaceTaskService.get_summary(assigned_to=assigned_to)
        return TaskSummaryNode(
            open=summary["open"],
            in_progress=summary["in_progress"],
            waiting=summary["waiting"],
            completed=summary["completed"],
            overdue=summary["overdue"],
            due_today=summary["due_today"],
            completed_this_week=summary["completed_this_week"],
            high_priority=summary["high_priority"],
            total=summary["total"],
        )


# ── Dashboard types ──

@strawberry.type
class DashboardItemNode:
    id: int
    title: str
    description: str
    status: str
    priority: str
    source_type: str = strawberry.field(name="sourceType")
    source_id: Optional[int] = strawberry.field(name="sourceId", default=None)
    source_title: str = strawberry.field(name="sourceTitle")
    source_module: str = strawberry.field(name="sourceModule")
    due_date: Optional[str] = strawberry.field(name="dueDate", default=None)
    task_type: str = strawberry.field(name="taskType")  # "task", "approval", "finding", "action", "work_order", "mer"


@strawberry.type
class DashboardSummaryNode:
    open_tasks: int = strawberry.field(name="openTasks")
    overdue_tasks: int = strawberry.field(name="overdueTasks")
    due_today: int = strawberry.field(name="dueToday")
    in_progress: int = strawberry.field(name="inProgress")
    completed_today: int = strawberry.field(name="completedToday")
    waiting: int
    high_priority: int = strawberry.field(name="highPriority")
    total: int
    priority_work: list[DashboardItemNode] = strawberry.field(name="priorityWork")
    due_soon: list[DashboardItemNode] = strawberry.field(name="dueSoon")
    recent_activity: list[DashboardItemNode] = strawberry.field(name="recentActivity")


def _to_dashboard_item(t: WorkspaceTask) -> DashboardItemNode:
    return DashboardItemNode(
        id=t.id,
        title=t.title,
        description=t.description,
        status=t.status,
        priority=t.priority,
        source_type=t.source_type,
        source_id=t.source_id,
        source_title=t.source_title,
        source_module=t.source_module,
        due_date=t.due_date.isoformat() if t.due_date else None,
        task_type="task",
    )


# ── Mutations ──

@strawberry.type
class WorkspaceMutation:
    @strawberry.mutation(name="updateTask")
    def update_task(self, info: strawberry.types.Info, id: int,
                    title: Optional[str] = None,
                    description: Optional[str] = None,
                    priority: Optional[str] = None,
                    notes: Optional[str] = None) -> WorkspaceTaskPayload:
        try:
            kwargs = {}
            if title is not None:
                kwargs["title"] = title
            if description is not None:
                kwargs["description"] = description
            if priority is not None:
                kwargs["priority"] = priority
            if notes is not None:
                kwargs["notes"] = notes
            task = WorkspaceTaskService.update(id, **kwargs)
            return WorkspaceTaskPayload(task=_to_task_node(task))
        except WorkspaceTaskServiceError as exc:
            return WorkspaceTaskPayload(
                errors=[WorkspaceMutationError(field=exc.field, code=exc.code, message=exc.message)]
            )

    @strawberry.mutation(name="startTask")
    def start_task(self, info: strawberry.types.Info, id: int) -> WorkspaceTaskPayload:
        try:
            task = WorkspaceTaskService.start_task(id)
            return WorkspaceTaskPayload(task=_to_task_node(task))
        except WorkspaceTaskServiceError as exc:
            return WorkspaceTaskPayload(
                errors=[WorkspaceMutationError(field=exc.field, code=exc.code, message=exc.message)]
            )

    @strawberry.mutation(name="completeTask")
    def complete_task(self, info: strawberry.types.Info, id: int,
                      completed_by: Optional[str] = None) -> WorkspaceTaskPayload:
        try:
            user = info.context.user
            cb = completed_by or (user.username if user else "")
            task = WorkspaceTaskService.complete_task(id, completed_by=cb)
            return WorkspaceTaskPayload(task=_to_task_node(task))
        except WorkspaceTaskServiceError as exc:
            return WorkspaceTaskPayload(
                errors=[WorkspaceMutationError(field=exc.field, code=exc.code, message=exc.message)]
            )

    @strawberry.mutation(name="cancelTask")
    def cancel_task(self, info: strawberry.types.Info, id: int) -> WorkspaceTaskPayload:
        try:
            task = WorkspaceTaskService.cancel_task(id)
            return WorkspaceTaskPayload(task=_to_task_node(task))
        except WorkspaceTaskServiceError as exc:
            return WorkspaceTaskPayload(
                errors=[WorkspaceMutationError(field=exc.field, code=exc.code, message=exc.message)]
            )
