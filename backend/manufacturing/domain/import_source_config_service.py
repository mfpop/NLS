import os
from pathlib import Path

from django.db import transaction

from application.models import ImportSourceConfig
from application.import_source_service import ImportSourceConfigError


class ImportSourceConfigService:

    @staticmethod
    def list(domain: str | None = None, active_only: bool = False):
        qs = ImportSourceConfig.objects.all()
        if domain:
            qs = qs.filter(domain=domain)
        if active_only:
            qs = qs.filter(is_active=True)
        return qs.order_by("name")

    @staticmethod
    def get(source_id: str) -> ImportSourceConfig:
        try:
            return ImportSourceConfig.objects.get(id=source_id)
        except ImportSourceConfig.DoesNotExist as exc:
            raise ImportSourceConfigError("id", "NOT_FOUND", "Import source config not found") from exc

    @staticmethod
    def _validate_name_unique(name: str, exclude_id: str | None = None):
        qs = ImportSourceConfig.objects.filter(name__iexact=name)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        if qs.exists():
            raise ImportSourceConfigError("name", "DUPLICATE", "Name already exists")

    @staticmethod
    def _find_active_duplicate(*, name: str | None = None, domain: str | None = None, source_type: str | None = None,
                               path: str | None = None, file_pattern: str | None = None, exclude_id: str | None = None):
        qs = ImportSourceConfig.objects.filter(is_active=True, is_archived=False)
        if name and domain:
            qsn = qs.filter(domain=domain, name__iexact=name)
            if exclude_id:
                qsn = qsn.exclude(id=exclude_id)
            if qsn.exists():
                return qsn.first()
        if domain and source_type and path is not None and file_pattern is not None:
            qsp = qs.filter(domain=domain, source_type=source_type, path=path.strip(), file_pattern=file_pattern.strip())
            if exclude_id:
                qsp = qsp.exclude(id=exclude_id)
            if qsp.exists():
                return qsp.first()
        return None

    @classmethod
    @transaction.atomic
    def create(cls, input_data) -> ImportSourceConfig:
        name = (input_data.name or "").strip()
        if not name:
            raise ImportSourceConfigError("name", "REQUIRED", "Name is required")
        domain_code = (input_data.domain or "").strip().upper()
        if domain_code not in ImportSourceConfig.Domain.values:
            raise ImportSourceConfigError("domain", "INVALID", f"Invalid domain: {domain_code}")
        source_type = (input_data.source_type or "").strip().upper()
        if source_type not in ImportSourceConfig.SourceType.values:
            raise ImportSourceConfigError("sourceType", "INVALID", f"Invalid source type: {source_type}")
        path = (input_data.path or "").strip()
        if not path:
            raise ImportSourceConfigError("path", "REQUIRED", "Path is required")
        cls._validate_name_unique(name)

        is_active = input_data.is_active if hasattr(input_data, 'is_active') else True
        if is_active:
            dup = cls._find_active_duplicate(name=name, domain=domain_code, source_type=source_type, path=path, file_pattern=(input_data.file_pattern or ""))
            if dup:
                # field, message, code
                raise ImportSourceConfigError("name", "Duplicate active import source exists", code="DUPLICATE")

        return ImportSourceConfig.objects.create(
            name=name,
            domain=domain_code,
            source_type=source_type,
            path=path,
            file_pattern=input_data.file_pattern or "",
            archive_path=input_data.archive_path or None,
            error_path=input_data.error_path or None,
            polling_interval_minutes=input_data.polling_interval_minutes or None,
        )

    @classmethod
    @transaction.atomic
    def update(cls, source_id: str, input_data) -> ImportSourceConfig:
        config = cls.get(source_id)
        name = (input_data.name or "").strip()
        if not name:
            raise ImportSourceConfigError("name", "REQUIRED", "Name is required")
        domain_code = (input_data.domain or "").strip().upper()
        if domain_code not in ImportSourceConfig.Domain.values:
            raise ImportSourceConfigError("domain", "INVALID", f"Invalid domain: {domain_code}")
        source_type = (input_data.source_type or "").strip().upper()
        if source_type not in ImportSourceConfig.SourceType.values:
            raise ImportSourceConfigError("sourceType", "INVALID", f"Invalid source type: {source_type}")
        path = (input_data.path or "").strip()
        if not path:
            raise ImportSourceConfigError("path", "REQUIRED", "Path is required")
        cls._validate_name_unique(name, source_id)

        # Build prospective values
        new_name = name
        new_domain = domain_code
        new_source_type = source_type
        new_path = path
        new_file_pattern = input_data.file_pattern or ""
        new_is_active = True if not hasattr(input_data, 'is_active') else input_data.is_active

        dup = cls._find_active_duplicate(name=new_name, domain=new_domain, source_type=new_source_type, path=new_path, file_pattern=new_file_pattern, exclude_id=source_id)
        if dup:
            # field, message, code
            raise ImportSourceConfigError("name", "Duplicate active import source exists", code="DUPLICATE")

        config.name = name
        config.domain = domain_code
        config.source_type = source_type
        config.path = path
        config.file_pattern = input_data.file_pattern or ""
        if input_data.archive_path is not None:
            config.archive_path = input_data.archive_path or None
        if input_data.error_path is not None:
            config.error_path = input_data.error_path or None
        config.polling_interval_minutes = input_data.polling_interval_minutes or None
        config.save()
        return config

    @classmethod
    @transaction.atomic
    def archive(cls, source_id: str) -> ImportSourceConfig:
        config = cls.get(source_id)
        config.is_active = False
        config.save()
        return config

    @staticmethod
    def test_path(source_id: str) -> dict:
        config = ImportSourceConfigService.get(source_id)
        path = Path(config.path)
        result = {
            "sourceId": source_id,
            "path": config.path,
            "exists": path.exists(),
            "isDirectory": path.is_dir() if path.exists() else False,
            "isReadable": os.access(path, os.R_OK) if path.exists() else False,
        }
        return result
