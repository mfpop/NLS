from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from django.db import transaction

from manufacturing.models import (
    ImportJob, ImportCompareResult, ImportValidationError, MappingRule,
    Company, Plant, Department, ProductionLine, ResourceGroup, Resource,
    ProductFamily, ProductModel, ProductVariant, Material,
)
from manufacturing.domain.structure_service import StructureService, StructureServiceError
from manufacturing.domain.department_service import DepartmentService, DepartmentServiceError
from manufacturing.domain.file_parser_service import ParseResult, SheetData, ParsedRow


@dataclass
class ValidationIssue:
    sheet_name: str
    row_number: int
    entity_type: str
    field_name: str | None
    error_code: str
    message: str
    raw_value: str | None


@dataclass
class CompareRow:
    action: str  # CREATE, UPDATE, UNCHANGED, CONFLICT, DEACTIVATE
    entity_type: str
    stable_key: str
    current_value: dict | None
    incoming_value: dict
    diff: dict
    status: str = "PENDING"


@dataclass
class ApplyResult:
    records_created: int = 0
    records_updated: int = 0
    records_failed: int = 0
    error_summary: str = ""


class DomainImportHandler:
    """Base class for domain-specific import handlers."""

    domain: str = ""
    entity_types: list[str] = field(default_factory=list)

    def validate(self, sheets: list[SheetData], mapping_rules: list[MappingRule]) -> list[ValidationIssue]:
        raise NotImplementedError

    def compare(self, sheets: list[SheetData], mapping_rules: list | None = None) -> list[CompareRow]:
        raise NotImplementedError

    def apply(self, sheets: list[SheetData], compare_rows: list[CompareRow]) -> ApplyResult:
        raise NotImplementedError


# ── Helper ──

def _col_value(row: ParsedRow, col_index: int) -> str | None:
    if col_index < len(row.values):
        return row.values[col_index]
    return None


def _normalize(name: str) -> str:
    return name.strip().lower().replace(" ", "").replace("_", "").replace("-", "")


def _find_column(headers: list[str], *names: str) -> int | None:
    """Find a column header matching any of the given names (case-insensitive, normalized)."""
    norm_names = [_normalize(n) for n in names]
    # Build normalized-to-original mapping for headers
    for i, h in enumerate(headers):
        h_norm = _normalize(h)
        for n_norm in norm_names:
            if h_norm == n_norm or h_norm.startswith(n_norm) or n_norm.startswith(h_norm):
                return i
    # Second pass: sub-string matching for aliases
    for i, h in enumerate(headers):
        h_norm = _normalize(h)
        for n_norm in norm_names:
            if n_norm in h_norm or h_norm in n_norm:
                return i
    return None


def _val(row: ParsedRow, headers: list[str], *names: str) -> str:
    idx = _find_column(headers, *names)
    if idx is not None:
        return _col_value(row, idx) or ""
    return ""


# ── Plant Structure Import Handler ──

