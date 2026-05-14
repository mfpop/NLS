from django.core.management.base import BaseCommand
from django.db import transaction

# pylint: disable=no-member

from manufacturing.models import Department, ProductionLine, ProductionLineDepartmentAssignment


LINE_DEPARTMENTS = {
    "C2-CA": ["ASM", "MCH", "QC"],
    "C2-PU": ["ASM", "MCH", "WLD", "QC"],
    "MLA-PU": ["ASM", "WLD", "PKG", "QC"],
    "AS-HA": ["ASM", "QC"],
    "P-1": ["MCH", "WLD", "QC"],
    "K-1": ["LOG", "PKG"],
    "LN-B2": ["LOG"],
    "LN-C2": ["QC"],
}

DUPLICATE_LINE_CANONICAL_CODES = {
    "Line B (Shared)": "LN-B2",
    "Line C (Quality)": "LN-C2",
}


class Command(BaseCommand):
    help = "Repair production flow tree assignments: line -> departments -> groups -> resources"

    @transaction.atomic
    def handle(self, *args, **options):
        created = 0
        removed = 0
        deduped = 0
        missing_lines: list[str] = []
        missing_departments: list[str] = []

        for line_name, canonical_code in DUPLICATE_LINE_CANONICAL_CODES.items():
            canonical = ProductionLine.objects.filter(name=line_name, code=canonical_code).first()
            if not canonical:
                continue
            duplicates = list(ProductionLine.objects.filter(name=line_name).exclude(pk=canonical.pk))
            for duplicate in duplicates:
                assignments = list(ProductionLineDepartmentAssignment.objects.filter(production_line=duplicate))
                for assignment in assignments:
                    exists = ProductionLineDepartmentAssignment.objects.filter(
                        production_line=canonical,
                        department=assignment.department,
                    ).exists()
                    if exists:
                        assignment.delete()
                    else:
                        assignment.production_line = canonical
                        assignment.save(update_fields=["production_line"])
                duplicate.delete()
                deduped += 1

        for line_code, dept_codes in LINE_DEPARTMENTS.items():
            line = ProductionLine.objects.filter(code=line_code).first()
            if not line:
                missing_lines.append(line_code)
                continue

            wanted_ids = set()
            for sequence, dept_code in enumerate(dept_codes, start=1):
                dept = Department.objects.filter(code=dept_code).first()
                if not dept:
                    missing_departments.append(dept_code)
                    continue
                wanted_ids.add(dept.id)
                _, was_created = ProductionLineDepartmentAssignment.objects.update_or_create(
                    production_line=line,
                    department=dept,
                    defaults={"sequence": sequence, "status": "ACTIVE"},
                )
                if was_created:
                    created += 1

            stale = ProductionLineDepartmentAssignment.objects.filter(production_line=line).exclude(
                department_id__in=wanted_ids
            )
            removed += stale.count()
            stale.delete()

        if missing_lines:
            self.stdout.write(self.style.WARNING(f"Missing production line(s): {', '.join(sorted(set(missing_lines)))}"))
        if missing_departments:
            self.stdout.write(self.style.WARNING(f"Missing department(s): {', '.join(sorted(set(missing_departments)))}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Production flow tree repaired; created {created} assignment(s), removed {removed} stale assignment(s)."
                f" Deduplicated {deduped} production line(s)."
            )
        )
