"""
Seed script for sample WorkspaceTask data.
Run: python manage.py seed_tasks

Creates realistic tasks for the admin user across all statuses,
priorities, source modules, and due-date states — useful for
evaluating the My Tasks page with meaningful data.
"""

from datetime import date, timedelta, datetime

from django.core.management.base import BaseCommand
from django.db import transaction

from workspace.models import WorkspaceTask
from workspace.models import (
    TASK_STATUS_OPEN,
    TASK_STATUS_IN_PROGRESS,
    TASK_STATUS_WAITING,
    TASK_STATUS_COMPLETED,
    TASK_STATUS_CANCELLED,
    TASK_PRIORITY_LOW,
    TASK_PRIORITY_MEDIUM,
    TASK_PRIORITY_HIGH,
    TASK_PRIORITY_CRITICAL,
)


SAMPLE_TASKS = [
    # ── Safety / critical — overdue ──
    {
        "title": "Investigate near-miss report on Line 4 press brake",
        "description": "A near-miss occurred when a die insert dislodged during stamping. Investigate root cause, inspect all dies on Line 4, and implement corrective actions within 48 hours.",
        "status": TASK_STATUS_IN_PROGRESS,
        "priority": TASK_PRIORITY_CRITICAL,
        "due_date": date.today() - timedelta(days=1),
        "source_type": "FINDING",
        "source_module": "safety",
        "source_title": "Near Miss: Die Insert Dislodgement",
        "created_by": "admin",
    },
    {
        "title": "Update emergency evacuation route for Building B",
        "description": "Following the Building B expansion, update the fire evacuation floor plan maps at all 12 exits. Coordinate with Facilities.",
        "status": TASK_STATUS_OPEN,
        "priority": TASK_PRIORITY_HIGH,
        "due_date": date.today() - timedelta(days=3),
        "source_type": "ACTION",
        "source_module": "safety",
        "source_title": "MAP-2024-042: Evacuation Route Update",
        "created_by": "admin",
    },
    {
        "title": "Order replacement PPE for welding shop (expired lot)",
        "description": "Inventory audit found 3 lots of welding respirators past their expiration date. Order replacements from approved supplier.",
        "status": TASK_STATUS_COMPLETED,
        "priority": TASK_PRIORITY_MEDIUM,
        "due_date": date.today() - timedelta(days=7),
        "completed_at": datetime.now() - timedelta(hours=6),
        "completed_by": "admin",
        "source_type": "FINDING",
        "source_module": "safety",
        "source_title": "PPE Expiration Audit",
        "created_by": "admin",
    },

    # ── Quality / non-conformance — mixed ──
    {
        "title": "Review batch NCRs for this week and escalate top 3",
        "description": "Review all non-conformance reports logged this week. Identify top 3 by frequency/cost and escalate to department heads.",
        "status": TASK_STATUS_OPEN,
        "priority": TASK_PRIORITY_HIGH,
        "due_date": date.today() + timedelta(days=1),
        "source_type": "NCR",
        "source_module": "quality",
        "source_title": "Weekly NCR Review",
        "created_by": "admin",
    },
    {
        "title": "Approve rework disposition for batch #4823",
        "description": "Batch #4823 (bracket assembly) has dimensional deviation on hole pitch. Evaluate rework vs scrap disposition.",
        "status": TASK_STATUS_WAITING,
        "priority": TASK_PRIORITY_HIGH,
        "due_date": date.today() + timedelta(days=2),
        "source_type": "APPROVAL",
        "source_module": "quality",
        "source_title": "Rework Disposition #4823",
        "created_by": "admin",
    },
    {
        "title": "Calibrate torque wrenches on Assembly Lines 1-3",
        "description": "Scheduled quarterly calibration for all torque wrenches. Coordinate with quality lab to minimize line downtime.",
        "status": TASK_STATUS_IN_PROGRESS,
        "priority": TASK_PRIORITY_MEDIUM,
        "due_date": date.today() + timedelta(days=5),
        "source_type": "WORK_ORDER",
        "source_module": "maintenance",
        "source_title": "PM-2024-Q2: Torque Tool Calibration",
        "created_by": "admin",
    },

    # ── Maintenance / work orders — due soon & today ──
    {
        "title": "Inspect and lubricate conveyor chain on Line 2",
        "description": "Scheduled preventive maintenance: inspect chain tension, lubricate bearings, replace worn sprockets if needed.",
        "status": TASK_STATUS_OPEN,
        "priority": TASK_PRIORITY_MEDIUM,
        "due_date": date.today(),
        "source_type": "WORK_ORDER",
        "source_module": "maintenance",
        "source_title": "PM-CONV-017: Conveyor Maintenance",
        "created_by": "admin",
    },
    {
        "title": "Replace hydraulic filter on Press #103",
        "description": "Hydraulic oil analysis shows particulate contamination. Replace filter element and take oil sample for post-replacement analysis.",
        "status": TASK_STATUS_WAITING,
        "priority": TASK_PRIORITY_HIGH,
        "due_date": date.today(),
        "source_type": "WORK_ORDER",
        "source_module": "maintenance",
        "source_title": "CM-PRESS-103: Hydraulic Filter",
        "created_by": "admin",
    },
    {
        "title": "Weekly PM round on CNC machines #1-6",
        "description": "Coolant level check, chip tray empty, way lube top-up, air filter clean. Standard weekly PM.",
        "status": TASK_STATUS_COMPLETED,
        "priority": TASK_PRIORITY_LOW,
        "due_date": date.today(),
        "completed_at": datetime.now() - timedelta(hours=2),
        "completed_by": "admin",
        "source_type": "WORK_ORDER",
        "source_module": "maintenance",
        "source_title": "PM-CNC-003: Weekly CNC PM",
        "created_by": "admin",
    },

    # ── Manufacturing engineering / MERs ──
    {
        "title": "Review and approve press brake die change ECO",
        "description": "Engineering Change Order for quick-change die system on Amada HG-1303. Requires engineering manager approval before procurement.",
        "status": TASK_STATUS_WAITING,
        "priority": TASK_PRIORITY_HIGH,
        "due_date": date.today() + timedelta(days=3),
        "source_type": "APPROVAL",
        "source_module": "mer",
        "source_title": "ECO-2024-042: Press Brake Die Change",
        "created_by": "admin",
    },
    {
        "title": "Provide process inputs for robot calibration fixture",
        "description": "The fixture designer needs current process parameters (torque specs, weld schedules, reach envelopes) to design the calibration fixture for Fanuc welding robots.",
        "status": TASK_STATUS_OPEN,
        "priority": TASK_PRIORITY_MEDIUM,
        "due_date": date.today() + timedelta(days=10),
        "source_type": "MER",
        "source_module": "mer",
        "source_title": "MER-2024-015: Robot Calibration Fixture",
        "created_by": "admin",
    },
    {
        "title": "Organize 5S event in pipe bending area",
        "description": "Plan and coordinate a 5S kaizen event. Reserve training room, print labels/visual aids, coordinate with shift supervisors for operator availability.",
        "status": TASK_STATUS_OPEN,
        "priority": TASK_PRIORITY_LOW,
        "due_date": date.today() + timedelta(days=14),
        "source_type": "MER",
        "source_module": "process_improvement",
        "source_title": "5S Pipe Bending Area",
        "created_by": "admin",
    },

    # ── Continuous improvement / actions ──
    {
        "title": "Follow up on harness standard work implementation",
        "description": "Check with shift leads on the adoption of new standard work instructions for harness assembly. Gather feedback and identify gaps.",
        "status": TASK_STATUS_OPEN,
        "priority": TASK_PRIORITY_MEDIUM,
        "due_date": date.today() + timedelta(days=7),
        "source_type": "ACTION",
        "source_module": "continuous_improvement",
        "source_title": "CI-HARNESS-001: Standard Work",
        "created_by": "admin",
    },
    {
        "title": "Audit kanban bin usage on assembly stations",
        "description": "Spot check 10 assembly stations to verify two-bin kanban system is being used correctly. Report violations or non-compliance to area supervisor.",
        "status": TASK_STATUS_OPEN,
        "priority": TASK_PRIORITY_LOW,
        "due_date": date.today() + timedelta(days=21),
        "source_type": "ACTION",
        "source_module": "continuous_improvement",
        "source_title": "Kanban Audit Week 24",
        "created_by": "admin",
    },
    {
        "title": "Document lessons learned from exhaust filtration project",
        "description": "Capture lessons learned from the laser cutter exhaust filtration upgrade. Include vendor evaluation, installation challenges, and safety compliance verification.",
        "status": TASK_STATUS_OPEN,
        "priority": TASK_PRIORITY_LOW,
        "due_date": date.today() + timedelta(days=30),
        "source_type": "ACTION",
        "source_module": "continuous_improvement",
        "source_title": "EHS-FILTER-001: Lessons Learned",
        "created_by": "admin",
    },

    # ── Cancelled and historical ──
    {
        "title": "Evaluate RFID tool tracking system vendors",
        "description": "Research and compare three RFID tool tracking vendors. Demo required before shortlist.",
        "status": TASK_STATUS_CANCELLED,
        "priority": TASK_PRIORITY_LOW,
        "source_type": "PROJECT",
        "source_module": "continuous_improvement",
        "source_title": "RFID Tool Tracking POC",
        "created_by": "admin",
    },
    {
        "title": "Migrate legacy inspection reports to new QMS",
        "description": "All inspection reports from 2023 and earlier need to be migrated from legacy system to new QMS database.",
        "status": TASK_STATUS_COMPLETED,
        "priority": TASK_PRIORITY_MEDIUM,
        "due_date": date.today() - timedelta(days=14),
        "completed_at": datetime.now() - timedelta(days=10),
        "completed_by": "admin",
        "source_type": "PROJECT",
        "source_module": "quality",
        "source_title": "QMS Migration",
        "created_by": "admin",
    },

    # ── Generic overdue items ──
    {
        "title": "Submit monthly safety report for June",
        "description": "Compile and submit the monthly safety KPI report including: incident rate, near-miss count, safety observation closure rate, and training completion status.",
        "status": TASK_STATUS_OPEN,
        "priority": TASK_PRIORITY_HIGH,
        "due_date": date.today() - timedelta(days=5),
        "source_type": "REPORT",
        "source_module": "safety",
        "source_title": "Monthly Safety Report — June",
        "created_by": "admin",
    },
    {
        "title": "Update SOP for chemical handling in paint booth",
        "description": "Hazard communication standard update requires revised SOP for paint booth chemical handling. Include new SDS references.",
        "status": TASK_STATUS_OPEN,
        "priority": TASK_PRIORITY_MEDIUM,
        "due_date": date.today() - timedelta(days=2),
        "source_type": "FINDING",
        "source_module": "safety",
        "source_title": "SOP-CHEM-007: Paint Booth Chemicals",
        "created_by": "admin",
    },
    {
        "title": "Complete online GHS hazard communication training",
        "description": "Annual GHS hazard communication refresher. Course takes approx. 45 minutes. Must be completed by end of month.",
        "status": TASK_STATUS_IN_PROGRESS,
        "priority": TASK_PRIORITY_MEDIUM,
        "due_date": date.today() + timedelta(days=4),
        "source_type": "TRAINING",
        "source_module": "safety",
        "source_title": "GHS Refresher 2024",
        "created_by": "admin",
    },
    {
        "title": "Approve overtime request for weekend QC inspection",
        "description": "End-of-month QC inspection backlog requires overtime. Review and approve (or deny) overtime request for 2 QC techs for Saturday.",
        "status": TASK_STATUS_WAITING,
        "priority": TASK_PRIORITY_MEDIUM,
        "due_date": date.today() + timedelta(days=1),
        "source_type": "APPROVAL",
        "source_module": "human_resources",
        "source_title": "OT-QC-0624: QC Weekend Inspection",
        "created_by": "admin",
    },
]