class PlantStructureImportHandler(DomainImportHandler):
    """Handles PLANT_STRUCTURE domain: Companies → Plants → Departments → Lines → Groups → Resources"""

    domain = "PLANT_STRUCTURE"
    entity_types = ["Company", "Plant", "Department", "ProductionLine", "ResourceGroup", "Resource"]

    # ── Validation ──

    def validate(self, sheets: list[SheetData], mapping_rules: list[MappingRule]) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        for sheet in sheets:
            sheet_lower = sheet.sheet_name.lower()
            if "plant" in sheet_lower:
                issues.extend(self._validate_plants(sheet))
            elif "department" in sheet_lower or "dept" in sheet_lower:
                issues.extend(self._validate_departments(sheet))
            elif "line" in sheet_lower or "production" in sheet_lower:
                issues.extend(self._validate_lines(sheet))
            elif "group" in sheet_lower or "resource" in sheet_lower:
                issues.extend(self._validate_groups(sheet))
        return issues

    def _validate_plants(self, sheet: SheetData) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        headers = sheet.column_headers
        code_idx = _find_column(headers, "code", "plant_code", "plant code")
        name_idx = _find_column(headers, "name", "plant_name", "plant name")

        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _col_value(row, code_idx) if code_idx is not None else None
            name = _col_value(row, name_idx) if name_idx is not None else None

            if not code:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="Plant", field_name="code",
                    error_code="REQUIRED", message="Plant code is required", raw_value=code,
                ))
            if not name:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="Plant", field_name="name",
                    error_code="REQUIRED", message="Plant name is required", raw_value=name,
                ))
            if code and len(code) > 50:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="Plant", field_name="code",
                    error_code="MAX_LENGTH", message="Plant code must be 50 characters or less", raw_value=code,
                ))
        return issues

    def _validate_departments(self, sheet: SheetData) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        headers = sheet.column_headers
        code_idx = _find_column(headers, "code", "dept_code", "department_code")
        name_idx = _find_column(headers, "name", "dept_name", "department_name")
        plant_code_idx = _find_column(headers, "plant_code", "plant", "plant code")

        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _col_value(row, code_idx) if code_idx is not None else None
            name = _col_value(row, name_idx) if name_idx is not None else None
            plant_code = _col_value(row, plant_code_idx) if plant_code_idx is not None else None

            if not code:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="Department", field_name="code",
                    error_code="REQUIRED", message="Department code is required", raw_value=code,
                ))
            if not name:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="Department", field_name="name",
                    error_code="REQUIRED", message="Department name is required", raw_value=name,
                ))
            if not plant_code:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="Department", field_name="plant_code",
                    error_code="REQUIRED", message="Plant code reference is required", raw_value=plant_code,
                ))
        return issues

    def _validate_lines(self, sheet: SheetData) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        headers = sheet.column_headers
        code_idx = _find_column(headers, "code", "line_code")
        name_idx = _find_column(headers, "name", "line_name")
        plant_code_idx = _find_column(headers, "plant_code", "plant")

        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _col_value(row, code_idx) if code_idx is not None else None
            name = _col_value(row, name_idx) if name_idx is not None else None
            plant_code = _col_value(row, plant_code_idx) if plant_code_idx is not None else None

            if not code:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="ProductionLine", field_name="code",
                    error_code="REQUIRED", message="Production line code is required", raw_value=code,
                ))
            if not name:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="ProductionLine", field_name="name",
                    error_code="REQUIRED", message="Production line name is required", raw_value=name,
                ))
            if not plant_code:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="ProductionLine", field_name="plant_code",
                    error_code="REQUIRED", message="Plant code reference is required", raw_value=plant_code,
                ))
        return issues

    def _validate_groups(self, sheet: SheetData) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        headers = sheet.column_headers
        code_idx = _find_column(headers, "code", "group_code")
        name_idx = _find_column(headers, "name", "group_name")
        dept_code_idx = _find_column(headers, "dept_code", "department_code", "department")

        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _col_value(row, code_idx) if code_idx is not None else None
            name = _col_value(row, name_idx) if name_idx is not None else None
            dept_code = _col_value(row, dept_code_idx) if dept_code_idx is not None else None

            if not code:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="ResourceGroup", field_name="code",
                    error_code="REQUIRED", message="Resource group code is required", raw_value=code,
                ))
            if not name:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="ResourceGroup", field_name="name",
                    error_code="REQUIRED", message="Resource group name is required", raw_value=name,
                ))
            if not dept_code:
                issues.append(ValidationIssue(
                    sheet_name=sheet.sheet_name, row_number=row.row_number,
                    entity_type="ResourceGroup", field_name="department_code",
                    error_code="REQUIRED", message="Department code reference is required", raw_value=dept_code,
                ))
        return issues

    # ── Comparison ──

    def compare(self, sheets: list[SheetData], mapping_rules: list[MappingRule] | None = None) -> list[CompareRow]:
        rows: list[CompareRow] = []
        for sheet in sheets:
            sheet_lower = sheet.sheet_name.lower()
            if "company" in sheet_lower:
                rows.extend(self._compare_companies(sheet))
            elif "plant" in sheet_lower and "department" not in sheet_lower:
                rows.extend(self._compare_plants(sheet))
            elif "department" in sheet_lower and "linedepartment" not in sheet_lower and "productionlinedepartment" not in sheet_lower:
                rows.extend(self._compare_departments(sheet))
            elif "line" in sheet_lower or "production" in sheet_lower:
                if "department" in sheet_lower or "assignment" in sheet_lower:
                    rows.extend(self._compare_assignments(sheet))
                else:
                    rows.extend(self._compare_lines(sheet))
            elif "resourcegroup" in sheet_lower or "group" in sheet_lower:
                rows.extend(self._compare_groups(sheet))
            elif "resource" in sheet_lower:
                rows.extend(self._compare_resources(sheet))
        return rows

    def _compare_companies(self, sheet: SheetData) -> list[CompareRow]:
        rows: list[CompareRow] = []
        headers = sheet.column_headers
        for row_data in sheet.rows:
            if row_data.is_empty:
                continue
            code = _val(row_data, headers, "code", "company_code", "company")
            if not code:
                continue
            name = _val(row_data, headers, "name", "company_name", "companyname")
            incoming = {"code": code, "name": name}

            try:
                existing = Company.objects.get(code__iexact=code)
                current = {"code": existing.code, "name": existing.name}
                diff = {}
                for k, v in incoming.items():
                    if v and str(getattr(existing, k, "")).lower() != str(v).lower():
                        diff[k] = {"from": getattr(existing, k, ""), "to": v}
                action = "UPDATE" if diff else "UNCHANGED"
                rows.append(CompareRow(
                    action=action, entity_type="Company",
                    stable_key=code,
                    current_value=current, incoming_value=incoming, diff=diff,
                ))
            except Company.DoesNotExist:
                rows.append(CompareRow(
                    action="CREATE", entity_type="Company",
                    stable_key=code,
                    current_value=None, incoming_value=incoming, diff=incoming,
                ))
        return rows

    def _compare_assignments(self, sheet: SheetData) -> list[CompareRow]:
        rows: list[CompareRow] = []
        headers = sheet.column_headers
        for row_data in sheet.rows:
            if row_data.is_empty:
                continue
            plant_code = _val(row_data, headers, "plant", "plant_code", "plantcode")
            line_code = _val(row_data, headers, "line", "line_code", "linecode", "productionline")
            dept_code = _val(row_data, headers, "department", "dept", "department_code", "dept_code")
            if not line_code or not dept_code:
                continue
            key = f"{plant_code or ''}/{line_code}/{dept_code}"
            sequence = _val(row_data, headers, "sequence", "seq")
            incoming = {"plant_code": plant_code, "line_code": line_code, "department_code": dept_code, "sequence": sequence}

            try:
                line = ProductionLine.objects.get(code__iexact=line_code) if line_code else None
                dept = Department.objects.get(code__iexact=dept_code) if dept_code else None
                current = {"line_code": line_code, "department_code": dept_code, "sequence": sequence}
                diff = {}
                # Check if assignment exists (line department relationship)
                if line and dept:
                    existing_dept_ids = list(line.departments.values_list("id", flat=True))
                    if dept.id in existing_dept_ids:
                        action = "UNCHANGED"
                    else:
                        diff["department_code"] = {"from": None, "to": dept_code}
                        action = "UPDATE"
                else:
                    action = "CREATE"
                rows.append(CompareRow(
                    action=action, entity_type="Assignment",
                    stable_key=key,
                    current_value=current, incoming_value=incoming, diff=diff,
                ))
            except (ProductionLine.DoesNotExist, Department.DoesNotExist):
                rows.append(CompareRow(
                    action="CREATE", entity_type="Assignment",
                    stable_key=key,
                    current_value=None, incoming_value=incoming, diff=incoming,
                ))
        return rows

    def _compare_resources(self, sheet: SheetData) -> list[CompareRow]:
        rows: list[CompareRow] = []
        headers = sheet.column_headers
        for row_data in sheet.rows:
            if row_data.is_empty:
                continue
            code = _val(row_data, headers, "code", "resource_code", "resource", "resourceid", "resource_id")
            if not code:
                continue
            name = _val(row_data, headers, "name", "description", "resource_name", "resource_description")
            group_code = _val(row_data, headers, "group", "group_code", "resourcegroup", "resource_group", "resource_group_code", "resourcegrpid", "resource_group_id")
            incoming = {"code": code, "name": name}
            if group_code:
                incoming["resource_group_code"] = group_code

            try:
                existing = Resource.objects.get(code__iexact=code)
                current = {"code": existing.code, "name": existing.name}
                diff = {}
                for k, v in incoming.items():
                    if k == "resource_group_code":
                        continue
                    if v and str(getattr(existing, k, "")).lower() != str(v).lower():
                        diff[k] = {"from": getattr(existing, k, ""), "to": v}
                action = "UPDATE" if diff else "UNCHANGED"
                rows.append(CompareRow(
                    action=action, entity_type="Resource",
                    stable_key=code,
                    current_value=current, incoming_value=incoming, diff=diff,
                ))
            except Resource.DoesNotExist:
                rows.append(CompareRow(
                    action="CREATE", entity_type="Resource",
                    stable_key=code,
                    current_value=None, incoming_value=incoming, diff=incoming,
                ))
        return rows

    def _compare_plants(self, sheet: SheetData) -> list[CompareRow]:
        rows: list[CompareRow] = []
        headers = sheet.column_headers
        for row_data in sheet.rows:
            if row_data.is_empty:
                continue
            code = _val(row_data, headers, "code", "plant_code")
            if not code:
                continue
            name = _val(row_data, headers, "name", "plant_name")
            incoming = {"code": code, "name": name}

            try:
                existing = Plant.objects.get(code__iexact=code)
                current = {"code": existing.code, "name": existing.name}
                diff = {}
                for k, v in incoming.items():
                    if str(getattr(existing, k, "")).lower() != str(v).lower():
                        diff[k] = {"from": getattr(existing, k, ""), "to": v}
                if diff:
                    action = "UPDATE"
                else:
                    action = "UNCHANGED"
                rows.append(CompareRow(
                    action=action, entity_type="Plant",
                    stable_key=code,
                    current_value=current, incoming_value=incoming, diff=diff,
                ))
            except Plant.DoesNotExist:
                rows.append(CompareRow(
                    action="CREATE", entity_type="Plant",
                    stable_key=code,
                    current_value=None, incoming_value=incoming, diff=incoming,
                ))
        return rows

    def _compare_departments(self, sheet: SheetData) -> list[CompareRow]:
        rows: list[CompareRow] = []
        headers = sheet.column_headers
        for row_data in sheet.rows:
            if row_data.is_empty:
                continue
            code = _val(row_data, headers, "code", "dept_code", "department_code")
            name = _val(row_data, headers, "name", "dept_name", "department_name")
            if not code:
                continue
            incoming = {"code": code, "name": name}

            try:
                existing = Department.objects.get(code__iexact=code)
                current = {"code": existing.code, "name": existing.name}
                diff = {}
                for k, v in incoming.items():
                    if str(getattr(existing, k, "")).lower() != str(v).lower():
                        diff[k] = {"from": getattr(existing, k, ""), "to": v}
                action = "UPDATE" if diff else "UNCHANGED"
                rows.append(CompareRow(
                    action=action, entity_type="Department",
                    stable_key=code,
                    current_value=current, incoming_value=incoming, diff=diff,
                ))
            except Department.DoesNotExist:
                rows.append(CompareRow(
                    action="CREATE", entity_type="Department",
                    stable_key=code,
                    current_value=None, incoming_value=incoming, diff=incoming,
                ))
        return rows

    def _compare_lines(self, sheet: SheetData) -> list[CompareRow]:
        rows: list[CompareRow] = []
        headers = sheet.column_headers
        for row_data in sheet.rows:
            if row_data.is_empty:
                continue
            code = _val(row_data, headers, "code", "line_code")
            if not code:
                continue
            name = _val(row_data, headers, "name", "line_name")
            incoming = {"code": code, "name": name}

            try:
                existing = ProductionLine.objects.get(code__iexact=code)
                current = {"code": existing.code, "name": existing.name}
                diff = {}
                for k, v in incoming.items():
                    if str(getattr(existing, k, "")).lower() != str(v).lower():
                        diff[k] = {"from": getattr(existing, k, ""), "to": v}
                action = "UPDATE" if diff else "UNCHANGED"
                rows.append(CompareRow(
                    action=action, entity_type="ProductionLine",
                    stable_key=code,
                    current_value=current, incoming_value=incoming, diff=diff,
                ))
            except ProductionLine.DoesNotExist:
                rows.append(CompareRow(
                    action="CREATE", entity_type="ProductionLine",
                    stable_key=code,
                    current_value=None, incoming_value=incoming, diff=incoming,
                ))
        return rows

    def _compare_groups(self, sheet: SheetData) -> list[CompareRow]:
        rows: list[CompareRow] = []
        headers = sheet.column_headers
        for row_data in sheet.rows:
            if row_data.is_empty:
                continue
            code = _val(row_data, headers, "code", "group_code")
            if not code:
                continue
            name = _val(row_data, headers, "name", "group_name")
            incoming = {"code": code, "name": name}

            try:
                existing = ResourceGroup.objects.get(code__iexact=code)
                current = {"code": existing.code, "name": existing.name}
                diff = {}
                for k, v in incoming.items():
                    if str(getattr(existing, k, "")).lower() != str(v).lower():
                        diff[k] = {"from": getattr(existing, k, ""), "to": v}
                action = "UPDATE" if diff else "UNCHANGED"
                rows.append(CompareRow(
                    action=action, entity_type="ResourceGroup",
                    stable_key=code,
                    current_value=current, incoming_value=incoming, diff=diff,
                ))
            except ResourceGroup.DoesNotExist:
                rows.append(CompareRow(
                    action="CREATE", entity_type="ResourceGroup",
                    stable_key=code,
                    current_value=None, incoming_value=incoming, diff=incoming,
                ))
        return rows

    # ── Application ──

    @transaction.atomic
    def apply(self, sheets: list[SheetData], compare_rows: list[CompareRow]) -> ApplyResult:
        result = ApplyResult()

        # Group compare rows by entity type
        creates = [r for r in compare_rows if r.action == "CREATE"]
        updates = [r for r in compare_rows if r.action == "UPDATE"]

        for row in creates:
            try:
                self._apply_create(row)
                result.records_created += 1
            except (StructureServiceError, DepartmentServiceError) as exc:
                result.records_failed += 1
                result.error_summary += f"[{row.entity_type}:{row.stable_key}] {exc.message}; "

        for row in updates:
            try:
                self._apply_update(row)
                result.records_updated += 1
            except (StructureServiceError, DepartmentServiceError) as exc:
                result.records_failed += 1
                result.error_summary += f"[{row.entity_type}:{row.stable_key}] {exc.message}; "

        if result.error_summary:
            result.error_summary = result.error_summary.rstrip("; ")

        return result

    def _apply_create(self, row: CompareRow) -> None:
        iv = row.incoming_value
        if row.entity_type == "Plant":
            self._create_plant_from_data(iv)
        elif row.entity_type == "Department":
            self._create_department_from_data(iv)
        elif row.entity_type == "ProductionLine":
            self._create_line_from_data(iv)
        elif row.entity_type == "ResourceGroup":
            self._create_group_from_data(iv)

    def _apply_update(self, row: CompareRow) -> None:
        iv = row.incoming_value
        if row.entity_type == "Plant":
            self._update_plant_from_data(iv)
        elif row.entity_type == "Department":
            self._update_department_from_data(iv)
        elif row.entity_type == "ProductionLine":
            self._update_line_from_data(iv)
        elif row.entity_type == "ResourceGroup":
            self._update_group_from_data(iv)

    def _get_primary_company(self) -> Company:
        company = Company.objects.order_by("id").first()
        if not company:
            raise StructureServiceError("companyId", "NOT_FOUND", "No company exists. Create a company first.")
        return company

    def _resolve_plant(self, code: str) -> Plant | None:
        try:
            return Plant.objects.get(code__iexact=code)
        except Plant.DoesNotExist:
            return None

    def _resolve_department(self, code: str) -> Department | None:
        try:
            return Department.objects.get(code__iexact=code)
        except Department.DoesNotExist:
            return None

    def _resolve_line(self, code: str) -> ProductionLine | None:
        try:
            return ProductionLine.objects.get(code__iexact=code)
        except ProductionLine.DoesNotExist:
            return None

    def _create_plant_from_data(self, data: dict) -> Plant:
        company = self._get_primary_company()
        return StructureService.create_plant(
            _InputProxy(code=data.get("code", ""), name=data.get("name", ""),
                       description=data.get("description", ""), status="ACTIVE"),
            company_id=str(company.id),
        )

    def _update_plant_from_data(self, data: dict) -> Plant:
        plant = self._resolve_plant(data.get("code", ""))
        if not plant:
            return self._create_plant_from_data(data)
        return StructureService.update_plant(
            str(plant.id),
            _InputProxy(code=data.get("code", ""), name=data.get("name", "")),
        )

    def _create_department_from_data(self, data: dict) -> Department:
        company = self._get_primary_company()
        plants = list(Plant.objects.filter(company=company)[:1])
        if not plants:
            raise StructureServiceError("plantId", "NOT_FOUND", "No plant found to assign department")
        return DepartmentService.create(
            _InputProxy(
                code=data.get("code", ""), name=data.get("name", ""),
                plant_id=str(plants[0].id), description=data.get("description", ""),
                status="ACTIVE",
            )
        )

    def _update_department_from_data(self, data: dict) -> Department:
        dept = self._resolve_department(data.get("code", ""))
        if not dept:
            return self._create_department_from_data(data)
        return DepartmentService.update(
            str(dept.id),
            _InputProxy(
                code=data.get("code", ""), name=data.get("name", ""),
                plant_id=str(dept.plant_id),
            )
        )

    def _create_line_from_data(self, data: dict) -> ProductionLine:
        company = self._get_primary_company()
        plants = list(Plant.objects.filter(company=company)[:1])
        if not plants:
            raise StructureServiceError("plantId", "NOT_FOUND", "No plant found to assign line")
        return StructureService.create_production_line(
            _InputProxy(
                code=data.get("code", ""), name=data.get("name", ""),
                plant_id=str(plants[0].id),
                description=data.get("description", ""), status="ACTIVE",
            )
        )

    def _update_line_from_data(self, data: dict) -> ProductionLine:
        line = self._resolve_line(data.get("code", ""))
        if not line:
            return self._create_line_from_data(data)
        return StructureService.update_production_line(
            str(line.id),
            _InputProxy(
                code=data.get("code", ""), name=data.get("name", ""),
                plant_id=str(line.plant_id),
            )
        )

    def _create_group_from_data(self, data: dict) -> ResourceGroup:
        depts = list(Department.objects.all()[:1])
        if not depts:
            raise StructureServiceError("departmentId", "NOT_FOUND", "No department found to assign group")
        return StructureService.create_resource_group(
            _InputProxy(
                code=data.get("code", ""), name=data.get("name", ""),
                department_id=str(depts[0].id),
                description=data.get("description", ""),
                status="ACTIVE", members=0, leader="", supervisor="",
                capability_type="SHARED",
            )
        )

    def _update_group_from_data(self, data: dict) -> ResourceGroup:
        try:
            group = ResourceGroup.objects.get(code__iexact=data.get("code", ""))
            return StructureService.update_resource_group(
                str(group.id),
                _InputProxy(
                    code=data.get("code", ""), name=data.get("name", ""),
                    department_id=str(group.department_id),
                )
            )
        except ResourceGroup.DoesNotExist:
            return self._create_group_from_data(data)


