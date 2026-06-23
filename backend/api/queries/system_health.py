"""GraphQL query for system health monitoring.

Returns real-time health data: app status, DB connectivity, disk usage,
memory usage, deployed services, recent errors, deployment info,
and Django system check results. No secrets or credentials are exposed.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from datetime import datetime
from enum import Enum
from typing import Optional

import strawberry
from django.conf import settings
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


# ── Types ──


@strawberry.enum
class HealthStatus(Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


@strawberry.type
class ServiceNode:
    name: str
    status: HealthStatus
    detail: str = ""


@strawberry.type
class RecentErrorNode:
    source: str
    message: str
    timestamp: str
    severity: str  # "error" | "warning" | "info"


@strawberry.type
class DeploymentInfoNode:
    app_version: str = strawberry.field(name="appVersion")
    commit: str = ""
    environment: str
    debug_enabled: bool = strawberry.field(name="debugEnabled")
    last_deploy: str = strawberry.field(name="lastDeploy", default="")
    django_version: str = strawberry.field(name="djangoVersion")
    python_version: str = strawberry.field(name="pythonVersion")
    server_time: str = strawberry.field(name="serverTime")


@strawberry.type
class SystemCheckNode:
    name: str
    status: HealthStatus
    detail: str = ""


@strawberry.type
class SystemHealthNode:
    overall_status: HealthStatus = strawberry.field(name="overallStatus")
    app_status: HealthStatus = strawberry.field(name="appStatus")
    api_status: HealthStatus = strawberry.field(name="apiStatus")
    database_status: HealthStatus = strawberry.field(name="databaseStatus")
    disk_usage: str = strawberry.field(name="diskUsage")
    memory_usage: str = strawberry.field(name="memoryUsage")
    services: list[ServiceNode]
    recent_errors: list[RecentErrorNode] = strawberry.field(name="recentErrors")
    deployment_info: DeploymentInfoNode = strawberry.field(name="deploymentInfo")
    checks: list[SystemCheckNode]


# ── Helpers ──


def _check_db() -> tuple[HealthStatus, str]:
    try:
        connection.ensure_connection()
        with connection.cursor() as c:
            c.execute("SELECT 1")
            c.fetchone()
        return HealthStatus.HEALTHY, "Connected"
    except Exception as exc:
        return HealthStatus.CRITICAL, str(exc)[:100]


def _check_disk() -> str:
    """Return disk usage as a human-readable string (e.g. '45% used')."""
    total, used, free = shutil.disk_usage(settings.BASE_DIR)
    pct = round((used / total) * 100)
    free_gb = round(free / (1024**3), 1)
    return f"{pct}% used ({free_gb} GB free)"


def _check_memory() -> str:
    """Return a rough memory info string. Uses psutil if available, else 'N/A'."""
    try:
        import psutil
        mem = psutil.virtual_memory()
        pct = mem.percent
        avail_gb = round(mem.available / (1024**3), 1)
        return f"{pct}% used ({avail_gb} GB available)"
    except ImportError:
        pass
    # Fallback: read /proc/meminfo on Linux
    try:
        with open("/proc/meminfo") as f:
            data = f.read()
        total_kb = 0
        avail_kb = 0
        for line in data.splitlines():
            if line.startswith("MemTotal:"):
                total_kb = int(line.split()[1])
            elif line.startswith("MemAvailable:"):
                avail_kb = int(line.split()[1])
        if total_kb:
            pct = round(((total_kb - avail_kb) / total_kb) * 100)
            avail_gb = round(avail_kb / (1024**2), 1)
            return f"{pct}% used ({avail_gb} GB available)"
    except Exception:
        pass
    return "N/A"


def _check_migrations() -> list[SystemCheckNode]:
    """Check whether all migrations have been applied."""
    executor = MigrationExecutor(connection)
    plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
    if not plan:
        return [SystemCheckNode(
            name="Migrations",
            status=HealthStatus.HEALTHY,
            detail="All migrations applied",
        )]
    targets = [(migration.app_label, migration.name) for migration, _ in plan]
    return [SystemCheckNode(
        name="Migrations",
        status=HealthStatus.WARNING,
        detail=f"{len(plan)} pending: {', '.join(f'{a}/{n}' for a, n in targets[:5])}",
    )]


def _git_commit() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=2, cwd=settings.BASE_DIR,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return ""


def _get_app_version() -> str:
    """Try to read package.json or a VERSION file for the app version."""
    pkg = os.path.join(settings.BASE_DIR, "package.json")
    if os.path.exists(pkg):
        try:
            import json
            with open(pkg) as f:
                data = json.load(f)
            return data.get("version", "0.1.0")
        except Exception:
            pass
    return "0.1.0"


def _get_recent_errors() -> list[RecentErrorNode]:
    """Fetch recent error/warning entries from SystemAuditLog."""
    try:
        from administration.models import SystemAuditLog
        from django.db.models import Q
        logs = SystemAuditLog.objects.filter(
            Q(event_type=SystemAuditLog.EventType.SYSTEM_EVENT) |
            Q(action__icontains="FAILED") |
            Q(action__icontains="ERROR")
        ).order_by("-created_at")[:20]
        return [
            RecentErrorNode(
                source=log.action,
                message=log.description[:200],
                timestamp=log.created_at.isoformat(),
                severity="error" if "FAIL" in log.action.upper() or "ERROR" in log.action.upper() else "warning",
            )
            for log in logs
        ]
    except Exception:
        return []


def _get_last_deploy() -> str:
    """Return the last deploy time via git log or a sentinel file."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%ci"],
            capture_output=True, text=True, timeout=2, cwd=settings.BASE_DIR,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return ""


