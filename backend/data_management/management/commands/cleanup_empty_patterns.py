from django.core.management.base import BaseCommand

from data_management.models import ErpPattern


class Command(BaseCommand):
    help = "Delete ErpPattern records that have no field mappings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )

    def handle(self, *args, **options):
        empty = ErpPattern.objects.filter(field_mappings__isnull=True)
        count = empty.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No patterns without mappings found"))
            return
        if options["dry_run"]:
            self.stdout.write(f"Would delete {count} pattern(s):")
            for p in empty:
                self.stdout.write(f"  - {p.name} (id={p.id})")
        else:
            deleted = []
            for p in empty:
                deleted.append(f"{p.name} (id={p.id})")
            empty.delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {len(deleted)} pattern(s):"))
            for name in deleted:
                self.stdout.write(f"  - {name}")