# ── Stub handlers for other domains ──

class MaterialsImportHandler(DomainImportHandler):
    """Handles MATERIALS domain: Product Families → Product Models → Product Variants → Part Numbers → Materials."""

    domain = "MATERIALS"
    entity_types = ["ProductFamily", "ProductModel", "ProductVariant", "Material"]

    # ── Column name lookups ──

    # ── Field definitions: (column_names, is_required) ──
    _FAMILY_FIELDS = {
        "code": (["code", "family_code"], True),
        "name": (["name", "family_name"], True),
        "description": (["description"], False),
        "status": (["status"], False),
    }
    _MODEL_FIELDS = {
        "code": (["code", "model_code"], True),
        "name": (["name", "model_name"], True),
        "description": (["description"], False),
        "status": (["status"], False),
        "family_code": (["family_code", "family", "family code"], True),
    }
    _VARIANT_FIELDS = {
        "code": (["code", "variant_code"], True),
        "name": (["name", "variant_name"], True),
        "configuration_summary": (["configuration_summary", "config", "summary"], False),
        "status": (["status"], False),
        "model_code": (["model_code", "model", "model code"], True),
    }
    _MATERIAL_FIELDS = {
        "code": (["code", "material_code"], True),
        "name": (["name", "material_name"], True),
        "description": (["description"], False),
        "material_state": (["material_state", "state", "material state"], False),
        "unit_of_measure": (["unit_of_measure", "uom", "unit"], False),
        "status": (["status"], False),
    }

    # ── Validation ──

    def validate(self, sheets: list[SheetData], mapping_rules: list[MappingRule]) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        for sheet in sheets:
            sheet_lower = sheet.sheet_name.lower()
            if "family" in sheet_lower:
                issues.extend(self._validate_families(sheet))
            elif "model" in sheet_lower:
                issues.extend(self._validate_models(sheet))
            elif "variant" in sheet_lower or "variants" in sheet_lower:
                issues.extend(self._validate_variants(sheet))
            elif "material" in sheet_lower:
                issues.extend(self._validate_materials(sheet))
        return issues

    def _add_issue(self, issues: list[ValidationIssue], sheet: SheetData,
                   row: ParsedRow, entity_type: str, field: str | None,
                   code: str, msg: str, raw: str | None) -> None:
        issues.append(ValidationIssue(
            sheet_name=sheet.sheet_name, row_number=row.row_number,
            entity_type=entity_type, field_name=field,
            error_code=code, message=msg, raw_value=raw,
        ))

    def _extract_and_validate(self, issues, sheet, row, entity_type, headers, field_config) -> dict[str, str]:
        """Extract field values from a row and validate required fields and max length."""
        values = {}
        for field_name, (names, required) in field_config.items():
            idx = _find_column(headers, *names)
            val = _col_value(row, idx) if idx is not None else None
            values[field_name] = val or ""
            if required and not val:
                self._add_issue(issues, sheet, row, entity_type, field_name,
                               "REQUIRED", f"{field_name.replace('_', ' ').title()} is required", val)
            elif isinstance(val, str) and len(val) > 200:
                self._add_issue(issues, sheet, row, entity_type, field_name,
                               "MAX_LENGTH", f"{field_name.replace('_', ' ').title()} must be 200 characters or less", val)
        return values

    def _validate_families(self, sheet: SheetData) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        headers = sheet.column_headers
        for row in sheet.rows:
            if row.is_empty:
                continue
            vals = self._extract_and_validate(issues, sheet, row, "ProductFamily", headers, self._FAMILY_FIELDS)
            # Validate status if provided
            status = vals.get("status", "")
            if status and status.upper() not in ("ACTIVE", "INACTIVE", "ARCHIVED", "DRAFT"):
                self._add_issue(issues, sheet, row, "ProductFamily", "status",
                               "INVALID_STATUS", f"Invalid status: {status}", status)
        return issues

    def _validate_models(self, sheet: SheetData) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        headers = sheet.column_headers
        for row in sheet.rows:
            if row.is_empty:
                continue
            vals = self._extract_and_validate(issues, sheet, row, "ProductModel", headers, self._MODEL_FIELDS)
            status = vals.get("status", "")
            if status and status.upper() not in ("ACTIVE", "INACTIVE", "ARCHIVED", "DRAFT"):
                self._add_issue(issues, sheet, row, "ProductModel", "status",
                               "INVALID_STATUS", f"Invalid status: {status}", status)
            # Validate family_code is present (required for model)
            if not vals.get("family_code"):
                self._add_issue(issues, sheet, row, "ProductModel", "family_code",
                               "REQUIRED", "Family code reference is required for product model", vals.get("family_code"))
        return issues

    def _validate_variants(self, sheet: SheetData) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        headers = sheet.column_headers
        for row in sheet.rows:
            if row.is_empty:
                continue
            vals = self._extract_and_validate(issues, sheet, row, "ProductVariant", headers, self._VARIANT_FIELDS)
            status = vals.get("status", "")
            if status and status.upper() not in ("ACTIVE", "INACTIVE", "ARCHIVED", "DRAFT"):
                self._add_issue(issues, sheet, row, "ProductVariant", "status",
                               "INVALID_STATUS", f"Invalid status: {status}", status)
            if not vals.get("model_code"):
                self._add_issue(issues, sheet, row, "ProductVariant", "model_code",
                               "REQUIRED", "Model code reference is required for product variant", vals.get("model_code"))
        return issues

    def _validate_materials(self, sheet: SheetData) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        headers = sheet.column_headers
        for row in sheet.rows:
            if row.is_empty:
                continue
            vals = self._extract_and_validate(issues, sheet, row, "Material", headers, self._MATERIAL_FIELDS)
            status = vals.get("status", "")
            if status and status.upper() not in ("ACTIVE", "INACTIVE", "ARCHIVED", "DRAFT"):
                self._add_issue(issues, sheet, row, "Material", "status",
                               "INVALID_STATUS", f"Invalid status: {status}", status)
            material_state = vals.get("material_state", "")
            valid_states = ("RAW_MATERIAL", "WIP", "FINISHED_GOOD", "SCRAP")
            if material_state and material_state.upper() not in valid_states:
                self._add_issue(issues, sheet, row, "Material", "material_state",
                               "INVALID_STATE", f"Invalid material state: {material_state}. Must be one of {', '.join(valid_states)}", material_state)
        return issues

    # ── Comparison ──

    def compare(self, sheets: list[SheetData], mapping_rules: list | None = None) -> list[CompareRow]:
        rows: list[CompareRow] = []
        for sheet in sheets:
            sheet_lower = sheet.sheet_name.lower()
            if "family" in sheet_lower:
                rows.extend(self._compare_families(sheet))
            elif "model" in sheet_lower:
                rows.extend(self._compare_models(sheet))
            elif "variant" in sheet_lower or "variants" in sheet_lower:
                rows.extend(self._compare_variants(sheet))
            elif "material" in sheet_lower:
                rows.extend(self._compare_materials(sheet))
        return rows

    def _compare_families(self, sheet: SheetData) -> list[CompareRow]:
        result: list[CompareRow] = []
        headers = sheet.column_headers
        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _val(row, headers, "code", "family_code")
            if not code:
                continue
            incoming = {
                "code": code,
                "name": _val(row, headers, "name", "family_name"),
                "description": _val(row, headers, "description"),
                "status": _val(row, headers, "status") or "ACTIVE",
            }
            result.append(self._compare_entity(ProductFamily, "iexact", "code", incoming, "ProductFamily", code))
        return result

    def _compare_models(self, sheet: SheetData) -> list[CompareRow]:
        result: list[CompareRow] = []
        headers = sheet.column_headers
        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _val(row, headers, "code", "model_code")
            if not code:
                continue
            incoming = {
                "code": code,
                "name": _val(row, headers, "name", "model_name"),
                "description": _val(row, headers, "description"),
                "family_code": _val(row, headers, "family_code", "family", "family code"),
                "status": _val(row, headers, "status") or "ACTIVE",
            }
            result.append(self._compare_entity(ProductModel, "iexact", "code", incoming, "ProductModel", code))
        return result

    def _compare_variants(self, sheet: SheetData) -> list[CompareRow]:
        result: list[CompareRow] = []
        headers = sheet.column_headers
        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _val(row, headers, "code", "variant_code")
            if not code:
                continue
            incoming = {
                "code": code,
                "name": _val(row, headers, "name", "variant_name"),
                "configuration_summary": _val(row, headers, "configuration_summary", "config", "summary"),
                "model_code": _val(row, headers, "model_code", "model", "model code"),
                "status": _val(row, headers, "status") or "ACTIVE",
            }
            result.append(self._compare_entity(ProductVariant, "iexact", "code", incoming, "ProductVariant", code))
        return result

    def _compare_materials(self, sheet: SheetData) -> list[CompareRow]:
        result: list[CompareRow] = []
        headers = sheet.column_headers
        for row in sheet.rows:
            if row.is_empty:
                continue
            code = _val(row, headers, "code", "material_code")
            if not code:
                continue
            incoming = {
                "code": code,
                "name": _val(row, headers, "name", "material_name"),
                "description": _val(row, headers, "description"),
                "material_state": (_val(row, headers, "material_state", "state", "material state") or "RAW_MATERIAL").upper(),
                "uom_name": _val(row, headers, "unit_of_measure", "uom", "unit"),
                "status": _val(row, headers, "status") or "ACTIVE",
            }
            result.append(self._compare_entity(Material, "iexact", "code", incoming, "Material", code))
        return result

    def _compare_entity(
        self, model_class, lookup: str, key_field: str,
        incoming: dict, entity_type: str, stable_key: str,
    ) -> CompareRow:
        """Generic comparison: look up existing record and diff."""
        filter_kw = {f"{key_field}__{lookup}": stable_key} if lookup else {key_field: stable_key}
        try:
            existing = model_class.objects.get(**filter_kw)
        except model_class.DoesNotExist:
            return CompareRow(
                action="CREATE", entity_type=entity_type,
                stable_key=stable_key,
                current_value=None, incoming_value=incoming, diff=incoming,
            )

        current = {}
        diff = {}
        for k, v in incoming.items():
            if hasattr(existing, k):
                current_v = str(getattr(existing, k, "") or "")
                current[k] = getattr(existing, k, "")
                if str(v).lower() != current_v.lower():
                    diff[k] = {"from": getattr(existing, k, ""), "to": v}
            elif k in ("uom_name",):
                # Skip non-model fields used for display/reference
                pass

        action = "UPDATE" if diff else "UNCHANGED"
        return CompareRow(
            action=action, entity_type=entity_type,
            stable_key=stable_key,
            current_value=current, incoming_value=incoming, diff=diff,
        )

    # ── Application ──

    @transaction.atomic
    def apply(self, sheets: list[SheetData], compare_rows: list[CompareRow]) -> ApplyResult:
        from manufacturing.domain.product_identity_service import ProductIdentityService, ProductIdentityError

        result = ApplyResult()

        creates = [r for r in compare_rows if r.action == "CREATE"]
        updates = [r for r in compare_rows if r.action == "UPDATE"]

        # Build lookup caches for reference resolution
        self._family_cache: dict[str, Any] = {}
        self._model_cache: dict[str, Any] = {}
        self._variant_cache: dict[str, Any] = {}

        # Process creates first (families first, then models, etc.)
        for row in creates:
            try:
                self._apply_create_material_entity(row)
                result.records_created += 1
            except (ProductIdentityError, Exception) as exc:
                msg = str(exc.message) if hasattr(exc, "message") else str(exc)
                result.records_failed += 1
                result.error_summary += f"[{row.entity_type}:{row.stable_key}] {msg}; "

        for row in updates:
            try:
                self._apply_update_material_entity(row)
                result.records_updated += 1
            except (ProductIdentityError, Exception) as exc:
                msg = str(exc.message) if hasattr(exc, "message") else str(exc)
                result.records_failed += 1
                result.error_summary += f"[{row.entity_type}:{row.stable_key}] {msg}; "

        if result.error_summary:
            result.error_summary = result.error_summary.rstrip("; ")

        return result

    def _get_or_create_family(self, code: str, data: dict | None = None) -> Any:
        if code in self._family_cache:
            return self._family_cache[code]
        try:
            family = ProductFamily.objects.get(code__iexact=code)
        except ProductFamily.DoesNotExist:
            from manufacturing.domain.product_identity_service import ProductIdentityService
            family = ProductIdentityService.create_family({
                "code": code,
                "name": (data or {}).get("name", code),
                "description": (data or {}).get("description", ""),
                "status": (data or {}).get("status", "ACTIVE"),
            })
        self._family_cache[code] = family
        return family

    def _get_or_create_model(self, code: str, data: dict | None = None) -> Any:
        if code in self._model_cache:
            return self._model_cache[code]
        try:
            model = ProductModel.objects.get(code__iexact=code)
        except ProductModel.DoesNotExist:
            from manufacturing.domain.product_identity_service import ProductIdentityService
            family_code = (data or {}).get("family_code", "")
            family = self._get_or_create_family(family_code) if family_code else None
            model = ProductIdentityService.create_model({
                "code": code,
                "name": (data or {}).get("name", code),
                "description": (data or {}).get("description", ""),
                "family_id": str(family.id) if family else None,
                "status": (data or {}).get("status", "ACTIVE"),
            })
        self._model_cache[code] = model
        return model

    def _get_or_create_variant(self, code: str, data: dict | None = None) -> Any:
        if code in self._variant_cache:
            return self._variant_cache[code]
        try:
            variant = ProductVariant.objects.get(code__iexact=code)
        except ProductVariant.DoesNotExist:
            from manufacturing.domain.product_identity_service import ProductIdentityService
            model_code = (data or {}).get("model_code", "")
            model = self._get_or_create_model(model_code, data) if model_code else None
            variant = ProductIdentityService.create_variant({
                "code": code,
                "name": (data or {}).get("name", code),
                "configuration_summary": (data or {}).get("configuration_summary", ""),
                "model_id": str(model.id) if model else None,
                "status": (data or {}).get("status", "ACTIVE"),
            })
        self._variant_cache[code] = variant
        return variant

    def _apply_create_material_entity(self, row: CompareRow) -> None:
        iv = row.incoming_value
        if row.entity_type == "ProductFamily":
            from manufacturing.domain.product_identity_service import ProductIdentityService
            ProductIdentityService.create_family({
                "code": iv.get("code", ""),
                "name": iv.get("name", ""),
                "description": iv.get("description", ""),
                "status": iv.get("status", "ACTIVE"),
            })
        elif row.entity_type == "ProductModel":
            family = self._get_or_create_family(iv.get("family_code", ""), iv)
            from manufacturing.domain.product_identity_service import ProductIdentityService
            ProductIdentityService.create_model({
                "code": iv.get("code", ""),
                "name": iv.get("name", ""),
                "description": iv.get("description", ""),
                "family_id": str(family.id),
                "status": iv.get("status", "ACTIVE"),
            })
        elif row.entity_type == "ProductVariant":
            model = self._get_or_create_model(iv.get("model_code", ""), iv)
            from manufacturing.domain.product_identity_service import ProductIdentityService
            ProductIdentityService.create_variant({
                "code": iv.get("code", ""),
                "name": iv.get("name", ""),
                "configuration_summary": iv.get("configuration_summary", ""),
                "model_id": str(model.id),
                "status": iv.get("status", "ACTIVE"),
            })
        elif row.entity_type == "Material":
            Material.objects.create(
                code=iv.get("code", ""),
                name=iv.get("name", ""),
                description=iv.get("description", ""),
                material_state=iv.get("material_state", "RAW_MATERIAL").upper(),
                status=iv.get("status", "ACTIVE"),
            )

    def _apply_update_material_entity(self, row: CompareRow) -> None:
        from manufacturing.domain.product_identity_service import ProductIdentityService, ProductIdentityError
        iv = row.incoming_value
        sv = row.stable_key

        if row.entity_type == "ProductFamily":
            try:
                family = ProductFamily.objects.get(code__iexact=sv)
                ProductIdentityService.update_family(str(family.id), {
                    "code": iv.get("code", family.code),
                    "name": iv.get("name", family.name),
                    "description": iv.get("description", family.description),
                    "status": iv.get("status", family.status),
                })
            except ProductFamily.DoesNotExist:
                self._apply_create_material_entity(row)
        elif row.entity_type == "ProductModel":
            try:
                model = ProductModel.objects.get(code__iexact=sv)
                family_code = iv.get("family_code", "")
                family = self._get_or_create_family(family_code, iv) if family_code else None
                ProductIdentityService.update_model(str(model.id), {
                    "code": iv.get("code", model.code),
                    "name": iv.get("name", model.name),
                    "description": iv.get("description", model.description),
                    "family_id": str(family.id) if family else None,
                    "status": iv.get("status", model.status),
                })
            except ProductModel.DoesNotExist:
                self._apply_create_material_entity(row)
        elif row.entity_type == "ProductVariant":
            try:
                variant = ProductVariant.objects.get(code__iexact=sv)
                model_code = iv.get("model_code", "")
                model = self._get_or_create_model(model_code, iv) if model_code else None
                ProductIdentityService.update_variant(str(variant.id), {
                    "code": iv.get("code", variant.code),
                    "name": iv.get("name", variant.name),
                    "configuration_summary": iv.get("configuration_summary", variant.configuration_summary),
                    "model_id": str(model.id) if model else None,
                    "status": iv.get("status", variant.status),
                })
            except ProductVariant.DoesNotExist:
                self._apply_create_material_entity(row)
        elif row.entity_type == "Material":
            try:
                mat = Material.objects.get(code__iexact=sv)
                for field in ("code", "name", "description", "material_state", "status"):
                    if field in iv and iv[field]:
                        setattr(mat, field, iv[field].upper() if field == "material_state" else iv[field])
                mat.save()
            except Material.DoesNotExist:
                self._apply_create_material_entity(row)


