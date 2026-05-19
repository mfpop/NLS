from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime

from django.db import transaction

from application.models import ImportSourceConfig
from manufacturing.models import ImportJob, ImportValidationError


@dataclass
class ErpImportError(Exception):
    field: str | None
    code: str
    message: str


WORKFLOW_TRANSITIONS = {
    "DRAFT": ["PREVIEWED", "PREVIEW_FAILED", "CANCELLED"],
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
            file_name=file_name,
            file_path=file_path or config.path,
            status="DRAFT",
            started_at=datetime.now(),
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
        job = ErpImportService._get_job(job_id)
        _validate_transition(job.status, "PREVIEWED")
        if not job.file_name:
            raise ErpImportError("fileName", "REQUIRED", "No file selected for preview")
        job.status = "PREVIEWED"
        job.save(update_fields=["status", "updated_at"])
        ErpImportService._audit(job, "PREVIEWED", f"File previewed: {job.file_name}")
        return job

    @staticmethod
    @transaction.atomic
    def validate_job(job_id: str) -> ImportJob:
        job = ErpImportService._get_job(job_id)
        _validate_transition(job.status, "VALIDATED")
        job.status = "VALIDATED"
        job.save(update_fields=["status", "updated_at"])
        ErpImportService._audit(job, "VALIDATED", "Import data validated")
        return job

    @staticmethod
    @transaction.atomic
    def compare_job(job_id: str) -> ImportJob:
        job = ErpImportService._get_job(job_id)
        _validate_transition(job.status, "COMPARED")
        job.status = "COMPARED"
        job.save(update_fields=["status", "updated_at"])
        ErpImportService._audit(job, "COMPARED", "Import data compared with existing")
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
        job = ErpImportService._get_job(job_id)
        _validate_transition(job.status, "APPLIED")
        job.status = "APPLIED"
        job.completed_at = datetime.now()
        if summary:
            job.records_processed = summary.get("records_processed", 0)
            job.records_created = summary.get("records_created", 0)
            job.records_updated = summary.get("records_updated", 0)
            job.records_failed = summary.get("records_failed", 0)
            job.error_summary = summary.get("error_summary", "")
        job.save()
        ErpImportService._audit(job, "APPLIED", f"Import applied: {job.records_created} created, {job.records_updated} updated")
        return job

    @staticmethod
    @transaction.atomic
    def cancel_job(job_id: str) -> ImportJob:
        job = ErpImportService._get_job(job_id)
        _validate_transition(job.status, "CANCELLED")
        job.status = "CANCELLED"
        job.completed_at = datetime.now()
        job.save(update_fields=["status", "completed_at", "updated_at"])
        ErpImportService._audit(job, "CANCELLED", "Import job cancelled")
        return job

    @staticmethod
    @transaction.atomic
    def fail_job(job_id: str, error_message: str) -> ImportJob:
        job = ErpImportService._get_job(job_id)
        allowed = ["PREVIEW_FAILED", "VALIDATION_FAILED", "COMPARE_FAILED", "APPLY_FAILED", "FAILED"]
        _validate_transition(job.status, allowed[0])  # Approximate
        failure_status = {
            "DRAFT": "PREVIEW_FAILED",
            "PREVIEWED": "VALIDATION_FAILED",
            "VALIDATED": "COMPARE_FAILED",
            "COMPARED": "APPLY_FAILED",
            "READY_TO_APPLY": "APPLY_FAILED",
        }.get(job.status, "FAILED")
        job.status = failure_status
        job.completed_at = datetime.now()
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
