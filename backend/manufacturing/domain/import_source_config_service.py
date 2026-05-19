from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from application.models import ImportSourceConfig

SECRET_PATH_PATTERN = re.compile(r"(password|secret|token|api[_-]?key|credential)", re.IGNORECASE)


class ImportSourceConfigError(ValueError):
    def __init__(self, field: str, message: str, code: str = "VALIDATION") -> None:
        super().__init__(message)
        self.field = field
        self.code = code
        self.message = message


@dataclass(frozen=True)
class PathAccessResult:
    ok: bool
    exists: bool | None
    readable: bool | None
    message: str
    checked_at: datetime


class ImportSourceConfigService:
    """Configure ERP/Excel import file locations — no import execution."""

    # ── Query methods ──

    @staticmethod
    def list_configs(
        *,
        domain: str | None = None,
        is_active: bool | None = None,
        include_archived: bool = False,
    ) -> list[ImportSourceConfig]:
        qs = ImportSourceConfig.objects.all()
        if not include_archived:
            qs = qs.filter(is_archived=False)
        if domain:
            qs = qs.filter(domain=domain)
        if is_active is not None:
            qs = qs.filter(is_active=is_active)
        return list(qs.order_by("domain", "name"))

    @staticmethod
    def list_active_configs(domain: str | None = None) -> list[ImportSourceConfig]:
        """Sources eligible for domain import jobs (active, not archived)."""
        qs = ImportSourceConfig.objects.filter(is_active=True, is_archived=False)
        if domain:
            qs = qs.filter(domain=domain)
        return list(qs.order_by("domain", "name"))

    # ── Validation helpers ──

    @staticmethod
    def _validate_required_fields(data: dict[str, Any], *, partial: bool) -> None:
        required = ("name", "source_type", "domain", "path", "file_pattern")
        for field in required:
            if field not in data and partial:
                continue
            value = data.get(field)
            if value is None or (isinstance(value, str) and not value.strip()):
                raise ImportSourceConfigError(field, f"{field.replace('_', ' ').title()} is required")

        if "source_type" in data and data["source_type"] not in ImportSourceConfig.SourceType.values:
            raise ImportSourceConfigError("source_type", "Invalid source type")
        if "domain" in data and data["domain"] not in ImportSourceConfig.Domain.values:
            raise ImportSourceConfigError("domain", "Invalid domain")

        path_value = data.get("path")
        if path_value is not None and SECRET_PATH_PATTERN.search(str(path_value)):
            raise ImportSourceConfigError("path", "Path must not contain credential-like values")

    @staticmethod
    def _find_active_duplicate(*, name: str | None = None, domain: str | None = None, source_type: str | None = None,
                               path: str | None = None, file_pattern: str | None = None, exclude_id: str | int | None = None):
        """Return an active, non-archived ImportSourceConfig that duplicates the provided attributes, if any."""
        qs = ImportSourceConfig.objects.filter(is_active=True, is_archived=False)
        # Prefer name uniqueness (case-insensitive) within domain
        if name and domain:
            qsn = qs.filter(domain=domain, name__iexact=name)
            if exclude_id:
                qsn = qsn.exclude(pk=exclude_id)
            if qsn.exists():
                return qsn.first()
        # Fallback to exact match on domain+source_type+path+file_pattern
        if domain and source_type and path is not None and file_pattern is not None:
            qsp = qs.filter(domain=domain, source_type=source_type, path=path.strip(), file_pattern=file_pattern.strip())
            if exclude_id:
                qsp = qsp.exclude(pk=exclude_id)
            if qsp.exists():
                return qsp.first()
        return None

    # ── Dict-based API (used by GraphQL mutations/queries) ──

    @classmethod
    @transaction.atomic
    def create_config(cls, data: dict[str, Any]) -> ImportSourceConfig:
        cls._validate_required_fields(data, partial=False)
        name = data["name"].strip()
        domain = data["domain"]
        source_type = data["source_type"]
        path = data["path"].strip()
        file_pattern = data["file_pattern"].strip()
        is_active = data.get("is_active") is not False

        if is_active:
            dup = cls._find_active_duplicate(name=name, domain=domain, source_type=source_type, path=path, file_pattern=file_pattern)
            if dup:
                raise ImportSourceConfigError("name", "Duplicate active import source exists", code="DUPLICATE")

        return ImportSourceConfig.objects.create(
            name=name,
            source_type=source_type,
            domain=domain,
            path=path,
            file_pattern=file_pattern,
            archive_path=(data.get("archive_path") or "").strip(),
            error_path=(data.get("error_path") or "").strip(),
            is_active=is_active,
            polling_interval_minutes=data.get("polling_interval_minutes"),
        )

    @classmethod
    @transaction.atomic
    def update_config(cls, config_id: int, data: dict[str, Any]) -> ImportSourceConfig:
        config = ImportSourceConfig.objects.select_for_update().get(pk=config_id)
        if config.is_archived:
            raise ImportSourceConfigError("id", "Archived import sources cannot be edited", code="ARCHIVED")

        cls._validate_required_fields(data, partial=True)

        new_name = config.name
        new_domain = config.domain
        new_source_type = config.source_type
        new_path = config.path
        new_file_pattern = config.file_pattern
        new_is_active = config.is_active

        if "name" in data:
            new_name = data["name"].strip()
        if "source_type" in data:
            new_source_type = data["source_type"]
        if "domain" in data:
            new_domain = data["domain"]
        if "path" in data:
            new_path = data["path"].strip()
        if "file_pattern" in data:
            new_file_pattern = data["file_pattern"].strip()
        if "is_active" in data:
            new_is_active = bool(data["is_active"])

        if new_is_active:
            dup = cls._find_active_duplicate(name=new_name, domain=new_domain, source_type=new_source_type, path=new_path, file_pattern=new_file_pattern, exclude_id=config_id)
            if dup:
                raise ImportSourceConfigError("name", "Duplicate active import source exists", code="DUPLICATE")

        if "name" in data:
            config.name = data["name"].strip()
        if "source_type" in data:
            config.source_type = data["source_type"]
        if "domain" in data:
            config.domain = data["domain"]
        if "path" in data:
            config.path = data["path"].strip()
        if "file_pattern" in data:
            config.file_pattern = data["file_pattern"].strip()
        if "archive_path" in data:
            config.archive_path = (data.get("archive_path") or "").strip()
        if "error_path" in data:
            config.error_path = (data.get("error_path") or "").strip()
        if "is_active" in data:
            config.is_active = bool(data["is_active"])
        if "polling_interval_minutes" in data:
            config.polling_interval_minutes = data["polling_interval_minutes"]

        config.save()
        return config

    @classmethod
    @transaction.atomic
    def archive_config(cls, config_id: int) -> ImportSourceConfig:
        config = ImportSourceConfig.objects.select_for_update().get(pk=config_id)
        config.is_active = False
        config.is_archived = True
        config.save(update_fields=["is_archived", "is_active", "updated_at"])
        return config

    @staticmethod
    def test_path_access(config_id: int) -> PathAccessResult:
        config = ImportSourceConfig.objects.get(pk=config_id)
        checked_at = timezone.now()
        validate_paths = getattr(settings, "IMPORT_SOURCE_VALIDATE_PATHS", True)

        if not validate_paths:
            config.last_checked_at = checked_at
            config.save(update_fields=["last_checked_at"])
            return PathAccessResult(
                ok=True,
                exists=None,
                readable=None,
                message="Path validation skipped (filesystem check disabled).",
                checked_at=checked_at,
            )

        target = Path(config.path.strip())
        exists = target.exists()
        readable = exists and target.is_dir() and os.access(target, os.R_OK)

        if not exists:
            message = "Path does not exist on the application server."
            ok = False
        elif not readable:
            message = "Path exists but is not a readable directory."
            ok = False
        else:
            message = "Path is reachable and readable."
            ok = True

        config.last_checked_at = checked_at
        config.save(update_fields=["last_checked_at"])

        return PathAccessResult(
            ok=ok,
            exists=exists,
            readable=readable,
            message=message,
            checked_at=checked_at,
        )


