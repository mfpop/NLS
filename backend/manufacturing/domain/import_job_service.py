from dataclasses import dataclass
from datetime import datetime
from hashlib import sha256
from pathlib import Path

from django.db import transaction
from django.utils import timezone

from application.models import ImportSourceConfig
from manufacturing.models import (
    ImportJob, ImportValidationError,
)


ACTIVE_IMPORT_JOB_STATUSES = {
    ImportJob.Status.DRAFT,
    ImportJob.Status.FILE_ATTACHED,
    ImportJob.Status.PREVIEWED,
    ImportJob.Status.VALIDATED,
    ImportJob.Status.COMPARED,
    ImportJob.Status.READY_TO_APPLY,
}

INACTIVE_IMPORT_JOB_STATUSES = {
    ImportJob.Status.APPLIED,
    ImportJob.Status.FAILED,
    ImportJob.Status.CANCELLED,
    ImportJob.Status.ARCHIVED,
}


@dataclass
class ImportJobError(Exception):
    field: str | None
    code: str
    message: str


@dataclass
class ImportJobDuplicateError(ImportJobError):
    existing_job_id: str | None = None
    file_name: str | None = None
    source_config_id: str | None = None

    def __init__(
        self,
        existing_job_id: str | None,
        file_name: str | None,
        source_config_id: str | None,
    ):
        super().__init__(
            field="fileName",
            code="DUPLICATE_ACTIVE_IMPORT_JOB",
            message="Import job already exists for this file/source.",
        )
        self.existing_job_id = existing_job_id
        self.file_name = file_name
        self.source_config_id = source_config_id


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
        qs = qs.order_by("-created_at")
        return qs

    @staticmethod
    def get(job_id: str) -> ImportJob:
        try:
            return ImportJob.objects.select_related("source_config").get(id=job_id)
        except ImportJob.DoesNotExist as exc:
            raise ImportJobError("id", "NOT_FOUND", "Import job not found") from exc

    @classmethod
    @transaction.atomic
    def create_draft_job(
        cls,
        source_id: str,
        file_name: str | None = None,
        file_hash: str | None = None,
        triggered_by: str | None = None,
    ) -> ImportJob:
        try:
            config = ImportSourceConfig.objects.select_for_update().get(id=source_id)
        except ImportSourceConfig.DoesNotExist as exc:
            raise ImportJobError("sourceId", "NOT_FOUND", "Source config not found") from exc

        duplicate = None
        if file_hash:
            duplicate = cls._find_active_duplicate(
                source_config_id=str(config.id),
                file_hash=file_hash,
            )
        elif file_name:
            duplicate = cls._find_active_duplicate(
                source_config_id=str(config.id),
                file_name=file_name,
            )
        if duplicate:
            raise ImportJobDuplicateError(str(duplicate.id), duplicate.file_name or file_name, str(config.id))

        job = ImportJob.objects.create(
            source_config=config,
            status=ImportJob.Status.DRAFT,
            started_at=timezone.now(),
            file_name=file_name or "",
            file_hash=file_hash or None,
            triggered_by=triggered_by,
        )
        return job

    @classmethod
    @transaction.atomic
    def attach_file(
        cls,
        job_id: str,
        file_name: str,
        file_path: str,
        file_size: int | None = None,
        file_hash: str | None = None,
    ) -> ImportJob:
        try:
            job = ImportJob.objects.select_for_update().get(id=job_id)
        except ImportJob.DoesNotExist as exc:
            raise ImportJobError("jobId", "NOT_FOUND", "Import job not found") from exc

        allowed_statuses = [ImportJob.Status.DRAFT, ImportJob.Status.FILE_ATTACHED]
        if job.status not in allowed_statuses:
            raise ImportJobError(
                "status",
                "INVALID_STATUS",
                f"Cannot attach file to job in status {job.status}. Only DRAFT or FILE_ATTACHED allowed.",
            )

        calculated_hash = file_hash or cls._calculate_sha256(file_path)
        duplicate = cls._find_active_duplicate(
            source_config_id=str(job.source_config_id),
            file_hash=calculated_hash,
            exclude_job_id=str(job.id),
        )
        if duplicate:
            raise ImportJobDuplicateError(str(duplicate.id), file_name, str(job.source_config_id))

        job.file_name = file_name
        job.file_path = file_path
        job.file_size = file_size
        job.file_hash = calculated_hash
        job.status = ImportJob.Status.FILE_ATTACHED
        job.save(update_fields=["file_name", "file_path", "file_size", "file_hash", "status", "updated_at"])
        return job

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

    @staticmethod
    def _calculate_sha256(file_path: str) -> str:
        path = Path(file_path)
        if path.exists() and path.is_file():
            data = path.read_bytes()
        else:
            data = file_path.encode("utf-8")
        return sha256(data).hexdigest()

    @staticmethod
    def _find_active_duplicate(
        source_config_id: str,
        file_name: str | None = None,
        file_hash: str | None = None,
        exclude_job_id: str | None = None,
    ) -> ImportJob | None:
        qs = ImportJob.objects.select_related("source_config").filter(
            source_config_id=source_config_id,
            status__in=ACTIVE_IMPORT_JOB_STATUSES,
        )
        if exclude_job_id:
            qs = qs.exclude(id=exclude_job_id)
        if file_hash:
            duplicate = qs.filter(file_hash=file_hash).order_by("-created_at").first()
            if duplicate:
                return duplicate
        if file_name:
            duplicate = qs.filter(file_name=file_name).order_by("-created_at").first()
            if duplicate:
                return duplicate
        return None
