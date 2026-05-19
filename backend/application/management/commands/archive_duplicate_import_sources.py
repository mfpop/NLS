from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from typing import Dict, List, Tuple

from application.models import ImportSourceConfig
from manufacturing.models import ImportJob


class Command(BaseCommand):
    help = "Archive duplicate active ImportSourceConfig records. Keeps referenced or newest record active."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", dest="dry_run", help="Do not persist changes; just report")

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        self.stdout.write("Scanning for duplicate active import sources...")

        # Collect active, non-archived sources
        qs = ImportSourceConfig.objects.filter(is_active=True, is_archived=False).order_by("domain", "name", "-created_at")
        by_name: Dict[Tuple[str, str], List[ImportSourceConfig]] = {}
        by_fields: Dict[Tuple[str, str, str, str], List[ImportSourceConfig]] = {}

        for src in qs:
            key_name = (src.domain, (src.name or "").strip().lower())
            by_name.setdefault(key_name, []).append(src)
            key_fields = (src.domain, src.source_type, (src.path or "").strip(), (src.file_pattern or "").strip())
            by_fields.setdefault(key_fields, []).append(src)

        to_archive_ids = set()

        # First, handle duplicates by name within domain
        for key, items in by_name.items():
            if len(items) <= 1:
                continue
            keep = self._select_keep(items)
            self.stdout.write(f"Duplicate by name {key}: keeping {keep.id}, archiving {[i.id for i in items if i.id != keep.id]}")
            for i in items:
                if i.id != keep.id:
                    to_archive_ids.add(i.id)

        # Then handle duplicates by fields (domain+type+path+pattern)
        for key, items in by_fields.items():
            if len(items) <= 1:
                continue
            keep = self._select_keep(items)
            self.stdout.write(f"Duplicate by fields {key}: keeping {keep.id}, archiving {[i.id for i in items if i.id != keep.id]}")
            for i in items:
                if i.id != keep.id:
                    to_archive_ids.add(i.id)

        if not to_archive_ids:
            self.stdout.write("No duplicates found.")
            return

        self.stdout.write(f"Found {len(to_archive_ids)} duplicate active import source(s) to archive.")

        if dry_run:
            for id in to_archive_ids:
                self.stdout.write(f"Would archive: {id}")
            return

        # Archive duplicates transactionally
        with transaction.atomic():
            for id in to_archive_ids:
                src = ImportSourceConfig.objects.select_for_update().get(id=id)
                src.is_archived = True
                src.is_active = False
                src.save(update_fields=["is_archived", "is_active", "updated_at"]) 
                self.stdout.write(f"Archived: {id}")

        self.stdout.write("Archive complete.")

    def _select_keep(self, items: List[ImportSourceConfig]) -> ImportSourceConfig:
        # Prefer item referenced by import jobs
        ids = [i.id for i in items]
        ref = ImportJob.objects.filter(source_config_id__in=ids).order_by("-created_at").first()
        if ref:
            # keep the referenced source
            for i in items:
                if i.id == ref.source_config_id:
                    return i
        # Otherwise, keep the newest (items were ordered by -created_at in collection)
        # items list is appended in query order (domain,name,-created_at), so pick first
        return items[0]