class Command(BaseCommand):
    help = (
        "Seed sample WorkspaceTask data for the admin user. "
        "Creates tasks across all statuses, priorities, source modules, "
        "and due-date states for testing the My Tasks page."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all existing WorkspaceTask records before seeding",
        )
        parser.add_argument(
            "--count", type=int, default=0,
            help="Override number of tasks to create (0 = use all sample data)",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("  TASKS SEED COMMAND"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        if options["clear"]:
            count = WorkspaceTask.objects.count()
            WorkspaceTask.objects.all().delete()
            self.stdout.write(f"  Cleared {count} existing tasks")

        seed_data = SAMPLE_TASKS[:options["count"]] if options["count"] > 0 else SAMPLE_TASKS
        self.stdout.write(f"\n  Creating {len(seed_data)} sample tasks for user 'admin'...\n")

        created = 0
        skipped = 0

        for i, data in enumerate(seed_data):
            sid = transaction.savepoint()
            try:
                # Ensure assigned_to is always "admin"
                task_data = {
                    "assigned_to": "admin",
                    **data,
                }
                # completed_at needs special handling for auto_now fields
                completed_at = task_data.pop("completed_at", None)

                task = WorkspaceTask(**task_data)
                if completed_at:
                    task.completed_at = completed_at
                task.save()
                created += 1

                prefix = "✓" if task.status in (TASK_STATUS_COMPLETED, TASK_STATUS_CANCELLED) else "•"
                self.stdout.write(
                    f"  {prefix} [{i+1:2d}] {task.title[:55]:55s} "
                    f"{task.status:12s} {task.priority:8s}"
                )

            except Exception as e:
                transaction.savepoint_rollback(sid)
                skipped += 1
                self.stdout.write(
                    self.style.WARNING(f"  SKIP [{i+1:2d}]: {e}")
                )

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("  SEED COMPLETE"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Created:   {created} tasks")
        if skipped:
            self.stdout.write(self.style.WARNING(f"  Skipped:   {skipped}"))

        # Status breakdown
        from django.db.models import Count
        self.stdout.write("\n  Status breakdown:")
        status_breakdown = WorkspaceTask.objects.values("status").annotate(count=Count("id")).order_by("status")
        for item in status_breakdown:
            label = next((s[1] for s in WorkspaceTask._meta.get_field("status").choices if s[0] == item["status"]), item["status"])
            self.stdout.write(f"    {label:20s}: {item['count']}")

        # Priority breakdown
        self.stdout.write("\n  Priority breakdown:")
        priority_breakdown = WorkspaceTask.objects.values("priority").annotate(count=Count("id")).order_by("priority")
        for item in priority_breakdown:
            label = next((p[1] for p in WorkspaceTask._meta.get_field("priority").choices if p[0] == item["priority"]), item["priority"])
            self.stdout.write(f"    {label:20s}: {item['count']}")

        # Overdue count
        overdue = WorkspaceTask.objects.filter(
            due_date__lt=date.today(),
            status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS, TASK_STATUS_WAITING],
        ).count()
        due_today = WorkspaceTask.objects.filter(due_date=date.today()).count()

        self.stdout.write(f"\n  Overdue tasks:        {overdue}")
        self.stdout.write(f"  Due today:            {due_today}")
        self.stdout.write(f"  High priority active: {WorkspaceTask.objects.filter(priority__in=[TASK_PRIORITY_HIGH, TASK_PRIORITY_CRITICAL], status__in=[TASK_STATUS_OPEN, TASK_STATUS_IN_PROGRESS]).count()}")
        total = WorkspaceTask.objects.count()
        self.stdout.write(f"  Total tasks:          {total}")
        self.stdout.write(self.style.SUCCESS("=" * 60))
