"""Dashboard aggregation service for My Workspace."""

from datetime import date, timedelta

from workspace.models import WorkspaceTask
from workspace.models import (
    TASK_STATUS_OPEN,
    TASK_STATUS_IN_PROGRESS,
    TASK_STATUS_WAITING,
    TASK_STATUS_COMPLETED,
    TASK_PRIORITY_HIGH,
    TASK_PRIORITY_CRITICAL,
)

MAX_PRIORITY_WORK = 8
MAX_DUE_SOON = 6
MAX_RECENT = 10


class DashboardService:

    @staticmethod
    def get_dashboard(assigned_to: str = "") -> dict:
        today = date.today()
        week_end = today + timedelta(days=7)

        base = WorkspaceTask.objects.all()
        if assigned_to:
            base = base.filter(assigned_to=assigned_to)

        # Summary counts
        open_tasks = base.filter(status=TASK_STATUS_OPEN).count()
        in_progress = base.filter(status=TASK_STATUS_IN_PROGRESS).count()
        waiting = base.filter(status=TASK_STATUS_WAITING).count()
        overdue_tasks = base.filter(
            due_date__lt=today,
            status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
        ).count()
        due_today = base.filter(due_date=today).count()
        completed_today = base.filter(
            status=TASK_STATUS_COMPLETED,
            completed_at__date=today,
        ).count()
        high_priority = base.filter(
            priority__in=[TASK_PRIORITY_HIGH, TASK_PRIORITY_CRITICAL],
            status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
        ).count()
        total = base.count()

        # Priority work: high+critical tasks that are open/in-progress/waiting
        priority_work = list(
            base.filter(
                priority__in=[TASK_PRIORITY_HIGH, TASK_PRIORITY_CRITICAL],
                status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
            ).order_by("due_date", "-priority")[:MAX_PRIORITY_WORK]
        )

        # Due soon: tasks due within the next 7 days (excluding priority work duplicates)
        due_ids = {t.id for t in priority_work}
        due_soon = list(
            base.filter(
                due_date__gte=today,
                due_date__lte=week_end,
                status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
            ).exclude(id__in=due_ids).order_by("due_date")[:MAX_DUE_SOON]
        )

        # Recent activity: most recently created/updated tasks
        recent_activity = list(
            base.order_by("-updated_at")[:MAX_RECENT]
        )

        return {
            "open_tasks": open_tasks,
            "overdue_tasks": overdue_tasks,
            "due_today": due_today,
            "in_progress": in_progress,
            "completed_today": completed_today,
            "waiting": waiting,
            "high_priority": high_priority,
            "total": total,
            "priority_work": priority_work,
            "due_soon": due_soon,
            "recent_activity": recent_activity,
        }
