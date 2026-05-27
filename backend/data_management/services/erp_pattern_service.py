"""DEPRECATED — ErpPatternService for legacy data_management.ErpPattern.

The active pattern model is manufacturing.ErpImportPattern (source of truth).
Use manufacturing.domain.erp_import_pattern_service.ErpImportPatternService instead.
This module is kept for migration compatibility only.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from django.db import transaction

from data_management.models import ErpPattern, ErpPatternMapping, ErpSourceFile

VALID_FILE_TYPES = {"xlsx", "xls", "csv", "tsv", "xml", "json"}

VALID_DESTINATION_ENTITIES = {
    "Plant", "Department", "ProductionLine", "ResourceGroup", "Resource",
    "Material", "MaterialBin", "Warehouse", "Routing", "Schedule",
    "Capacity", "Quality", "ProductMaster",
}


class ErpPatternError(ValueError):
    def __init__(self, field: str, code: str, message: str):
        super().__init__(message)
        self.field = field
        self.code = code
        self.message = message


@dataclass
class PatternValidationIssue:
    source_name: str
    destination_name: str
    severity: str
    code: str
    message: str


@dataclass
class PatternValidationResult:
    ok: bool
    issues: list[PatternValidationIssue] = field(default_factory=list)


class ErpPatternService:

    @staticmethod
    def get_pattern(pattern_id: int):
        """Try manufacturing.ErpImportPattern first (active source of truth),
        then fall back to legacy data_management.ErpPattern."""
        from manufacturing.models.erp_import_pattern import ErpImportPattern as MfgPattern
        try:
            return MfgPattern.objects.get(id=pattern_id)
        except MfgPattern.DoesNotExist:
            try:
                return ErpPattern.objects.get(id=pattern_id)
            except ErpPattern.DoesNotExist:
                raise ErpPatternError("id", "NOT_FOUND", "ERP Pattern not found")

    @staticmethod
    def list_patterns() -> list[ErpPattern]:
        return list(ErpPattern.objects.all().order_by("-is_active", "name"))

    @staticmethod
    @transaction.atomic
    def create_pattern(
        name: str,
        destination_entity: str,
        source_file_type: str = "xlsx",
        created_by: str = "",
    ) -> ErpPattern:
        name = name.strip()
        if not name:
            raise ErpPatternError("name", "REQUIRED", "Pattern name is required")
        destination_entity = destination_entity.strip()
        if not destination_entity:
            raise ErpPatternError("destination_entity", "REQUIRED", "Destination entity is required")
        ErpPatternService.validate_destination_entity(destination_entity)
        if source_file_type not in VALID_FILE_TYPES:
            raise ErpPatternError("source_file_type", "INVALID", f"Unsupported file type '{source_file_type}'")
        if ErpPattern.objects.filter(name__iexact=name).exists():
            raise ErpPatternError("name", "DUPLICATE", f"Pattern '{name}' already exists")
        pattern = ErpPattern.objects.create(
            name=name,
            source_file_type=source_file_type,
            destination_entity=destination_entity,
            created_by=created_by or "",
        )
        return pattern

    @staticmethod
    @transaction.atomic
    def update_pattern(
        pattern_id: int,
        name: str | None = None,
        destination_entity: str | None = None,
        source_file_type: str | None = None,
        is_active: bool | None = None,
        created_by: str | None = None,
    ) -> ErpPattern:
        pattern = ErpPatternService.get_pattern(pattern_id)
        if name is not None:
            name = name.strip()
            if not name:
                raise ErpPatternError("name", "REQUIRED", "Pattern name is required")
            if ErpPattern.objects.filter(name__iexact=name).exclude(id=pattern_id).exists():
                raise ErpPatternError("name", "DUPLICATE", f"Pattern '{name}' already exists")
            pattern.name = name
        if destination_entity is not None:
            destination_entity = destination_entity.strip()
            if not destination_entity:
                raise ErpPatternError("destination_entity", "REQUIRED", "Destination entity is required")
            ErpPatternService.validate_destination_entity(destination_entity)
            pattern.destination_entity = destination_entity
        if source_file_type is not None:
            if source_file_type not in VALID_FILE_TYPES:
                raise ErpPatternError("source_file_type", "INVALID", f"Unsupported file type '{source_file_type}'")
            pattern.source_file_type = source_file_type
        if is_active is not None:
            pattern.is_active = is_active
        if created_by is not None:
            pattern.created_by = created_by
        pattern.save()
        return pattern

    @staticmethod
    def validate_destination_entity(destination_entity: str) -> None:
        if destination_entity not in VALID_DESTINATION_ENTITIES:
            raise ErpPatternError(
                "destination_entity", "UNSUPPORTED",
                f"Unsupported destination entity '{destination_entity}'. "
                f"Supported: {', '.join(sorted(VALID_DESTINATION_ENTITIES))}",
            )

    @staticmethod
    def validate_mappings(pattern: ErpPattern) -> PatternValidationResult:
        mappings = list(pattern.field_mappings.all().order_by("order"))
        issues: list[PatternValidationIssue] = []

        if not mappings:
            issues.append(PatternValidationIssue(
                source_name="", destination_name="",
                severity="error", code="NO_MAPPINGS",
                message="Pattern has no field mappings defined",
            ))
            return PatternValidationResult(ok=False, issues=issues)

        source_names: set[str] = set()
        destination_names: set[str] = set()

        for m in mappings:
            if not m.source_name.strip():
                issues.append(PatternValidationIssue(
                    source_name=m.source_name, destination_name=m.destination_name,
                    severity="error", code="MISSING_SOURCE_NAME",
                    message="Mapping has empty source field name",
                ))
            if not m.destination_name.strip():
                issues.append(PatternValidationIssue(
                    source_name=m.source_name, destination_name=m.destination_name,
                    severity="error", code="MISSING_DESTINATION_NAME",
                    message="Mapping has empty destination field name",
                ))
            norm_src = m.source_name.strip().lower()
            norm_dst = m.destination_name.strip().lower()
            if norm_src and norm_src in source_names:
                issues.append(PatternValidationIssue(
                    source_name=m.source_name, destination_name=m.destination_name,
                    severity="error", code="DUPLICATE_SOURCE_NAME",
                    message=f"Duplicate source field name '{m.source_name}'",
                ))
            if norm_dst and norm_dst in destination_names:
                issues.append(PatternValidationIssue(
                    source_name=m.source_name, destination_name=m.destination_name,
                    severity="error", code="DUPLICATE_DESTINATION_NAME",
                    message=f"Duplicate destination field name '{m.destination_name}'",
                ))
            source_names.add(norm_src)
            destination_names.add(norm_dst)

        return PatternValidationResult(ok=len(issues) == 0, issues=issues)

    @staticmethod
    def validate_file_type_compatibility(pattern: ErpPattern, source_file: ErpSourceFile) -> None:
        if pattern.source_file_type != source_file.file_type:
            raise ErpPatternError(
                "source_file_type", "INCOMPATIBLE",
                f"Pattern expects '{pattern.source_file_type}' files but source file is "
                f"'{source_file.file_type}' ({source_file.original_name})",
            )