# ── Query ──


@strawberry.type
class SystemHealthQuery:
    @strawberry.field(name="systemHealth")
    def system_health(self, info: strawberry.types.Info) -> SystemHealthNode:
        # Only staff/superuser can access health data
        user = info.context.user
        if not user or not (user.is_staff or user.is_superuser):
            return SystemHealthNode(
                overall_status=HealthStatus.UNKNOWN,
                app_status=HealthStatus.UNKNOWN,
                api_status=HealthStatus.UNKNOWN,
                database_status=HealthStatus.UNKNOWN,
                disk_usage="Restricted",
                memory_usage="Restricted",
                services=[],
                recent_errors=[],
                deployment_info=DeploymentInfoNode(
                    app_version="Restricted",
                    environment=os.environ.get("DJANGO_SETTINGS_MODULE", "unknown"),
                    debug_enabled=settings.DEBUG,
                    django_version="Restricted",
                    python_version="Restricted",
                    server_time=datetime.now().isoformat(),
                ),
                checks=[],
            )

        # DB check
        db_status, db_detail = _check_db()
        disk = _check_disk()
        mem = _check_memory()

        # Services
        services = [
            ServiceNode(name="Backend (Django)", status=HealthStatus.HEALTHY, detail="Running"),
            ServiceNode(name="GraphQL API", status=HealthStatus.HEALTHY if db_status == HealthStatus.HEALTHY else HealthStatus.CRITICAL, detail="Connected" if db_status == HealthStatus.HEALTHY else db_detail),
            ServiceNode(name="Database (SQLite/MySQL)", status=db_status, detail=db_detail),
        ]
        # Check for nginx or gunicorn processes
        for svc_name, cmd in [("Nginx", "nginx"), ("Gunicorn", "gunicorn")]:
            try:
                result = subprocess.run(
                    ["pgrep", "-x", cmd] if os.name != "nt" else ["tasklist", "/FI", f"IMAGENAME eq {cmd}.exe", "/NH"],
                    capture_output=True, text=True, timeout=3,
                )
                if result.returncode == 0:
                    services.append(ServiceNode(name=svc_name, status=HealthStatus.HEALTHY, detail="Running"))
                else:
                    services.append(ServiceNode(name=svc_name, status=HealthStatus.UNKNOWN, detail="Not detected"))
            except Exception:
                services.append(ServiceNode(name=svc_name, status=HealthStatus.UNKNOWN, detail="Check unavailable"))

        # System checks
        checks = _check_migrations()
        # Static check
        static_root = settings.STATIC_ROOT or ""
        if static_root and os.path.isdir(static_root):
            checks.append(SystemCheckNode(name="Static files", status=HealthStatus.HEALTHY, detail=f"Directory exists ({static_root})"))
        else:
            checks.append(SystemCheckNode(name="Static files", status=HealthStatus.WARNING, detail="STATIC_ROOT not configured or missing"))
        # Media check
        media_root = settings.MEDIA_ROOT or ""
        if media_root and os.path.isdir(media_root):
            checks.append(SystemCheckNode(name="Media files", status=HealthStatus.HEALTHY, detail=f"Directory exists ({media_root})"))
        else:
            checks.append(SystemCheckNode(name="Media files", status=HealthStatus.WARNING, detail="MEDIA_ROOT not configured or missing"))

        # Deployment info
        commit = _git_commit()
        deploy_time = _get_last_deploy()
        version = _get_app_version()

        # Overall status: critical if DB is down, warning if migrations pending, healthy otherwise
        overall = HealthStatus.HEALTHY
        if db_status == HealthStatus.CRITICAL:
            overall = HealthStatus.CRITICAL
        elif any(c.status == HealthStatus.WARNING for c in checks):
            overall = HealthStatus.WARNING

        return SystemHealthNode(
            overall_status=overall,
            app_status=HealthStatus.HEALTHY,
            api_status=HealthStatus.HEALTHY,
            database_status=db_status,
            disk_usage=disk,
            memory_usage=mem,
            services=services,
            recent_errors=_get_recent_errors(),
            deployment_info=DeploymentInfoNode(
                app_version=version,
                commit=commit,
                environment=os.environ.get("DJANGO_SETTINGS_MODULE", "unknown"),
                debug_enabled=settings.DEBUG,
                last_deploy=deploy_time,
                django_version=settings.DJANGO_VERSION if hasattr(settings, "DJANGO_VERSION") else "",
                python_version=f"{__import__('sys').version_info.major}.{__import__('sys').version_info.minor}.{__import__('sys').version_info.micro}",
                server_time=datetime.now().isoformat(),
            ),
            checks=checks,
        )
