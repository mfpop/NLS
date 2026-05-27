from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

from django.db import transaction

from manufacturing.models.erp_import_pattern import ErpImportPattern, ErpImportPatternFieldMapping
from manufacturing.domain.lineage_service import LineageService

VALID_SCOPES = [
    "PLANT_STRUCTURE", "PRODUCT_MASTER", "MATERIALS",
    "WAREHOUSE_BINS", "ROUTING", "SCHEDULES", "CAPACITY", "QUALITY", "CUSTOM",
]


class ErpImportPatternError(ValueError):
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


class ErpImportPatternService:

    @staticmethod
    def list_patterns() -> list[ErpImportPattern]:
        return list(ErpImportPattern.objects.all().order_by("-is_active", "name"))

    @staticmethod
    def get_pattern(pattern_id: str) -> ErpImportPattern:
        try:
            return ErpImportPattern.objects.get(id=pattern_id)
        except ErpImportPattern.DoesNotExist:
            raise ErpImportPatternError("id", "NOT_FOUND", "Import pattern not found")

    @staticmethod
    def _normalize_entity_selection(selection: dict | None, id_key: str = "plantIds") -> dict:
        if not selection:
            return {"mode": "all"}
        mode = selection.get("mode", "all")
        if mode not in ("all", "selected"):
            mode = "all"
        if mode == "selected":
            ids = selection.get(id_key, [])
            if not isinstance(ids, list):
                ids = []
            return {"mode": "selected", id_key: ids}
        return {"mode": "all"}

    @staticmethod
    @transaction.atomic
    def create_pattern(
        name: str,
        destination_entity: str,
        scope: str = "CUSTOM",
        description: str = "",
        created_by: str = "",
        source_file_pattern: str = "",
        source_schema: list | None = None,
        plant_selection: dict | None = None,
        department_selection: dict | None = None,
        resource_group_selection: dict | None = None,
    ) -> ErpImportPattern:
        if not name.strip():
            raise ErpImportPatternError("name", "REQUIRED", "Pattern name is required")
        if not destination_entity.strip():
            raise ErpImportPatternError("destinationEntity", "REQUIRED", "Destination entity is required")
        if ErpImportPattern.objects.filter(name__iexact=name.strip()).exists():
            raise ErpImportPatternError("name", "DUPLICATE", f"Pattern '{name.strip()}' already exists")
        scope_upper = scope.upper()
        if scope_upper not in VALID_SCOPES:
            raise ErpImportPatternError("scope", "INVALID", f"Invalid scope: {scope}")
        return ErpImportPattern.objects.create(
            name=name.strip(),
            description=description,
            scope=scope_upper,
            destination_entity=destination_entity.strip(),
            created_by=created_by,
            source_file_pattern=source_file_pattern,
            source_file_type=os.path.splitext(source_file_pattern)[1].lstrip(".").lower() if source_file_pattern else "",
            source_schema=source_schema or [],
            plant_selection=ErpImportPatternService._normalize_entity_selection(plant_selection, "plantIds"),
            department_selection=ErpImportPatternService._normalize_entity_selection(department_selection, "departmentIds"),
            resource_group_selection=ErpImportPatternService._normalize_entity_selection(resource_group_selection, "resourceGroupIds"),
        )

    @staticmethod
    @transaction.atomic
    def update_pattern(
        pattern_id: str,
        name: str | None = None,
        description: str | None = None,
        scope: str | None = None,
        destination_entity: str | None = None,
        is_active: bool | None = None,
        source_file_pattern: str | None = None,
        source_schema: list | None = None,
        plant_selection: dict | None = None,
        department_selection: dict | None = None,
        resource_group_selection: dict | None = None,
    ) -> ErpImportPattern:
        pattern = ErpImportPatternService.get_pattern(pattern_id)
        if name is not None:
            if not name.strip():
                raise ErpImportPatternError("name", "REQUIRED", "Pattern name cannot be empty")
            if name.strip().lower() != pattern.name.lower() and ErpImportPattern.objects.filter(name__iexact=name.strip()).exists():
                raise ErpImportPatternError("name", "DUPLICATE", f"Pattern '{name.strip()}' already exists")
            pattern.name = name.strip()
        if description is not None:
            pattern.description = description
        if scope is not None:
            scope_upper = scope.upper()
            if scope_upper not in VALID_SCOPES:
                raise ErpImportPatternError("scope", "INVALID", f"Invalid scope: {scope}")
            pattern.scope = scope_upper
        if destination_entity is not None:
            if not destination_entity.strip():
                raise ErpImportPatternError("destinationEntity", "REQUIRED", "Destination entity cannot be empty")
            pattern.destination_entity = destination_entity.strip()
        if is_active is not None:
            pattern.is_active = is_active
        if source_file_pattern is not None:
            pattern.source_file_pattern = source_file_pattern
            pattern.source_file_type = os.path.splitext(source_file_pattern)[1].lstrip(".").lower() if source_file_pattern else ""
        if source_schema is not None:
            pattern.source_schema = source_schema
        if plant_selection is not None:
            pattern.plant_selection = ErpImportPatternService._normalize_entity_selection(plant_selection, "plantIds")
        if department_selection is not None:
            pattern.department_selection = ErpImportPatternService._normalize_entity_selection(department_selection, "departmentIds")
        if resource_group_selection is not None:
            pattern.resource_group_selection = ErpImportPatternService._normalize_entity_selection(resource_group_selection, "resourceGroupIds")
        pattern.save(update_fields=["name", "description", "scope", "destination_entity", "is_active", "source_file_pattern", "source_file_type", "source_schema", "plant_selection", "department_selection", "resource_group_selection", "updated_at"])
        return pattern

    @staticmethod
    @transaction.atomic
    def delete_pattern(pattern_id: str) -> None:
        pattern = ErpImportPatternService.get_pattern(pattern_id)
        pattern.delete()

    @staticmethod
    def list_mappings(pattern_id: str) -> list[ErpImportPatternFieldMapping]:
        pattern = ErpImportPatternService.get_pattern(pattern_id)
        return list(ErpImportPatternFieldMapping.objects.filter(pattern=pattern).order_by("sort_order", "source_name"))

    @staticmethod
    @transaction.atomic
    def save_mapping(
        pattern_id: str,
        source_name: str,
        source_data_type: str,
        destination_name: str,
        destination_data_type: str,
        is_required: bool = False,
        sort_order: int = 0,
    ) -> ErpImportPatternFieldMapping:
        pattern = ErpImportPatternService.get_pattern(pattern_id)
        if not source_name.strip():
            raise ErpImportPatternError("sourceName", "REQUIRED", "Source name is required")
        if not destination_name.strip():
            raise ErpImportPatternError("destinationName", "REQUIRED", "Destination name is required")
        valid_types = {c[0] for c in ErpImportPattern.DATA_TYPE_CHOICES}
        if source_data_type not in valid_types:
            raise ErpImportPatternError("sourceDataType", "INVALID", f"Invalid source data type: {source_data_type}")
        if destination_data_type not in valid_types:
            raise ErpImportPatternError("destinationDataType", "INVALID", f"Invalid destination data type: {destination_data_type}")
        mapping, _created = ErpImportPatternFieldMapping.objects.update_or_create(
            pattern=pattern,
            source_name=source_name.strip(),
            defaults={
                "source_data_type": source_data_type,
                "destination_name": destination_name.strip(),
                "destination_data_type": destination_data_type,
                "is_required": is_required,
                "sort_order": sort_order,
            },
        )
        return mapping

    @staticmethod
    @transaction.atomic
    def remove_mapping(pattern_id: str, mapping_id: str) -> None:
        pattern = ErpImportPatternService.get_pattern(pattern_id)
        count, _ = ErpImportPatternFieldMapping.objects.filter(id=mapping_id, pattern=pattern).delete()
        if count == 0:
            raise ErpImportPatternError("id", "NOT_FOUND", "Field mapping not found")

    @staticmethod
    @transaction.atomic
    def replace_all_mappings(pattern_id: str, mappings: list[dict[str, Any]]) -> list[ErpImportPatternFieldMapping]:
        pattern = ErpImportPatternService.get_pattern(pattern_id)
        ErpImportPatternFieldMapping.objects.filter(pattern=pattern).delete()
        created: list[ErpImportPatternFieldMapping] = []
        for i, m in enumerate(mappings):
            source_name = m.get("source_name", "").strip()
            if not source_name:
                continue
            mapping = ErpImportPatternFieldMapping.objects.create(
                pattern=pattern,
                source_name=source_name,
                source_data_type=m.get("source_data_type", "string"),
                destination_name=m.get("destination_name", "").strip(),
                destination_data_type=m.get("destination_data_type", "string"),
                is_required=m.get("is_required", False),
                sort_order=m.get("sort_order", i),
            )
            created.append(mapping)
        return created

    @staticmethod
    def validate_pattern(pattern_id: str) -> PatternValidationResult:
        pattern = ErpImportPatternService.get_pattern(pattern_id)
        mappings = list(ErpImportPatternFieldMapping.objects.filter(pattern=pattern))
        issues: list[PatternValidationIssue] = []

        if not mappings:
            issues.append(PatternValidationIssue(
                source_name="", destination_name="", severity="error",
                code="NO_MAPPINGS", message="Pattern has no field mappings defined",
            ))

        seen_sources: set[str] = set()
        for m in mappings:
            if m.source_name in seen_sources:
                issues.append(PatternValidationIssue(
                    source_name=m.source_name, destination_name=m.destination_name,
                    severity="error", code="DUPLICATE_SOURCE",
                    message=f"Duplicate source field: {m.source_name}",
                ))
            seen_sources.add(m.source_name)

            if not m.destination_name:
                issues.append(PatternValidationIssue(
                    source_name=m.source_name, destination_name="",
                    severity="error", code="EMPTY_DESTINATION",
                    message=f"Destination name is empty for source field '{m.source_name}'",
                ))

        # Validate destination entity exists in allowed destinations
        known_tables = LineageService.get_destination_tables(pattern.scope)
        if known_tables and pattern.destination_entity not in known_tables:
            issues.append(PatternValidationIssue(
                source_name="", destination_name=pattern.destination_entity,
                severity="warning", code="UNKNOWN_DESTINATION",
                message=f"'{pattern.destination_entity}' is not in the known destinations for scope '{pattern.scope}'",
            ))

        return PatternValidationResult(
            ok=len([i for i in issues if i.severity == "error"]) == 0,
            issues=issues,
        )

    @staticmethod
    def get_destination_options(scope: str | None = None) -> dict[str, list[str]]:
        tables = LineageService.get_destination_tables(scope)
        return {scope or "ALL": tables}

    @staticmethod
    def get_scope_options() -> list[dict[str, str]]:
        return [{"value": s, "label": s.replace("_", " ").title()} for s in VALID_SCOPES]
