from __future__ import annotations

import csv
import logging
import os
from dataclasses import dataclass
from typing import Any

from django.db import transaction
from django.utils import timezone

from data_management.models import ErpPattern, ErpPatternMapping, ErpSourceFile, ErpImportLog
from data_management.services.erp_import_validation_service import (
    ErpImportValidationService,
    ValidationResult,
    VALIDATION_STATUS_READY,
)

logger = logging.getLogger(__name__)


@dataclass
class ImportResult:
    pattern_id: int
    pattern_name: str
    status: str
    rows_added: int
    rows_updated: int
    rows_not_updated: int
    rows_failed: int
    error_message: str = ""


class ErpImportError(ValueError):
    def __init__(self, field: str, code: str, message: str):
        super().__init__(message)
        self.field = field
        self.code = code
        self.message = message


class ErpImportService:

    @staticmethod
    @transaction.atomic
    def execute_import(
        pattern_id: int,
        user: str = "",
        confirmed: bool = False,
    ) -> ImportResult:
        if not confirmed:
            raise ErpImportError("confirmed", "REQUIRED", "Import requires confirmed=True")

        from data_management.services.erp_pattern_service import ErpPatternService
        pattern = ErpPatternService.get_pattern(pattern_id)

        validation = ErpImportValidationService.validate_pattern(pattern_id)
        if validation.status != VALIDATION_STATUS_READY:
            error_msg = "; ".join(validation.errors) if validation.errors else f"Validation status: {validation.status}"
            log = ErpImportLog.objects.create(
                pattern=pattern,
                source_file=validation.source_file,
                source_file_name=validation.source_file.original_name if validation.source_file else "",
                pattern_name_snapshot=pattern.name,
                destination_entity_snapshot=pattern.destination_entity,
                status="FAILED",
                rows_total=0,
                rows_added=0,
                rows_updated=0,
                rows_not_updated=0,
                rows_failed=0,
                error_message=error_msg,
                started_at=timezone.now(),
                completed_at=timezone.now(),
            )
            return ImportResult(
                pattern_id=pattern.id,
                pattern_name=pattern.name,
                status="FAILED",
                rows_added=0,
                rows_updated=0,
                rows_not_updated=0,
                rows_failed=0,
                error_message=error_msg,
            )

        source_file = validation.source_file
        started_at = timezone.now()

        try:
            added, updated, not_updated, failed = ErpImportService._apply_import(pattern, source_file)
            status = "IMPORTED"
            error_message = ""
        except Exception as e:
            added = updated = not_updated = failed = 0
            status = "FAILED"
            error_message = str(e)
            logger.exception("Import failed for pattern %s (id=%s)", pattern.name, pattern.id)

        completed_at = timezone.now()
        rows_total = added + updated + not_updated + failed

        ErpImportLog.objects.create(
            pattern=pattern,
            source_file=source_file,
            source_file_name=source_file.original_name if source_file else "",
            pattern_name_snapshot=pattern.name,
            destination_entity_snapshot=pattern.destination_entity,
            status=status,
            rows_total=rows_total,
            rows_added=added,
            rows_updated=updated,
            rows_not_updated=not_updated,
            rows_failed=failed,
            error_message=error_message,
            started_at=started_at,
            completed_at=completed_at,
        )

        if source_file:
            source_file.status = "IMPORTED" if status == "IMPORTED" else "FAILED"
            source_file.save(update_fields=["status"])

        return ImportResult(
            pattern_id=pattern.id,
            pattern_name=pattern.name,
            status=status,
            rows_added=added,
            rows_updated=updated,
            rows_not_updated=not_updated,
            rows_failed=failed,
            error_message=error_message,
        )

    @staticmethod
    def _apply_import(
        pattern: ErpPattern,
        source_file: ErpSourceFile,
    ) -> tuple[int, int, int, int]:
        headers = ErpImportValidationService.parse_file_headers(source_file)
        mappings = list(pattern.field_mappings.all().order_by("order"))

        header_map: dict[str, str] = {}
        for m in mappings:
            header_map[m.source_name.strip().lower()] = m.destination_name

        ext = os.path.splitext(source_file.file_path)[1].lower()
        rows_added = 0
        rows_updated = 0
        rows_not_updated = 0
        rows_failed = 0

        if ext in (".csv", ".tsv"):
            delimiter = "\t" if ext == ".tsv" else ","
            with open(source_file.file_path, newline="", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f, delimiter=delimiter)
                for row in reader:
                    try:
                        normalized = {k.strip().lower(): v for k, v in row.items()}
                        mapped = {}
                        for src_name, dst_name in header_map.items():
                            val = normalized.get(src_name, "")
                            if val is not None and val.strip():
                                mapped[dst_name] = val.strip()
                        if mapped:
                            rows_added += 1
                        else:
                            rows_not_updated += 1
                    except Exception:
                        rows_failed += 1
        elif ext in (".xlsx", ".xls"):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(source_file.file_path, read_only=True, data_only=True)
                ws = wb.active
                if ws is not None:
                    rows_iter = iter(ws.iter_rows(values_only=True))
                    header_row = next(rows_iter, None)
                    if header_row:
                        col_index: dict[int, str] = {}
                        for idx, cell in enumerate(header_row):
                            if cell is not None:
                                norm = str(cell).strip().lower()
                                if norm in header_map:
                                    col_index[idx] = header_map[norm]
                        for row_values in rows_iter:
                            try:
                                mapped = {}
                                for idx, dst_name in col_index.items():
                                    if idx < len(row_values) and row_values[idx] is not None:
                                        val = str(row_values[idx]).strip()
                                        if val:
                                            mapped[dst_name] = val
                                if mapped:
                                    rows_added += 1
                                else:
                                    rows_not_updated += 1
                            except Exception:
                                rows_failed += 1
                wb.close()
            except Exception:
                rows_failed = 1
        else:
            rows_failed = 1

        if rows_failed > 0 and rows_added == 0 and rows_updated == 0 and rows_not_updated == 0:
            raise ErpImportError("file", "IMPORT_FAILED", "Failed to process source file")

        return rows_added, rows_updated, rows_not_updated, rows_failed
