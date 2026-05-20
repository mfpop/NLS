from __future__ import annotations

import os
import json
import logging
from dataclasses import dataclass
from django.utils import timezone
from pathlib import Path

from django.core.files.storage import default_storage
from django.db import transaction

from application.models import ImportSourceConfig
from manufacturing.models import ImportJob, ImportValidationError, ImportCompareResult
from manufacturing.domain.file_parser_service import FileParserService, FileParserError
from manufacturing.domain.domain_import_handler import get_handler, ValidationIssue, CompareRow, ApplyResult


def _normalize_field(name: str) -> str:
    return name.strip().lower().replace(" ", "").replace("_", "").replace("-", "")


def _get_unmapped_required_errors(
    parse_result, domain: str
) -> list[ValidationIssue]:
    """Check if required mapping rules have matching columns in parsed data."""
    from manufacturing.models import MappingRule

    required_rules = MappingRule.objects.filter(domain=domain, is_active=True, is_required=True)
    rule_norm: dict[str, MappingRule] = {}
    for r in required_rules:
        key = _normalize_field(r.source_field)
        if key not in rule_norm:
            rule_norm[key] = r

    issues: list[ValidationIssue] = []
    for sheet in parse_result.sheets:
        seen_norm = {_normalize_field(h) for h in sheet.column_headers}
        for norm_key, rule in rule_norm.items():
            if norm_key not in seen_norm:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name,
                    row_number=0,
                    entity_type="Mapping",
                    field_name=rule.source_field,
                    error_code="MAPPING_REQUIRED",
                    message=f"Required field '{rule.source_field}' has no matching column in the file. "
                            f"It must map to '{rule.destination_field}'.",
                    raw_value=None,
                ))
    return issues


logger = logging.getLogger(__name__)


@dataclass
class ErpImportError(Exception):
    field: str | None
    code: str
    message: str


WORKFLOW_TRANSITIONS = {
    "DRAFT": ["PREVIEWED", "PREVIEW_FAILED", "CANCELLED"],
    "FILE_ATTACHED": ["PREVIEWED", "VALIDATED", "PREVIEW_FAILED", "CANCELLED"],
    "PREVIEWED": ["VALIDATED", "VALIDATION_FAILED", "CANCELLED"],
    "VALIDATED": ["COMPARED", "COMPARE_FAILED", "CANCELLED"],
    "COMPARED": ["READY_TO_APPLY", "CANCELLED"],
    "READY_TO_APPLY": ["APPLIED", "APPLY_FAILED", "CANCELLED"],
    "APPLIED": [],
    "PREVIEW_FAILED": ["DRAFT", "CANCELLED"],
    "VALIDATION_FAILED": ["DRAFT", "CANCELLED"],
    "COMPARE_FAILED": ["VALIDATED", "CANCELLED"],
    "APPLY_FAILED": ["READY_TO_APPLY", "CANCELLED"],
    "CANCELLED": [],
    "FAILED": [],
}


def _validate_transition(current: str, target: str) -> None:
    allowed = WORKFLOW_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise ErpImportError(
            "status",
            "INVALID_TRANSITION",
            f"Cannot transition from {current} to {target}",
        )


