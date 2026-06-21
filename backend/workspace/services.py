"""Application services for the workspace domain."""

from datetime import datetime

from workspace.models import WorkspaceTask
from workspace.models import (
    TASK_STATUS_OPEN,
    TASK_STATUS_IN_PROGRESS,
    TASK_STATUS_WAITING,
    TASK_STATUS_COMPLETED,
    TASK_STATUS_CANCELLED,
    TASK_PRIORITY_HIGH,
    TASK_PRIORITY_CRITICAL,
)


class WorkspaceTaskServiceError(Exception):
    def __init__(self, field, code, message):
        self.field = field
        self.code = code
        self.message = message
        super().__init__(message)


class WorkspaceTaskService:

    @staticmethod
    def create(**kwargs) -> WorkspaceTask:
        title = kwargs.get("title", "").strip()
        if not title:
            raise WorkspaceTaskServiceError("title", "REQUIRED", "Title is required.")
        task = WorkspaceTask(**kwargs)
        task.save()
        return task

    @staticmethod
    def update(task_id: int, **kwargs) -> WorkspaceTask:
        task = WorkspaceTaskService._get(task_id)
        if "title" in kwargs:
            title = kwargs["title"].strip()
            if not title:
                raise WorkspaceTaskServiceError("title", "REQUIRED", "Title is required.")
            kwargs["title"] = title
        for key, value in kwargs.items():
            setattr(task, key, value)
        task.save()
        return task

    @staticmethod
    def start_task(task_id: int) -> WorkspaceTask:
        task = WorkspaceTaskService._get(task_id)
        if task.status != TASK_STATUS_OPEN:
            raise WorkspaceTaskServiceError(
                "status", "INVALID_TRANSITION",
                f"Cannot start task in status '{task.status}'. Must be OPEN.",
            )
        task.status = TASK_STATUS_IN_PROGRESS
        task.save()
        return task

    @staticmethod
    def complete_task(task_id: int, completed_by: str = "") -> WorkspaceTask:
        task = WorkspaceTaskService._get(task_id)
        if task.status not in (TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING):
            raise WorkspaceTaskServiceError(
                "status", "INVALID_TRANSITION",
                f"Cannot complete task in status '{task.status}'. Must be IN_PROGRESS or WAITING.",
            )
        task.status = TASK_STATUS_COMPLETED
        task.completed_at = datetime.now()
        if completed_by:
            task.completed_by = completed_by
        task.save()
        return task

    @staticmethod
    def cancel_task(task_id: int) -> WorkspaceTask:
        task = WorkspaceTaskService._get(task_id)
        if task.status in (TASK_STATUS_COMPLETED, TASK_STATUS_CANCELLED):
            raise WorkspaceTaskServiceError(
                "status", "INVALID_TRANSITION",
                f"Cannot cancel task in status '{task.status}'.",
            )
        task.status = TASK_STATUS_CANCELLED
        task.save()
        return task

    @staticmethod
    def list(assigned_to: str = "", status: str = "",
             priority: str = "", search: str = "",
             is_overdue: bool = False) -> list[WorkspaceTask]:
        qs = WorkspaceTask.objects.all()
        if assigned_to:
            qs = qs.filter(assigned_to=assigned_to)
        if status:
            qs = qs.filter(status=status)
        if priority:
            qs = qs.filter(priority=priority)
        if search:
            qs = qs.filter(title__icontains=search)
        if is_overdue:
            from datetime import date
            qs = qs.filter(
                due_date__lt=date.today(),
                status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
            )
        return list(qs)

    @staticmethod
    def get(task_id: int) -> WorkspaceTask | None:
        return WorkspaceTask.objects.filter(id=task_id).first()

    @staticmethod
    def get_summary(assigned_to: str = "") -> dict:
        from datetime import date, timedelta
        from django.db.models import Count, Q

        base = WorkspaceTask.objects.all()
        if assigned_to:
            base = base.filter(assigned_to=assigned_to)

        today = date.today()
        week_start = today - timedelta(days=today.weekday())

        return {
            "open": base.filter(status=TASK_STATUS_OPEN).count(),
            "in_progress": base.filter(status=TASK_STATUS_IN_PROGRESS).count(),
            "waiting": base.filter(status=TASK_STATUS_WAITING).count(),
            "completed": base.filter(status=TASK_STATUS_COMPLETED).count(),
            "overdue": base.filter(
                due_date__lt=today,
                status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
            ).count(),
            "due_today": base.filter(due_date=today).count(),
            "completed_this_week": base.filter(
                status=TASK_STATUS_COMPLETED,
                completed_at__gte=week_start,
            ).count(),
            "high_priority": base.filter(
                priority__in=[TASK_PRIORITY_HIGH, TASK_PRIORITY_CRITICAL],
                status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
            ).count(),
            "total": base.count(),
        }

    @staticmethod
    def _get(task_id: int) -> WorkspaceTask:
        task = WorkspaceTask.objects.filter(id=task_id).first()
        if not task:
            raise WorkspaceTaskServiceError("id", "NOT_FOUND", "Task not found.")
        return task
