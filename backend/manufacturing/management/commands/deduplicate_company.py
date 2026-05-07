from django.core.management.base import BaseCommand
from manufacturing.models.company import Company


class Command(BaseCommand):
    help = "Ensure only one company exists (delete duplicates, keep the first)"

    def handle(self, *args, **options):
        companies = list(Company.objects.all().order_by("id"))
        if len(companies) <= 1:
            self.stdout.write(f"OK — {len(companies)} company found")
            return
        keep = companies[0]
        deleted = 0
        for c in companies[1:]:
            c.delete()
            deleted += 1
        self.stdout.write(self.style.SUCCESS(f"Kept {keep.name} (ID {keep.id}), deleted {deleted} duplicate(s)"))
