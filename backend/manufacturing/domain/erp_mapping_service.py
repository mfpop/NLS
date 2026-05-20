from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from django.db import transaction

from manufacturing.models.mapping_profile import ImportProfile, ImportFieldMapping
from manufacturing.models import Company, Plant, Department, ProductionLine, ResourceGroup, Resource
from manufacturing.domain.file_parser_service import FileParserService, SheetData

VALID_ENTITIES = frozenset({
    "Department", "ResourceGroup", "Resource",
})

REQUIRED_FIELDS: dict[str, list[str]] = {
    "Department": ["department_code"],
    "ResourceGroup": ["resource_group_code", "resource_group_name", "department_code"],
    "Resource": ["resource_code", "resource_name", "resource_group_code"],
}

OPTIONAL_FIELDS: dict[str, list[str]] = {
    "Department": ["department_name", "status", "plant_code"],
    "ResourceGroup": ["operation_code", "calendar_code", "input_bin", "output_bin", "backflush_bin", "status"],
    "Resource": ["resource_type", "calendar_code", "capacity", "operator_type", "status"],
}

TARGET_FIELD_OPTIONS: dict[str, list[str]] = {
    "Department": ["code", "name", "status", "plant.code"],
    "ResourceGroup": ["code", "name", "department.code", "operation.code", "calendar.code", "input_bin.code", "output_bin.code", "backflush_bin.code", "status"],
    "Resource": ["code", "name", "resource_group.code", "resource_type", "calendar.code", "capacity", "operator_type", "status"],
}


@dataclass
class MappingValidationIssue:
    entity_type: str
    source_column: str
    target_field: str | None
    severity: str
    code: str
    message: str


@dataclass
class MappingValidationResult:
    ok: bool
    issues: list[MappingValidationIssue] = field(default_factory=list)

    @property
    def blocking_errors(self) -> list[MappingValidationIssue]:
        return [i for i in self.issues if i.severity == "error"]


@dataclass
class ResultTreeNode:
    entity_type: str
    entity_key: str
    children: list[ResultTreeNode] = field(default_factory=list)
    action: str = "UNCHANGED"
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class CompareRow:
    entity_type: str
    entity_key: str
    action: str
    incoming: dict[str, Any]
    existing: dict[str, Any] | None
    diffs: list[dict[str, Any]] = field(default_factory=list)


class ERPMappingError(ValueError):
    def __init__(self, field: str, code: str, message: str):
        super().__init__(message)
        self.field = field
        self.code = code
        self.message = message


def _normalize(name: str) -> str:
    return name.strip().lower().replace(" ", "").replace("_", "").replace("-", "")