class BOMImportHandler(DomainImportHandler):
    domain = "BOM"
    entity_types = ["BOMItem"]

    def validate(self, sheets, mapping_rules):
        return []

    def compare(self, sheets, mapping_rules=None):
        return []

    def apply(self, sheets, compare_rows):
        return ApplyResult()


class RoutingImportHandler(DomainImportHandler):
    domain = "ROUTING"
    entity_types = ["RoutingStep"]

    def validate(self, sheets, mapping_rules):
        return []

    def compare(self, sheets, mapping_rules=None):
        return []

    def apply(self, sheets, compare_rows):
        return ApplyResult()


class SchedulesImportHandler(DomainImportHandler):
    domain = "SCHEDULES"
    entity_types = ["Schedule"]

    def validate(self, sheets, mapping_rules):
        return []

    def compare(self, sheets, mapping_rules=None):
        return []

    def apply(self, sheets, compare_rows):
        return ApplyResult()


class InventoryImportHandler(DomainImportHandler):
    domain = "INVENTORY"
    entity_types = ["InventoryItem"]

    def validate(self, sheets, mapping_rules):
        return []

    def compare(self, sheets, mapping_rules=None):
        return []

    def apply(self, sheets, compare_rows):
        return ApplyResult()


# ── Handler registry ──

DOMAIN_HANDLERS: dict[str, type[DomainImportHandler]] = {
    "PLANT_STRUCTURE": PlantStructureImportHandler,
    "MATERIALS": MaterialsImportHandler,
    "BOM": BOMImportHandler,
    "ROUTING": RoutingImportHandler,
    "SCHEDULES": SchedulesImportHandler,
    "INVENTORY": InventoryImportHandler,
}


def get_handler(domain: str) -> DomainImportHandler:
    handler_cls = DOMAIN_HANDLERS.get(domain.upper())
    if handler_cls is None:
        raise ValueError(f"No import handler found for domain: {domain}")
    return handler_cls()


# ── Input proxy ──

class _InputProxy:
    """Minimal proxy to pass kwargs as attribute-based input to domain services."""
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
