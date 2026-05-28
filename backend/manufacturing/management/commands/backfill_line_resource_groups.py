from django.core.management.base import BaseCommand
from django.db import transaction

from manufacturing.models import (
    Department, ProductionLine, ProductionLineDepartmentAssignment,
    ProductionLineResourceGroup, ResourceGroup,
)


class Command(BaseCommand):
    help = "Backfill ProductionLineResourceGroup records from legacy ProductionLineDepartmentAssignment"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be done without making changes",
        )
        parser.add_argument(
            "--production-line-id",
            type=str,
            help="Restrict to a single production line ID",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        line_id_filter = options.get("production_line_id")

        qs = ProductionLineDepartmentAssignment.objects.filter(
            status__in=("ACTIVE",),
        ).select_related(
            "production_line", "department",
        ).order_by("production_line_id", "sequence", "id")

        if line_id_filter:
            qs = qs.filter(production_line_id=line_id_filter)

        total_created = 0
        total_skipped_existing = 0
        total_skipped_dept_mismatch = 0
        total_skipped_no_rgs = 0
        processed_lines = set()

        for assignment in qs:
            line = assignment.production_line
            dept = assignment.department
            pl_id = line.id

            if line.plant_id != dept.plant_id:
                total_skipped_dept_mismatch += 1
                self.stdout.write(
                    f"  SKIP (cross-plant): Line '{line.name}' (plant {line.plant_id}) "
                    f"≠ Dept '{dept.name}' (plant {dept.plant_id})"
                )
                continue

            active_rgs = list(
                ResourceGroup.objects.filter(
                    department=dept, status="ACTIVE",
                ).order_by("code", "name")
            )
            if not active_rgs:
                total_skipped_no_rgs += 1
                continue

            existing_seq = ProductionLineResourceGroup.objects.filter(
                production_line=line,
            ).order_by("-sequence").values_list("sequence", flat=True).first() or 0

            created_count = 0
            skipped_existing = 0
            for rg in active_rgs:
                exists = ProductionLineResourceGroup.objects.filter(
                    production_line=line,
                    resource_group=rg,
                ).exists()
                if exists:
                    skipped_existing += 1
                    continue
                existing_seq += 1
                if not dry_run:
                    ProductionLineResourceGroup.objects.create(
                        production_line=line,
                        resource_group=rg,
                        sequence=existing_seq,
                        is_active=True,
                    )
                created_count += 1

            if pl_id not in processed_lines:
                processed_lines.add(pl_id)
                if created_count or skipped_existing:
                    action = "WOULD CREATE" if dry_run else "CREATED"
                    self.stdout.write(
                        f"Line '{line.name}' (id={pl_id}): {created_count} {action}, "
                        f"{skipped_existing} skipped (already exist)"
                    )

            total_created += created_count
            total_skipped_existing += skipped_existing

        self.stdout.write("---")
        self.stdout.write(
            f"Total: {total_created} {'would be' if dry_run else ''} created, "
            f"{total_skipped_existing} skipped (existing), "
            f"{total_skipped_dept_mismatch} skipped (cross-plant), "
            f"{total_skipped_no_rgs} skipped (no active RGs)"
        )