class ERPMappingService:

    @staticmethod
    def list_profiles() -> list[ImportProfile]:
        return list(ImportProfile.objects.all().order_by("-is_active", "name"))

    @staticmethod
    def get_profile(profile_id: str) -> ImportProfile:
        try:
            return ImportProfile.objects.get(id=profile_id)
        except ImportProfile.DoesNotExist:
            raise ERPMappingError("id", "NOT_FOUND", "Import profile not found")

    @staticmethod
    @transaction.atomic
    def create_profile(name: str, domain: str = "PLANT_STRUCTURE", created_by: str = "") -> ImportProfile:
        if not name.strip():
            raise ERPMappingError("name", "REQUIRED", "Profile name is required")
        return ImportProfile.objects.create(
            name=name.strip(),
            domain=domain.upper(),
            created_by=created_by,
        )

    @staticmethod
    def detect_columns(file_path: str) -> list[dict[str, Any]]:
        from pathlib import Path
        if not Path(file_path).exists():
            raise ERPMappingError("filePath", "NOT_FOUND", f"File not found: {file_path}")
        parse_result = FileParserService.parse(file_path, "XLSX")
        columns: list[dict[str, Any]] = []
        seen = set()
        for sheet in parse_result.sheets:
            for ci, col in enumerate(sheet.column_headers):
                if col in seen:
                    continue
                seen.add(col)
                sample_values = [
                    str(r.values[ci]) if ci < len(r.values) and r.values[ci] is not None else ""
                    for r in sheet.rows[:5] if not r.is_empty and ci < len(r.values)
                ]
                null_count = sum(1 for r in sheet.rows if not r.is_empty and (ci >= len(r.values) or r.values[ci] is None or r.values[ci] == ""))
                col_type = "TEXT"
                if sample_values:
                    numeric = all(v.replace(".", "").replace("-", "").isdigit() for v in sample_values if v)
                    if numeric:
                        col_type = "NUMERIC"
                columns.append({
                    "column_name": col,
                    "sample_values": sample_values[:5],
                    "detected_type": col_type,
                    "null_count": null_count,
                    "total_rows": sheet.total_rows,
                    "sheet_name": sheet.sheet_name,
                })
        return columns

    @staticmethod
    def nexus_target_fields(entity_type: str | None = None) -> dict[str, list[str]]:
        if entity_type:
            return {entity_type: TARGET_FIELD_OPTIONS.get(entity_type, [])}
        return dict(TARGET_FIELD_OPTIONS)

    @staticmethod
    def get_mappings(profile_id: str) -> list[ImportFieldMapping]:
        profile = ERPMappingService.get_profile(profile_id)
        return list(ImportFieldMapping.objects.filter(profile=profile).order_by("entity_type", "sort_order"))

    @staticmethod
    def save_mapping(profile_id: str, entity_type: str, source_column: str, target_field: str, is_required: bool = False) -> ImportFieldMapping:
        profile = ERPMappingService.get_profile(profile_id)
        if entity_type not in VALID_ENTITIES:
            raise ERPMappingError("entityType", "INVALID", f"Invalid entity type: {entity_type}")
        if not source_column.strip():
            raise ERPMappingError("sourceColumn", "REQUIRED", "Source column is required")
        if not target_field.strip():
            raise ERPMappingError("targetField", "REQUIRED", "Target field is required")
        mapping, created = ImportFieldMapping.objects.update_or_create(
            profile=profile,
            entity_type=entity_type,
            source_column=source_column.strip(),
            defaults={
                "target_field": target_field.strip(),
                "is_required": is_required,
            },
        )
        return mapping

    @staticmethod
    @transaction.atomic
    def remove_mapping(profile_id: str, mapping_id: str) -> None:
        profile = ERPMappingService.get_profile(profile_id)
        count, _ = ImportFieldMapping.objects.filter(id=mapping_id, profile=profile).delete()
        if count == 0:
            raise ERPMappingError("id", "NOT_FOUND", "Mapping not found")

    @staticmethod
    def validate_mapping(profile_id: str, detected_columns: list[dict] | None = None) -> MappingValidationResult:
        profile = ERPMappingService.get_profile(profile_id)
        mappings = list(ImportFieldMapping.objects.filter(profile=profile))
        issues: list[MappingValidationIssue] = []

        mapped_source = set()
        mapped_targets_by_entity: dict[str, set[str]] = {}

        for m in mappings:
            key = (m.entity_type, m.source_column)
            if key in mapped_source:
                issues.append(MappingValidationIssue(
                    entity_type=m.entity_type, source_column=m.source_column,
                    target_field=m.target_field, severity="error",
                    code="DUPLICATE_MAPPING", message=f"Duplicate mapping for {m.entity_type}.{m.source_column}",
                ))
            mapped_source.add(key)
            mapped_targets_by_entity.setdefault(m.entity_type, set()).add(m.target_field)

            valid_targets = TARGET_FIELD_OPTIONS.get(m.entity_type, [])
            if m.target_field not in valid_targets:
                issues.append(MappingValidationIssue(
                    entity_type=m.entity_type, source_column=m.source_column,
                    target_field=m.target_field, severity="warning",
                    code="UNKNOWN_TARGET", message=f"'{m.target_field}' is not a known target field for {m.entity_type}",
                ))

            if detected_columns:
                detected_names = {_normalize(c["column_name"]) for c in detected_columns}
                if _normalize(m.source_column) not in detected_names:
                    issues.append(MappingValidationIssue(
                        entity_type=m.entity_type, source_column=m.source_column,
                        target_field=m.target_field, severity="warning",
                        code="COLUMN_NOT_FOUND", message=f"Source column '{m.source_column}' not found in file",
                    ))

        for entity, required in REQUIRED_FIELDS.items():
            mapped_targets = mapped_targets_by_entity.get(entity, set())
            for req_field in required:
                if req_field.split(".")[0] not in {t.split(".")[0] for t in mapped_targets} and req_field not in mapped_targets:
                    issues.append(MappingValidationIssue(
                        entity_type=entity, source_column="",
                        target_field=req_field, severity="error",
                        code="REQUIRED_MISSING", message=f"Required field '{req_field}' is not mapped for {entity}",
                    ))

        return MappingValidationResult(
            ok=len([i for i in issues if i.severity == "error"]) == 0,
            issues=issues,
        )

    @staticmethod
    def test_mapping(profile_id: str, file_path: str) -> MappingValidationResult:
        detected = ERPMappingService.detect_columns(file_path)
        return ERPMappingService.validate_mapping(profile_id, detected)

    @staticmethod
    def generate_result_tree(profile_id: str, file_path: str, plant_code: str | None = None) -> list[ResultTreeNode]:
        from manufacturing.domain.plant_structure_import_service import PlantStructureImportService
        profile = ERPMappingService.get_profile(profile_id)
        parsed = PlantStructureImportService.parse_excel(file_path)
        departments: list[ResultTreeNode] = []
        groups: list[ResultTreeNode] = []
        resources: list[ResultTreeNode] = []

        for sheet in parsed.sheets:
            sl = sheet.sheet_name.lower()
            if "resource" in sl and "group" not in sl:
                resources = ERPMappingService._build_resource_nodes(sheet, plant_code)
            elif "group" in sl:
                groups = ERPMappingService._build_group_nodes(sheet, plant_code)
            elif "department" in sl:
                departments = ERPMappingService._build_department_nodes(sheet, plant_code)

        dept_map: dict[str, ResultTreeNode] = {}
        for d in departments:
            dept_map[d.entity_key] = d

        for g in groups:
            parent_dept = g.details.get("department_code", "")
            if parent_dept in dept_map:
                dept_map[parent_dept].children.append(g)
            else:
                departments.append(g)

        for r in resources:
            parent_group = r.details.get("resource_group_code", "")
            found = False
            for g in groups:
                if g.entity_key == parent_group:
                    g.children.append(r)
                    found = True
                    break
            if not found:
                departments.append(r)

        return departments

    @staticmethod
    def _build_department_nodes(sheet: SheetData, plant_code: str | None) -> list[ResultTreeNode]:
        nodes: list[ResultTreeNode] = []
        headers = [h.strip().lower() for h in sheet.column_headers]
        code_idx = _find_idx(headers, "department_code", "dept_code", "code", "department")
        name_idx = _find_idx(headers, "department_name", "dept_name", "name")
        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _val_at(row, code_idx)
            if not code:
                continue
            name = _val_at(row, name_idx) or code
            nodes.append(ResultTreeNode(
                entity_type="Department",
                entity_key=code,
                action="CREATE",
                details={"code": code, "name": name, "plant_code": plant_code or ""},
            ))
        return nodes

    @staticmethod
    def _build_group_nodes(sheet: SheetData, plant_code: str | None) -> list[ResultTreeNode]:
        headers = [h.strip().lower() for h in sheet.column_headers]
        code_idx = _find_idx(headers, "resource_group_code", "group_code", "code", "resourcegrpid", "resourcegroup")
        name_idx = _find_idx(headers, "resource_group_name", "group_name", "name", "description")
        dept_idx = _find_idx(headers, "department_code", "dept_code", "department")
        nodes: list[ResultTreeNode] = []
        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _val_at(row, code_idx)
            if not code:
                continue
            name = _val_at(row, name_idx) or code
            dept = _val_at(row, dept_idx) or ""
            nodes.append(ResultTreeNode(
                entity_type="ResourceGroup",
                entity_key=code,
                action="CREATE",
                details={"code": code, "name": name, "department_code": dept, "plant_code": plant_code or ""},
            ))
        return nodes

    @staticmethod
    def _build_resource_nodes(sheet: SheetData, plant_code: str | None) -> list[ResultTreeNode]:
        headers = [h.strip().lower() for h in sheet.column_headers]
        code_idx = _find_idx(headers, "resource_code", "code", "resource", "resourceid")
        name_idx = _find_idx(headers, "resource_name", "name", "description")
        group_idx = _find_idx(headers, "resource_group_code", "group_code", "resourcegroup", "resourcegrpid")
        nodes: list[ResultTreeNode] = []
        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _val_at(row, code_idx)
            if not code:
                continue
            name = _val_at(row, name_idx) or code
            group = _val_at(row, group_idx) or ""
            nodes.append(ResultTreeNode(
                entity_type="Resource",
                entity_key=code,
                action="CREATE",
                details={"code": code, "name": name, "resource_group_code": group, "plant_code": plant_code or ""},
            ))
        return nodes

    @staticmethod
    def compare_import(profile_id: str, file_path: str) -> list[CompareRow]:
        profile = ERPMappingService.get_profile(profile_id)
        parsed = ERPMappingService._parse_with_mapping(profile, file_path)
        rows: list[CompareRow] = []

        for entity_type, records in parsed.items():
            for rec in records:
                key = rec.get("code") or rec.get(entity_type.lower() + "_code") or ""
                if not key:
                    continue
                existing = ERPMappingService._lookup_entity(entity_type, key)
                incoming = rec
                diffs: list[dict[str, Any]] = []
                if existing:
                    for k, v in incoming.items():
                        ev = getattr(existing, k, None)
                        if ev is not None and str(ev).lower() != str(v).lower():
                            diffs.append({"field": k, "from": str(ev), "to": str(v)})
                    action = "UPDATE" if diffs else "UNCHANGED"
                    existing_dict = {k: str(getattr(existing, k, "")) for k in incoming}
                else:
                    action = "CREATE"
                    existing_dict = None

                rows.append(CompareRow(
                    entity_type=entity_type,
                    entity_key=key,
                    action=action,
                    incoming=incoming,
                    existing=existing_dict,
                    diffs=diffs,
                ))
        return rows

    @staticmethod
    def _parse_with_mapping(profile: ImportProfile, file_path: str) -> dict[str, list[dict]]:
        from manufacturing.domain.plant_structure_import_service import PlantStructureImportService
        parsed = PlantStructureImportService.parse_excel(file_path)
        mappings = list(ImportFieldMapping.objects.filter(profile=profile))
        result: dict[str, list[dict]] = {}
        for sheet in parsed.sheets:
            headers = [h.strip().lower() for h in sheet.column_headers]
            for row in sheet.rows:
                if row.is_empty:
                    continue
                for m in mappings:
                    col_idx = _find_idx(headers, m.source_column.lower())
                    if col_idx is None:
                        continue
                    val = _val_at(row, col_idx)
                    if val:
                        result.setdefault(m.entity_type, [])
                        existing_rec = None
                        for rec in result[m.entity_type]:
                            if rec.get("_row_number") == row.row_number:
                                existing_rec = rec
                                break
                        if existing_rec is None:
                            existing_rec = {"_row_number": row.row_number}
                            result[m.entity_type].append(existing_rec)
                        existing_rec[m.target_field] = val
        for entity_type in result:
            for rec in result[entity_type]:
                rec.pop("_row_number", None)
        return result

    @staticmethod
    def _lookup_entity(entity_type: str, key: str) -> Any | None:
        model_map = {
            "Department": Department,
            "ResourceGroup": ResourceGroup,
            "Resource": Resource,
        }
        model = model_map.get(entity_type)
        if not model:
            return None
        try:
            return model.objects.get(code__iexact=key)
        except model.DoesNotExist:
            return None

    @staticmethod
    def activate_profile(profile_id: str) -> ImportProfile:
        profile = ERPMappingService.get_profile(profile_id)
        validation = ERPMappingService.validate_mapping(profile_id)
        if not validation.ok:
            raise ERPMappingError("validation", "VALIDATION_FAILED",
                                  f"Cannot activate: {len(validation.blocking_errors)} blocking error(s)")
        ImportProfile.objects.filter(is_active=True).update(is_active=False)
        profile.is_active = True
        profile.save(update_fields=["is_active", "updated_at"])
        return profile

    @staticmethod
    def export_mapping(profile_id: str) -> list[dict]:
        profile = ERPMappingService.get_profile(profile_id)
        return [
            {
                "entity_type": m.entity_type,
                "source_column": m.source_column,
                "target_field": m.target_field,
                "is_required": m.is_required,
                "transform_rule": m.transform_rule,
            }
            for m in ImportFieldMapping.objects.filter(profile=profile).order_by("entity_type", "sort_order")
        ]


def _find_idx(headers: list[str], *names: str) -> int | None:
    norm_names = [_normalize(n) for n in names]
    for i, h in enumerate(headers):
        h_norm = _normalize(h)
        for n_norm in norm_names:
            if h_norm == n_norm or h_norm.startswith(n_norm) or n_norm.startswith(h_norm) or n_norm in h_norm or h_norm in n_norm:
                return i
    return None


def _val_at(row, idx: int | None) -> str:
    if idx is not None and idx < len(row.values):
        v = row.values[idx]
        return str(v) if v is not None else ""
    return ""
