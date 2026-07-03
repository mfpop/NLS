"""Dashboard aggregation service for My Workspace."""

from datetime import date, timedelta
from django.db.models import Count, Case, When, Value, IntegerField, Q
from django.utils import timezone

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

MAX_PRIORITY_WORK = 8
MAX_DUE_SOON = 6
MAX_RECENT = 10
MAX_ALERTS = 4
MAX_APPROVALS = 4


def _annotate_item(t: WorkspaceTask) -> dict:
    """Attach computed is_overdue and severity to a WorkspaceTask instance."""
    today = date.today()
    is_overdue = (
        t.due_date is not None
        and t.due_date < today
        and t.status in (TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING)
    )
    setattr(t, "_is_overdue", is_overdue)
    setattr(t, "_severity", t.priority)
    out = {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "priority": t.priority,
        "severity": t.priority,
        "source_type": t.source_type,
        "source_id": t.source_id,
        "source_title": t.source_title,
        "source_module": t.source_module,
        "due_date": t.due_date,
        "task_type": t.source_type if t.source_type else "task",
        "created_at": t.created_at,
        "is_overdue": is_overdue,
    }
    return out


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

        # Priority work: high+critical tasks open/in-progress/waiting
        # Sort: overdue+critical/high → due today+critical/high → blocked/waiting → remaining
        priority_work_qs = (
            base.filter(
                priority__in=[TASK_PRIORITY_HIGH, TASK_PRIORITY_CRITICAL],
                status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
            )
            .annotate(
                _is_overdue_db=Case(
                    When(
                        due_date__lt=today,
                        status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
                        then=Value(1),
                    ),
                    default=Value(0),
                    output_field=IntegerField(),
                ),
                _sort_order=Case(
                    When(
                        due_date__lt=today,
                        status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS],
                        priority__in=[TASK_PRIORITY_CRITICAL, TASK_PRIORITY_HIGH],
                        then=Value(1),
                    ),
                    When(
                        due_date=today,
                        priority__in=[TASK_PRIORITY_CRITICAL, TASK_PRIORITY_HIGH],
                        then=Value(2),
                    ),
                    When(status=TASK_STATUS_WAITING, then=Value(3)),
                    When(priority=TASK_PRIORITY_HIGH, then=Value(4)),
                    default=Value(5),
                    output_field=IntegerField(),
                ),
            )
            .order_by("_sort_order", "due_date", "-priority")[:MAX_PRIORITY_WORK]
        )
        priority_work = [_annotate_item(t) for t in priority_work_qs]

        # Due soon: tasks due within the next 7 days (excluding priority work duplicates)
        due_ids = {t["id"] for t in priority_work}
        due_soon_qs = (
            base.filter(
                due_date__gte=today,
                due_date__lte=week_end,
                status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
            )
            .exclude(id__in=due_ids)
            .order_by("due_date")[:MAX_DUE_SOON]
        )
        due_soon = [_annotate_item(t) for t in due_soon_qs]

        # Recent activity: most recently updated tasks
        recent_qs = base.order_by("-updated_at")[:MAX_RECENT]
        recent_activity = [_annotate_item(t) for t in recent_qs]

        # Alerts: waiting tasks (that are not approvals)
        # Approvals: tasks with source_type='APPROVAL' or high-severity waiting items
        approval_qs = (
            base.filter(
                Q(source_type="APPROVAL") | Q(source_type__iexact="approval"),
                status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
            )
            .order_by("due_date")[:MAX_APPROVALS]
        )
        approval_ids = {t.id for t in approval_qs}

        alerts_qs = (
            base.filter(
                status=TASK_STATUS_WAITING,
            )
            .exclude(id__in=approval_ids)
            .order_by("due_date")[:MAX_ALERTS]
        )
        alert_ids = {t.id for t in alerts_qs}

        # Also add overdue high-priority items as alerts
        overdue_alert_qs = (
            base.filter(
                due_date__lt=today,
                priority__in=[TASK_PRIORITY_HIGH, TASK_PRIORITY_CRITICAL],
                status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS],
            )
            .exclude(id__in=alert_ids | approval_ids)
            .order_by("due_date")[:max(0, MAX_ALERTS - alerts_qs.count())]
        )

        alerts = [_annotate_item(t) for t in alerts_qs] + [_annotate_item(t) for t in overdue_alert_qs]
        approvals = [_annotate_item(t) for t in approval_qs]

        # Workload trend: daily activity counts for the last 7 days
        from django.db.models.functions import TruncDate
        trend_qs = (
            base.filter(created_at__gte=today - timedelta(days=6))
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        trend_map = {row["day"]: row["count"] for row in trend_qs}
        weekday_labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        workload_trend = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            day_label = weekday_labels[d.weekday()]
            count = trend_map.get(d, 0)
            workload_trend.append({"day": day_label, "count": count})

        # Risk mix: counts by status category for active non-completed tasks
        risk_open = base.filter(status=TASK_STATUS_OPEN).count()
        risk_in_progress = base.filter(status=TASK_STATUS_IN_PROGRESS).count()
        risk_overdue = overdue_tasks
        risk_completed = base.filter(status=TASK_STATUS_COMPLETED).count()

        # Source breakdown: counts by source_module for non-cancelled tasks
        source_breakdown = list(
            base.filter(
                status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING, TASK_STATUS_COMPLETED],
                source_module__gt="",
            ).values("source_module").annotate(
                count=Count("id")
            ).order_by("-count")
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
            "alerts": alerts,
            "approvals": approvals,
            "workload_trend": workload_trend,
            "risk_mix": {
                "open": risk_open,
                "in_progress": risk_in_progress,
                "overdue": risk_overdue,
                "completed": risk_completed,
            },
            "source_breakdown": list(source_breakdown),
            "last_updated": timezone.now().isoformat(),
        }
