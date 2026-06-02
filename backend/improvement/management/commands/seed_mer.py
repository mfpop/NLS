"""
Seed script for sample Manufacturing Engineering Request data.
Run: python manage.py seed_mer

Creates realistic MERs across all 4 request types, 7 statuses, multiple
priorities, and categories — useful for testing and demo purposes.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction, IntegrityError

from improvement.constants import (
    MER_STATUS_SUBMITTED,
    MER_STATUS_UNDER_REVIEW,
    MER_STATUS_APPROVED,
    MER_STATUS_IN_PROGRESS,
    MER_STATUS_COMPLETED,
    MER_STATUS_REJECTED,
    MER_STATUS_CANCELLED,
    MER_TYPE_ENGINEERING_CHANGE,
    MER_TYPE_TOOLING,
    MER_TYPE_PROCESS_IMPROVEMENT,
    MER_TYPE_EQUIPMENT_MODIFICATION,
    MER_PRIORITY_LOW,
    MER_PRIORITY_MEDIUM,
    MER_PRIORITY_HIGH,
    MER_PRIORITY_CRITICAL,
)
from improvement.exceptions import (
    MERNotFoundError, InvalidStatusTransitionError, ImprovementValidationError,
)
from improvement.models import ManufacturingEngineeringRequest
from improvement.services.application.mer_service import MERService


# ── Seed data definitions ──

SAMPLE_MERS = [
    # ── ENGINEERING CHANGE requests ──
    {
        "title": "Press Brake Die Change System Upgrade",
        "description": (
            "Upgrade the hydraulic quick-change die system on the Amada HG-1303 "
            "press brake to reduce die changeover time from 45 min to under 10 min. "
            "Includes new hydraulic clamping cylinders, die cart retrofit, and "
            "PLC programming for automated die recognition."
        ),
        "request_type": MER_TYPE_ENGINEERING_CHANGE,
        "category": "PRODUCTIVITY",
        "priority": MER_PRIORITY_HIGH,
        "submitted_by": "Carlos Mendez",
        "assigned_to": "Engineering Team A",
        "target_type": "ResourceGroup",
        "impact_cost": "Reduces downtime by 35 hrs/month → $12K/mo savings",
        "impact_quality": "Consistent die alignment reduces scrap rate by 8%",
        "impact_delivery": "Faster changeovers improve on-time delivery by 5%",
        "impact_safety": "Eliminates manual die lifting — reduces MSD risk",
        "estimated_cost": Decimal("45000.00"),
        "start_date": date.today() - timedelta(days=10),
        "due_date": date.today() + timedelta(days=20),
    },
    {
        "title": "Welding Robot Torch Alignment Calibration Fixture",
        "description": (
            "Design and build a precision calibration fixture for the Fanuc ARC Mate "
            "robots to standardize torch tip alignment. Current manual alignment "
            "causes inconsistent weld bead quality."
        ),
        "request_type": MER_TYPE_ENGINEERING_CHANGE,
        "category": "QUALITY",
        "priority": MER_PRIORITY_MEDIUM,
        "submitted_by": "Ana Rodriguez",
        "target_type": "Resource",
        "impact_cost": "Reduces torch replacement from monthly to quarterly ($3K/yr savings)",
        "impact_quality": "Weld reject rate drops from 4.2% to <1%",
        "impact_delivery": "Fewer rework cycles saves 2 hrs/week production time",
        "estimated_cost": Decimal("8500.00"),
        "start_date": date.today() - timedelta(days=5),
        "due_date": date.today() + timedelta(days=30),
    },
    {
        "title": "Assembly Line Conveyor Speed Optimization",
        "description": (
            "Reprogram the Siemens S7-1500 PLC controlling the main assembly "
            "conveyor to implement variable speed zones. Current fixed speed "
            "creates bottlenecks at the torquing station."
        ),
        "request_type": MER_TYPE_ENGINEERING_CHANGE,
        "category": "DELIVERY",
        "priority": MER_PRIORITY_CRITICAL,
        "submitted_by": "Miguel Torres",
        "assigned_to": "Controls Engineering",
        "target_type": "ProductionLine",
        "impact_cost": "Increases throughput by 12% → $45K/mo additional revenue",
        "impact_quality": "Gentler handling reduces cosmetic damage by 60%",
        "impact_delivery": "Bottleneck elimination improves cycle time by 18%",
        "impact_safety": "Slower zone near human operators reduces pinch-point risk",
        "estimated_cost": Decimal("12000.00"),
        "start_date": date.today() - timedelta(days=15),
        "due_date": date.today() + timedelta(days=5),
    },

    # ── TOOLING requests ──
    {
        "title": "New Stamping Die for Bracket Assembly",
        "description": (
            "Commission a new progressive stamping die for the MB-2240 mounting "
            "bracket. Current die is worn beyond regrind limits and producing "
            "parts out of tolerance on the flange radii."
        ),
        "request_type": MER_TYPE_TOOLING,
        "category": "QUALITY",
        "priority": MER_PRIORITY_HIGH,
        "submitted_by": "Roberto García",
        "target_type": "ResourceGroup",
        "impact_cost": "New die costs $28K but eliminates $6K/mo in scrap",
        "impact_quality": "Current die producing 12% scrap; new die target <1%",
        "impact_delivery": "Current die failure risk threatens Q3 deliveries",
        "estimated_cost": Decimal("28000.00"),
        "start_date": date.today() - timedelta(days=3),
        "due_date": date.today() + timedelta(days=45),
    },
    {
        "title": "CNC Lathe Tooling Package for New Alloy",
        "description": (
            "Procure ceramic and CBN inserts rated for Inconel 718 machining. "
            "Current carbide inserts achieve only 15-min tool life on the new "
            "superalloy component."
        ),
        "request_type": MER_TYPE_TOOLING,
        "category": "COST",
        "priority": MER_PRIORITY_MEDIUM,
        "submitted_by": "Fernando López",
        "target_type": "Resource",
        "impact_cost": "Ceramic inserts extend tool life 10x → $4K/mo savings",
        "impact_quality": "Better surface finish eliminates secondary grinding",
        "impact_delivery": "Uninterrupted machining avoids 4-hr daily downtime",
        "estimated_cost": Decimal("6200.00"),
        "due_date": date.today() + timedelta(days=14),
    },
    {
        "title": "Fixture Replacement for Sub-Assembly Station",
        "description": (
            "Replace the worn pneumatic clamping fixture on Sub-Assembly Bench #2. "
            "Current fixture has excessive play causing 3° angular misalignment "
            "on the control module mount."
        ),
        "request_type": MER_TYPE_TOOLING,
        "category": "MAINTENANCE",
        "priority": MER_PRIORITY_LOW,
        "submitted_by": "Diego Hernández",
        "target_type": "Resource",
        "impact_quality": "Eliminates angular misalignment (currently 3° → <0.5°)",
        "estimated_cost": Decimal("3800.00"),
        "due_date": date.today() + timedelta(days=60),
    },

    # ── PROCESS IMPROVEMENT requests ──
    {
        "title": "5S Implementation in Pipe Bending Area",
        "description": (
            "Conduct full 5S event in the pipe cutting and bending zone. "
            "Current state: tools scattered across 3 stations, average 12-min "
            "search time per shift for dies and gauges."
        ),
        "request_type": MER_TYPE_PROCESS_IMPROVEMENT,
        "category": "PRODUCTIVITY",
        "priority": MER_PRIORITY_MEDIUM,
        "submitted_by": "Laura Sánchez",
        "assigned_to": "Lean Manufacturing Team",
        "target_type": "Department",
        "impact_cost": "Recovers 48 hrs/month of productive time ($2.4K/mo)",
        "impact_safety": "Reduces trip hazards and improves emergency egress",
        "estimated_cost": Decimal("2500.00"),
        "start_date": date.today() + timedelta(days=7),
        "due_date": date.today() + timedelta(days=21),
    },
    {
        "title": "Standard Work Instructions for Harness Assembly",
        "description": (
            "Develop standardized work instructions with visual aids for the "
            "wire harness assembly process. Current tribal knowledge approach "
            "causes operator-dependent quality variation."
        ),
        "request_type": MER_TYPE_PROCESS_IMPROVEMENT,
        "category": "QUALITY",
        "priority": MER_PRIORITY_HIGH,
        "submitted_by": "Sofia Ramírez",
        "target_type": "ResourceGroup",
        "impact_quality": "Standardizes work → reduces first-pass yield defects by 25%",
        "impact_delivery": "New operator ramp-up time from 3 weeks to 1 week",
        "estimated_cost": Decimal("1800.00"),
        "due_date": date.today() + timedelta(days=28),
    },
    {
        "title": "Kanban System for Consumable Replenishment",
        "description": (
            "Implement two-bin kanban system for consumables (fasteners, sealant, "
            "adhesive) across all assembly stations. Current system uses fixed "
            "weekly orders causing stockouts and excess inventory."
        ),
        "request_type": MER_TYPE_PROCESS_IMPROVEMENT,
        "category": "COST",
        "priority": MER_PRIORITY_LOW,
        "submitted_by": "Alejandro Cruz",
        "target_type": "Plant",
        "impact_cost": "Reduces consumable inventory by 30% ($8K freed capital)",
        "impact_delivery": "Eliminates stockout-caused line stoppages (2 hrs/month)",
        "estimated_cost": Decimal("1200.00"),
        "due_date": date.today() + timedelta(days=42),
    },

    # ── EQUIPMENT MODIFICATION requests ──
    {
        "title": "Laser Cutter Exhaust Filtration Upgrade",
        "description": (
            "Install HEPA + activated carbon filtration on the Trumpf TruLaser "
            "3030 exhaust system. Current single-stage filter does not meet new "
            "OSHA PEL for zinc oxide fumes from galvanized cutting."
        ),
        "request_type": MER_TYPE_EQUIPMENT_MODIFICATION,
        "category": "SAFETY",
        "priority": MER_PRIORITY_CRITICAL,
        "submitted_by": "Miguel Torres",
        "assigned_to": "Facilities & EHS",
        "target_type": "Resource",
        "impact_safety": "Critical — current exposure exceeds OSHA PEL by 2.5x",
        "impact_quality": "Cleaner air reduces oxidation defects on cut edges",
        "estimated_cost": Decimal("18000.00"),
        "start_date": date.today() - timedelta(days=2),
        "due_date": date.today() + timedelta(days=10),
    },
    {
        "title": "Paint Booth Airflow Balancing",
        "description": (
            "Rebalance downdraft airflow in Powder Coating Booth #1. CFD analysis "
            "shows dead zones in corners causing uneven powder distribution on "
            "large flat parts."
        ),
        "request_type": MER_TYPE_EQUIPMENT_MODIFICATION,
        "category": "QUALITY",
        "priority": MER_PRIORITY_MEDIUM,
        "submitted_by": "Ana Rodriguez",
        "target_type": "Resource",
        "impact_quality": "Eliminates thin-coat zones → reduces re-spray by 15%",
        "impact_safety": "Improved ventilation reduces powder accumulation on floor",
        "estimated_cost": Decimal("9500.00"),
        "due_date": date.today() + timedelta(days=35),
    },
    {
        "title": "Hydraulic Press Safety Light Curtain Retrofit",
        "description": (
            "Retrofit 200-ton hydraulic press with SICK deTec4 light curtains "
            "and safety-rated monitored stop. Current two-hand control does not "
            "comply with updated ANSI B11.2 standard."
        ),
        "request_type": MER_TYPE_EQUIPMENT_MODIFICATION,
        "category": "SAFETY",
        "priority": MER_PRIORITY_CRITICAL,
        "submitted_by": "Carlos Mendez",
        "assigned_to": "Controls Engineering",
        "target_type": "Resource",
        "impact_safety": "Mandatory — non-compliance risk: OSHA citation + production halt",
        "impact_quality": "Automatic part presence detection reduces misloads",
        "estimated_cost": Decimal("22000.00"),
        "start_date": date.today(),
        "due_date": date.today() + timedelta(days=15),
    },

    # ── Requests at different workflow stages ──
    {
        "title": "CNC Program Library Consolidation",
        "description": (
            "Migrate all CNC programs from individual machine memory to a "
            "central DNC server with version control. Currently 40% of programs "
            "have no backup."
        ),
        "request_type": MER_TYPE_ENGINEERING_CHANGE,
        "category": "MAINTENANCE",
        "priority": MER_PRIORITY_MEDIUM,
        "submitted_by": "Fernando López",
        "target_type": "Department",
        "impact_cost": "Prevents $20K+ loss from program corruption/loss",
        "estimated_cost": Decimal("15000.00"),
        "due_date": date.today() + timedelta(days=60),
    },
    {
        "title": "Automated Leak Test Station for Hydraulic Cylinders",
        "description": (
            "Build automated pressure decay leak test station to replace manual "
            "soap-bubble testing on hydraulic cylinder assemblies. Current method "
            "takes 8 min/cycle and misses slow leaks."
        ),
        "request_type": MER_TYPE_EQUIPMENT_MODIFICATION,
        "category": "QUALITY",
        "priority": MER_PRIORITY_HIGH,
        "submitted_by": "Roberto García",
        "target_type": "ProductionLine",
        "impact_quality": "Detects leaks down to 0.1 cc/min (current: 5 cc/min)",
        "impact_delivery": "Test time reduced from 8 min to 2 min per cylinder",
        "estimated_cost": Decimal("35000.00"),
        "due_date": date.today() + timedelta(days=40),
    },
]


class Command(BaseCommand):
    help = (
        "Seed sample Manufacturing Engineering Request data for testing/demo. "
        "Creates MERs across all request types, statuses, priorities, and categories."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all existing MERs before seeding",
        )
        parser.add_argument(
            "--count", type=int, default=0,
            help="Override number of MERs to create (0 = use built-in sample data)",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("  MER SEED COMMAND"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        # ── Optional cleanup ──
        if options["clear"]:
            count = ManufacturingEngineeringRequest.objects.count()
            ManufacturingEngineeringRequest.objects.all().delete()
            self.stdout.write(f"  Cleared {count} existing MERs")

        service = MERService()
        created = 0
        skipped = 0

        # Determine which MERs to create
        seed_data = SAMPLE_MERS[:options["count"]] if options["count"] > 0 else SAMPLE_MERS

        # ── Create MERs via service to get proper mer_code generation ──
        self.stdout.write(f"\nCreating {len(seed_data)} sample MERs...\n")

        # Status assignments to distribute MERs across all workflow stages
        # We'll create them as SUBMITTED then transition selected ones
        status_transitions = {
            # index: list of transition methods to call
            0: ["review", "approve", "start"],               # → IN_PROGRESS
            1: ["review", "approve", "start", "complete"],    # → COMPLETED
            2: ["review", "approve"],                         # → APPROVED
            3: ["review", "approve", "start"],                # → IN_PROGRESS
            4: ["reject"],                                    # → REJECTED
            5: ["review"],                                    # → UNDER_REVIEW
            6: [],                                            # SUBMITTED
            7: ["review", "approve", "start", "complete"],    # → COMPLETED
            8: ["review", "approve"],                         # → APPROVED
            9: [],                                            # SUBMITTED
            10: ["review", "reject"],                         # → REJECTED
            11: ["review", "approve", "start", "complete"],   # → COMPLETED
            12: ["review", "approve"],                        # → APPROVED
            13: ["review", "approve", "start"],               # → IN_PROGRESS
            14: ["review"],                                   # → UNDER_REVIEW
        }

        for i, data in enumerate(seed_data):
            # Use savepoint so each MER is independent
            sid = transaction.savepoint()
            try:
                mer = service.create_mer(**data)
                created += 1
                self.stdout.write(
                    f"  [{mer.mer_code}] {mer.title} "
                    f"({mer.request_type}, {mer.priority})"
                )

                # Apply status transitions
                transitions = status_transitions.get(i, [])
                for transition in transitions:
                    if transition == "review":
                        service.review_mer(mer.id)
                        service.update_mer(mer.id, reviewer="System Admin",
                                           review_notes="Auto-reviewed for demo")
                    elif transition == "approve":
                        service.approve_mer(mer.id,
                                            review_notes="Approved — good ROI and safety impact")
                        service.update_mer(mer.id, reviewer="Plant Manager")
                    elif transition == "reject":
                        service.reject_mer(mer.id,
                                           reason="Deferred to next quarter due to budget constraints")
                    elif transition == "start":
                        service.start_mer(mer.id)
                    elif transition == "complete":
                        service.complete_mer(
                            mer.id,
                            result_summary="Completed successfully. All acceptance criteria met.",
                        )
                        service.update_mer(mer.id,
                            lessons_learned="Standard approach worked well; consider for similar future requests.",
                        )

                # Log final status
                refreshed = ManufacturingEngineeringRequest.objects.get(id=mer.id)
                self.stdout.write(
                    f"    => Status: {refreshed.status}"
                )

            except (InvalidStatusTransitionError, MERNotFoundError, ImprovementValidationError, IntegrityError) as e:
                transaction.savepoint_rollback(sid)
                skipped += 1
                self.stdout.write(
                    self.style.WARNING(f"  SKIP '{data['title'][:50]}': {e}")
                )

        # ── Summary ──
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("  SEED COMPLETE"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Created:          {created} MERs")
        if skipped:
            self.stdout.write(f"  Skipped:          {skipped}")
        self.stdout.write("")

        # Status breakdown
        statuses = {}
        for status_code, _ in ManufacturingEngineeringRequest._meta.get_field("status").choices:
            count = ManufacturingEngineeringRequest.objects.filter(status=status_code).count()
            if count:
                statuses[status_code] = count

        self.stdout.write("  Status breakdown:")
        for status, count in sorted(statuses.items()):
            self.stdout.write(f"    {status:20s}: {count}")

        # Type breakdown
        self.stdout.write("\n  Type breakdown:")
        for type_code in [
            MER_TYPE_ENGINEERING_CHANGE,
            MER_TYPE_TOOLING,
            MER_TYPE_PROCESS_IMPROVEMENT,
            MER_TYPE_EQUIPMENT_MODIFICATION,
        ]:
            count = ManufacturingEngineeringRequest.objects.filter(
                request_type=type_code
            ).count()
            if count:
                self.stdout.write(f"    {type_code:30s}: {count}")

        # Priority breakdown
        self.stdout.write("\n  Priority breakdown:")
        for priority in [MER_PRIORITY_CRITICAL, MER_PRIORITY_HIGH, MER_PRIORITY_MEDIUM, MER_PRIORITY_LOW]:
            count = ManufacturingEngineeringRequest.objects.filter(priority=priority).count()
            if count:
                self.stdout.write(f"    {priority:20s}: {count}")

        total = ManufacturingEngineeringRequest.objects.count()
        self.stdout.write(f"\n  Total MERs in database: {total}")
        self.stdout.write(self.style.SUCCESS("=" * 60))