class ErpImportService:

    @staticmethod
    @transaction.atomic
    def create_job(source_id: str, file_name: str = "", file_path: str = "", triggered_by: str | None = None) -> ImportJob:
        try:
            config = ImportSourceConfig.objects.get(id=source_id)
        except ImportSourceConfig.DoesNotExist as exc:
            raise ErpImportError("sourceId", "NOT_FOUND", "Source config not found") from exc

        job = ImportJob.objects.create(
            source_config=config,
            file_name=file_name or Path(config.path).name or "",
            file_path=file_path or config.path,
            status="DRAFT",
            started_at=timezone.now(),
            triggered_by=triggered_by,
        )
        ErpImportService._audit(job, "CREATED", f"Import job created from source {config.name}")
        return job

    @staticmethod
    @transaction.atomic
    def pick_file(job_id: str, file_name: str, file_path: str) -> ImportJob:
        job = ErpImportService._get_job(job_id)
        job.file_name = file_name
        job.file_path = file_path
        job.save(update_fields=["file_name", "file_path", "updated_at"])
        ErpImportService._audit(job, "FILE_PICKED", f"File selected: {file_name}")
        return job

    @staticmethod
    @transaction.atomic
    def preview_file(job_id: str) -> ImportJob:
        """Read and parse the import file, store preview metadata, and persist results."""
        job = ErpImportService._get_job(job_id)
        if job.status not in ("DRAFT", "FILE_ATTACHED"):
            _validate_transition(job.status, "PREVIEWED")

        if not job.file_name:
            raise ErpImportError("fileName", "REQUIRED", "No file selected for preview")

        file_path = ErpImportService._resolve_file_path(job)
        if not file_path:
            logger.warning("File not found for job %s (status=%s, file_path=%s, file_name=%s)", job.id, job.status, job.file_path, job.file_name)
            raise ErpImportError("filePath", "FILE_NOT_FOUND", f"File not found for job {job.id}")

        logger.debug("Preview resolved path for job %s: %s", job.id, file_path)

        try:
            parse_result = FileParserService.parse(file_path, job.source_config.source_type)
        except FileParserError as exc:
            logger.exception("Preview parse failed for job %s (%s)", job.id, file_path)
            raise ErpImportError("filePath", exc.code, exc.message)
        except Exception as exc:
            logger.exception("Unexpected preview failure for job %s (%s)", job.id, file_path)
            raise ErpImportError("filePath", "PREVIEW_FAILED", f"Preview failed: {exc}")

        # Count total rows processed
        total_rows = parse_result.total_rows_all_sheets
        job.records_processed = total_rows
        job.status = "PREVIEWED"
        job.save(update_fields=["status", "records_processed", "updated_at"])

        # Store preview metadata as audit log
        sheet_names = [s.sheet_name for s in parse_result.sheets]
        column_count = sum(len(s.column_headers) for s in parse_result.sheets) if parse_result.sheets else 0
        ErpImportService._audit(job, "PREVIEWED",
            f"File previewed: {parse_result.file_name}, {total_rows} rows, {len(parse_result.sheets)} sheets, {column_count} columns")

        return job

    @staticmethod
    @transaction.atomic
    def validate_job(job_id: str) -> ImportJob:
        """Parse file, run domain-specific validation, and persist validation errors."""
        job = ErpImportService._get_job(job_id)
        if job.status == "FILE_ATTACHED":
            job = ErpImportService.preview_file(job_id)
        _validate_transition(job.status, "VALIDATED")

        file_path = ErpImportService._resolve_file_path(job)
        if not file_path:
            raise ErpImportError("filePath", "FILE_NOT_FOUND", f"File not found for job {job.id}")
        if not Path(file_path).exists():
            raise ErpImportError("filePath", "FILE_NOT_FOUND", f"File not found: {file_path}")

        try:
            parse_result = FileParserService.parse(file_path, job.source_config.source_type)
        except FileParserError as exc:
            raise ErpImportError("filePath", exc.code, exc.message)

        domain = job.source_config.domain
        handler = get_handler(domain)

        from manufacturing.models import MappingRule
        mapping_rules = list(MappingRule.objects.filter(domain=domain, is_active=True))

        # Check required mappings before domain validation
        mapping_issues = _get_unmapped_required_errors(parse_result, domain)
        issues = mapping_issues + handler.validate(parse_result.sheets, mapping_rules)

        # Clear previous validation errors and persist new ones
        ImportValidationError.objects.filter(import_job=job).delete()

        if issues:
            for issue in issues:
                ImportValidationError.objects.create(
                    import_job=job,
                    sheet_name=issue.sheet_name,
                    row_number=issue.row_number,
                    entity_type=issue.entity_type,
                    field_name=issue.field_name,
                    error_code=issue.error_code,
                    message=issue.message,
                    raw_value=issue.raw_value,
                )
            job.status = "VALIDATION_FAILED"
            job.error_summary = f"{len(issues)} validation error(s) found"
            job.save(update_fields=["status", "error_summary", "updated_at"])
            ErpImportService._audit(job, "VALIDATION_FAILED", f"Validation failed: {len(issues)} issues")
        else:
            job.status = "VALIDATED"
            job.error_summary = ""
            job.save(update_fields=["status", "error_summary", "updated_at"])
            ErpImportService._audit(job, "VALIDATED", "All data validated successfully")

        return job

    @staticmethod
    @transaction.atomic
    def compare_job(job_id: str) -> ImportJob:
        """Parse file, compare incoming data with existing domain entities, persist results."""
        job = ErpImportService._get_job(job_id)
        _validate_transition(job.status, "COMPARED")

        file_path = ErpImportService._resolve_file_path(job)
        if not file_path:
            raise ErpImportError("filePath", "FILE_NOT_FOUND", f"File not found for job {job.id}")
        if not Path(file_path).exists():
            raise ErpImportError("filePath", "FILE_NOT_FOUND", f"File not found: {file_path}")

        try:
            parse_result = FileParserService.parse(file_path, job.source_config.source_type)
        except FileParserError as exc:
            raise ErpImportError("filePath", exc.code, exc.message)

        domain = job.source_config.domain
        handler = get_handler(domain)

        # Mapping must be resolved before compare
        mapping_issues = _get_unmapped_required_errors(parse_result, domain)
        if mapping_issues:
            raise ErpImportError(
                "mapping",
                "MAPPING_REQUIRED",
                f"Cannot compare: {len(mapping_issues)} required field(s) have no matching column. "
                f"Resolve mapping first.",
            )

        from manufacturing.models import MappingRule
        mapping_rules = list(MappingRule.objects.filter(domain=domain, is_active=True))
        compare_rows = handler.compare(parse_result.sheets, mapping_rules)

        # Clear previous compare results and persist new ones
        ImportCompareResult.objects.filter(import_job=job).delete()

        for cr in compare_rows:
            ImportCompareResult.objects.create(
                import_job=job,
                action=cr.action,
                entity_type=cr.entity_type,
                stable_key=cr.stable_key,
                current_value=cr.current_value or {},
                incoming_value=cr.incoming_value,
                diff=cr.diff,
                status="PENDING",
            )

        creates = sum(1 for r in compare_rows if r.action == "CREATE")
        updates = sum(1 for r in compare_rows if r.action == "UPDATE")
        unchanged = sum(1 for r in compare_rows if r.action == "UNCHANGED")

        job.status = "COMPARED"
        job.records_created = creates
        job.records_updated = updates
        job.save(update_fields=["status", "records_created", "records_updated", "updated_at"])

        ErpImportService._audit(job, "COMPARED",
            f"Compare complete: {creates} to create, {updates} to update, {unchanged} unchanged")
        return job

    @staticmethod
    @transaction.atomic
    def mark_ready(job_id: str) -> ImportJob:
        job = ErpImportService._get_job(job_id)
        _validate_transition(job.status, "READY_TO_APPLY")
        job.status = "READY_TO_APPLY"
        job.save(update_fields=["status", "updated_at"])
        ErpImportService._audit(job, "READY", "Import ready to apply")
        return job

    @staticmethod
    @transaction.atomic
    def apply_job(job_id: str, summary: dict | None = None) -> ImportJob:
        """Apply incoming data by creating/updating domain entities via domain services."""
        job = ErpImportService._get_job(job_id)
        _validate_transition(job.status, "APPLIED")

        # If summary is provided, use it directly (legacy support)
        if summary:
            job.status = "APPLIED"
            job.completed_at = timezone.now()
            job.records_processed = summary.get("records_processed", 0)
            job.records_created = summary.get("records_created", 0)
            job.records_updated = summary.get("records_updated", 0)
            job.records_failed = summary.get("records_failed", 0)
            job.error_summary = summary.get("error_summary", "")
            job.save()
            # Move file to imported/ on success
            try:
                from application.erp_storage_service import ERPStorageService
                imported_path = ERPStorageService.move_to_imported(job.file_path)
                job.imported_file_path = imported_path
                job.save(update_fields=["imported_file_path", "updated_at"])
            except Exception as storage_err:
                logger.warning("Could not move file to imported/: %s", storage_err)
            ErpImportService._audit(job, "APPLIED", f"Import applied: {job.records_created} created, {job.records_updated} updated")
            return job

        # Otherwise, parse the file and apply via domain handlers
        try:
            file_path = ErpImportService._resolve_file_path(job)
            if not file_path:
                raise ErpImportError("filePath", "FILE_NOT_FOUND", f"File not found for job {job.id}")
            if not Path(file_path).exists():
                raise ErpImportError("filePath", "FILE_NOT_FOUND", f"File not found: {file_path}")

            parse_result = FileParserService.parse(file_path, job.source_config.source_type)
            domain = job.source_config.domain
            handler = get_handler(domain)

            # Get compare results for this job
            compare_results = ImportCompareResult.objects.filter(
                import_job=job,
                action__in=["CREATE", "UPDATE"],
            )

            compare_rows = []
            for cr in compare_results:
                    compare_rows.append(CompareRow(
                    action=cr.action,
                    entity_type=cr.entity_type,
                    stable_key=cr.stable_key,
                    current_value=cr.current_value,
                    incoming_value=cr.incoming_value,
                    diff=cr.diff,
                    status="PENDING",
                ))

            apply_result = handler.apply(parse_result.sheets, compare_rows)

            job.status = "APPLIED"
            job.completed_at = timezone.now()
            job.records_processed = parse_result.total_rows_all_sheets
            job.records_created = apply_result.records_created
            job.records_updated = apply_result.records_updated
            job.records_failed = apply_result.records_failed
            job.error_summary = apply_result.error_summary[:500] if apply_result.error_summary else ""
            job.save()

            # Move file to imported/ on success
            try:
                from application.erp_storage_service import ERPStorageService
                imported_path = ERPStorageService.move_to_imported(job.file_path)
                job.imported_file_path = imported_path
                job.save(update_fields=["imported_file_path", "updated_at"])
            except Exception as storage_err:
                logger.warning("Could not move file to imported/: %s", storage_err)

            # Mark compare results as ACCEPTED
            ImportCompareResult.objects.filter(import_job=job, action__in=["CREATE", "UPDATE"]).update(status="ACCEPTED")

            ErpImportService._audit(job, "APPLIED",
                f"Import applied: {apply_result.records_created} created, {apply_result.records_updated} updated, {apply_result.records_failed} failed")

        except Exception as exc:
            job.status = "APPLY_FAILED"
            job.completed_at = timezone.now()
            job.error_summary = str(exc)[:500]
            job.save()
            # Write error artifact
            try:
                from application.erp_storage_service import ERPStorageService
                error_info = {"job_id": str(job.id), "file": job.file_name, "error": str(exc)[:500]}
                if job.file_path:
                    error_path = ERPStorageService.move_to_error(job.file_path, error_info)
                    job.error_artifact_path = error_path
                    job.save(update_fields=["error_artifact_path", "updated_at"])
            except Exception as storage_err:
                logger.warning("Could not move file to error/: %s", storage_err)
            ErpImportService._audit(job, "APPLY_FAILED", f"Apply failed: {exc}")

        return job

    @staticmethod
    @transaction.atomic
    def cancel_job(job_id: str) -> ImportJob:
        job = ErpImportService._get_job(job_id)
        _validate_transition(job.status, "CANCELLED")
        job.status = "CANCELLED"
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "completed_at", "updated_at"])
        ErpImportService._audit(job, "CANCELLED", "Import job cancelled")
        return job

    @staticmethod
    @transaction.atomic
    def fail_job(job_id: str, error_message: str) -> ImportJob:
        job = ErpImportService._get_job(job_id)
        failure_status = {
            "DRAFT": "PREVIEW_FAILED",
            "PREVIEWED": "VALIDATION_FAILED",
            "VALIDATED": "COMPARE_FAILED",
            "COMPARED": "APPLY_FAILED",
            "READY_TO_APPLY": "APPLY_FAILED",
        }.get(job.status, "FAILED")
        job.status = failure_status
        job.completed_at = timezone.now()
        job.error_summary = error_message
        job.save(update_fields=["status", "completed_at", "error_summary", "updated_at"])
        ErpImportService._audit(job, failure_status, f"Job failed: {error_message}")
        return job

    @staticmethod
    @transaction.atomic
    def retry_job(job_id: str) -> ImportJob:
        job = ErpImportService._get_job(job_id)
        if job.status in ("PREVIEW_FAILED", "VALIDATION_FAILED"):
            job.status = "DRAFT"
        elif job.status == "COMPARE_FAILED":
            job.status = "VALIDATED"
        elif job.status == "APPLY_FAILED":
            job.status = "READY_TO_APPLY"
        else:
            raise ErpImportError("status", "INVALID_RETRY", f"Cannot retry job in status {job.status}")
        job.completed_at = None
        job.error_summary = ""
        job.save(update_fields=["status", "completed_at", "error_summary", "updated_at"])
        ErpImportService._audit(job, "RETRY", "Job reset for retry")
        return job

    @staticmethod
    def _get_job(job_id: str) -> ImportJob:
        try:
            return ImportJob.objects.select_related("source_config").get(id=job_id)
        except ImportJob.DoesNotExist as exc:
            raise ErpImportError("id", "NOT_FOUND", "Import job not found") from exc

    @staticmethod
    def _audit(job: ImportJob, action: str, message: str) -> None:
        from manufacturing.models import ImportAuditLog
        ImportAuditLog.objects.create(
            import_job=job,
            action=action,
            user=job.triggered_by or "",
            message=message,
        )

    @staticmethod
    def _resolve_file_path(job: ImportJob) -> str | None:
        if job.file_path:
            try:
                if default_storage.exists(job.file_path):
                    abs_path = default_storage.path(job.file_path)
                    logger.debug("Preview resolved storage path: %s -> %s", job.file_path, abs_path)
                    return str(Path(abs_path))
            except Exception as exc:
                logger.warning("Storage path resolution failed for %s: %s", job.file_path, exc)

            path = Path(job.file_path)
            if path.exists() and path.is_file():
                return str(path)

        if job.file_name:
            joined = os.path.join(job.source_config.path, job.file_name)
            path = Path(joined)
            if path.exists() and path.is_file():
                return str(path)

        path = Path(job.source_config.path)
        if path.exists() and path.is_file():
            return str(path)

        logger.warning("No file path resolved for job %s (file_path=%s, file_name=%s)", job.id, job.file_path, job.file_name)
        return None
