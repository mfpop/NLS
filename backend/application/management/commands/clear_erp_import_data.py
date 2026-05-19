from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from application.models import ImportSourceConfig
from manufacturing.models import ImportJob
from manufacturing.models.integration import ImportCompareResult, ImportAuditLog, ImportValidationError


class Command(BaseCommand):
    help = "Delete all ImportJob and ImportSourceConfig records (including related validation errors, compare results, audit logs)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true", dest="dry_run", help="Count records without deleting"
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)

        counts = {
            "ImportAuditLog": ImportAuditLog.objects.count(),
            "ImportCompareResult": ImportCompareResult.objects.count(),
            "ImportValidationError": ImportValidationError.objects.count(),
            "ImportJob": ImportJob.objects.count(),
            "ImportSourceConfig": ImportSourceConfig.objects.count(),
        }

        total = sum(counts.values())

        self.stdout.write("Records to be deleted:")
        for model, count in counts.items():
            self.stdout.write(f"  {model}: {count}")
        self.stdout.write(f"  Total: {total}")

        if total == 0:
            self.stdout.write("No records to delete.")
            return

        if dry_run:
            self.stdout.write("Dry run - no changes made.")
            return

        with transaction.atomic():
            ImportJob.objects.all().delete()
            ImportSourceConfig.objects.all().delete()

        self.stdout.write(self.style.SUCCESS(f"Deleted {total} records successfully."))
