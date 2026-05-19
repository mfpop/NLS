import os
from dataclasses import dataclass
from datetime import datetime

from django.db import transaction

from application.models import ImportSourceConfig
from manufacturing.models import (
    ImportJob, ImportValidationError,
)


@dataclass
class ImportJobError(Exception):
    field: str | None
    code: str
    message: str


class ImportJobService:

    @staticmethod
    def list(source_id: str | None = None, status: str | None = None, domain: str | None = None):
        qs = ImportJob.objects.select_related("source_config").all()
        if source_id:
            qs = qs.filter(source_config_id=source_id)
        if status:
            qs = qs.filter(status=status.upper())
        if domain:
            qs = qs.filter(source_config__domain=domain.upper())
        return qs.order_by("-created_at")

    @staticmethod
    def get(job_id: str) -> ImportJob:
        try:
            return ImportJob.objects.select_related("source_config").get(id=job_id)
        except ImportJob.DoesNotExist as exc:
            raise ImportJobError("id", "NOT_FOUND", "Import job not found") from exc

    @classmethod
    @transaction.atomic
    def trigger(cls, source_id: str, triggered_by: str | None = None) -> ImportJob:
        try:
            config = ImportSourceConfig.objects.get(id=source_id)
        except ImportSourceConfig.DoesNotExist as exc:
            raise ImportJobError("sourceId", "NOT_FOUND", "Source config not found") from exc
        if not config.is_active:
            raise ImportJobError("sourceId", "DISABLED", "Disabled source configs cannot execute jobs")

        job = ImportJob.objects.create(
            source_config=config,
            file_name="",
            file_path=config.path,
            started_at=datetime.now(),
            status=ImportJob.Status.PENDING,
            triggered_by=triggered_by,
        )
        return job

    @classmethod
    @transaction.atomic
    def complete(cls, job_id: str, status: str, summary: dict | None = None) -> ImportJob:
        job = cls.get(job_id)
        job.status = status.upper()
        job.completed_at = datetime.now()
        if summary:
            job.records_processed = summary.get("records_processed", 0)
            job.records_created = summary.get("records_created", 0)
            job.records_updated = summary.get("records_updated", 0)
            job.records_failed = summary.get("records_failed", 0)
            job.error_summary = summary.get("error_summary", "")
        job.save()
        return job

    @classmethod
    @transaction.atomic
    def add_validation_error(cls, job_id: str, error_data) -> ImportValidationError:
        job = cls.get(job_id)
        return ImportValidationError.objects.create(
            import_job=job,
            sheet_name=error_data.get("sheet_name"),
            row_number=error_data.get("row_number"),
            entity_type=error_data.get("entity_type", ""),
            field_name=error_data.get("field_name"),
            error_code=error_data.get("error_code", "UNKNOWN"),
            message=error_data.get("message", ""),
            raw_value=error_data.get("raw_value"),
        )

    @staticmethod
    def get_validation_errors(job_id: str, entity_type: str | None = None):
        qs = ImportValidationError.objects.filter(import_job_id=job_id)
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        return qs.order_by("-created_at")

    @staticmethod
    def get_status_summary() -> dict:
        total = ImportJob.objects.count()
        by_status = {}
        for status_code, _ in ImportJob.Status.choices:
            by_status[status_code] = ImportJob.objects.filter(status=status_code).count()
        recent_failures = ImportJob.objects.filter(
            status=ImportJob.Status.FAILED,
        ).order_by("-created_at")[:10]
        return {
            "totalJobs": total,
            "byStatus": by_status,
            "recentFailures": [
                {"id": str(j.id), "fileName": j.file_name, "createdAt": j.created_at.isoformat()}
                for j in recent_failures
            ],
        }
