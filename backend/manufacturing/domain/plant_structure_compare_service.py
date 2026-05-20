from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any

from manufacturing.domain.plant_structure_import_service import (
    ParsedRow, ParsedWorkbook, PlantStructureImportService,
)
from manufacturing.models import (
    Company, Plant, ProductionLine, Department,
    ProductionLineDepartmentAssignment,
    ResourceGroup, Resource,
)

COMPARE_STATUS_MATCH = "MATCH"
COMPARE_STATUS_MISSING_IN_APP = "MISSING_IN_APP"
COMPARE_STATUS_MISSING_IN_EXCEL = "MISSING_IN_EXCEL"
COMPARE_STATUS_DIFFERENT = "DIFFERENT"
COMPARE_STATUS_INVALID_EXCEL_ROW = "INVALID_EXCEL_ROW"
COMPARE_STATUS_DUPLICATE_IN_EXCEL = "DUPLICATE_IN_EXCEL"


@dataclass
class FieldDifference:
    field: str
    excel_value: str
    app_value: str


@dataclass
class CompareRow:
    sheet: str
    row_number: int
    entity_type: str
    business_key: str
    status: str
    field_differences: list[FieldDifference] = field(default_factory=list)
    message: str = ""


@dataclass
class CompareResult:
    ok: bool
    rows: list[CompareRow] = field(default_factory=list)
    validation_errors: list[Any] = field(default_factory=list)


def _get_field(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()


class PlantStructureCompareService:

    @staticmethod
    def compare_all(file_path: str) -> CompareResult:
        parsed = PlantStructureImportService.parse_excel(file_path)

        ws_errors = PlantStructureImportService.validate_workbook(parsed)
        if ws_errors:
            from manufacturing.domain.plant_structure_import_service import ValidationError
            return CompareResult(ok=False, validation_errors=[
                {"sheet": e.sheet, "row": e.row_number, "field": e.field, "message": e.message}
                for e in ws_errors
            ])

        row_errors = PlantStructureImportService.validate_rows(parsed)
        hierarchy_errors = PlantStructureImportService._validate_hierarchy(parsed)

        result = CompareResult(ok=not (row_errors or hierarchy_errors))
        result.validation_errors = [
            {"sheet": e.sheet, "row": e.row_number, "field": e.field, "message": e.message}
            for e in row_errors + hierarchy_errors
        ]

        result.rows.extend(PlantStructureCompareService._compare_companies(parsed))
        result.rows.extend(PlantStructureCompareService._compare_plants(parsed))
        result.rows.extend(PlantStructureCompareService._compare_production_lines(parsed))
        result.rows.extend(PlantStructureCompareService._compare_departments(parsed))
        result.rows.extend(PlantStructureCompareService._compare_line_departments(parsed))
        result.rows.extend(PlantStructureCompareService._compare_resource_groups(parsed))
        result.rows.extend(PlantStructureCompareService._compare_resources(parsed))

        return result

    @staticmethod
    def _compare_companies(parsed: ParsedWorkbook) -> list[CompareRow]:
        rows: list[CompareRow] = []
        excel_codes: set[str] = set()
        for excel_row in parsed.sheets.get("Companies", []):
            d = excel_row.data
            code = d.get("company_code", "").strip()
            if not code:
                continue
            if code in excel_codes:
                rows.append(CompareRow(
                    sheet="Companies", row_number=excel_row.row_number,
                    entity_type="Company", business_key=code,
                    status=COMPARE_STATUS_DUPLICATE_IN_EXCEL,
                    message=f"Duplicate company code '{code}' in Excel",
                ))
                continue
            excel_codes.add(code)
            try:
                obj = Company.objects.get(code=code)
                diffs: list[FieldDifference] = []
                if _get_field(obj.name) != _get_field(d.get("company_name")):
                    diffs.append(FieldDifference(field="company_name", excel_value=_get_field(d.get("company_name")), app_value=_get_field(obj.name)))
                if d.get("status") and _get_field(obj.status) != d.get("status", "").upper():
                    diffs.append(FieldDifference(field="status", excel_value=d.get("status", ""), app_value=_get_field(obj.status)))
                status = COMPARE_STATUS_DIFFERENT if diffs else COMPARE_STATUS_MATCH
                rows.append(CompareRow(
                    sheet="Companies", row_number=excel_row.row_number,
                    entity_type="Company", business_key=code,
                    status=status, field_differences=diffs,
                ))
            except Company.DoesNotExist:
                rows.append(CompareRow(
                    sheet="Companies", row_number=excel_row.row_number,
                    entity_type="Company", business_key=code,
                    status=COMPARE_STATUS_MISSING_IN_APP,
                    message=f"Company '{code}' not found in application",
                ))

        for obj in Company.objects.all():
            if obj.code not in excel_codes:
                rows.append(CompareRow(
                    sheet="Companies", row_number=0,
                    entity_type="Company", business_key=obj.code,
                    status=COMPARE_STATUS_MISSING_IN_EXCEL,
                    message=f"Company '{obj.code}' exists in app but not in Excel",
                ))
        return rows

    @staticmethod
    def _compare_plants(parsed: ParsedWorkbook) -> list[CompareRow]:
        rows: list[CompareRow] = []
        excel_keys: set[str] = set()
        for excel_row in parsed.sheets.get("Plants", []):
            d = excel_row.data
            code = d.get("plant_code", "").strip()
            cc = d.get("company_code", "").strip()
            key = f"{cc}:{code}"
            if not code:
                continue
            if key in excel_keys:
                rows.append(CompareRow(
                    sheet="Plants", row_number=excel_row.row_number,
                    entity_type="Plant", business_key=key,
                    status=COMPARE_STATUS_DUPLICATE_IN_EXCEL,
                    message=f"Duplicate plant '{code}' for company '{cc}'",
                ))
                continue
            excel_keys.add(key)
            try:
                company = Company.objects.filter(code=cc).first() if cc else None
                qs = Plant.objects.filter(code=code)
                if company:
                    qs = qs.filter(company=company)
                obj = qs.first()
                if not obj:
                    raise Plant.DoesNotExist
                diffs: list[FieldDifference] = []
                if _get_field(obj.name) != _get_field(d.get("plant_name")):
                    diffs.append(FieldDifference(field="plant_name", excel_value=_get_field(d.get("plant_name")), app_value=_get_field(obj.name)))
                if d.get("status") and _get_field(obj.status) != d.get("status", "").upper():
                    diffs.append(FieldDifference(field="status", excel_value=d.get("status", ""), app_value=_get_field(obj.status)))
                status = COMPARE_STATUS_DIFFERENT if diffs else COMPARE_STATUS_MATCH
                rows.append(CompareRow(
                    sheet="Plants", row_number=excel_row.row_number,
                    entity_type="Plant", business_key=key,
                    status=status, field_differences=diffs,
                ))
            except Plant.DoesNotExist:
                rows.append(CompareRow(
                    sheet="Plants", row_number=excel_row.row_number,
                    entity_type="Plant", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_APP,
                    message=f"Plant '{code}' for company '{cc}' not found in application",
                ))

        for obj in Plant.objects.all():
            key = f"{obj.company.code}:{obj.code}"
            if key not in excel_keys:
                rows.append(CompareRow(
                    sheet="Plants", row_number=0,
                    entity_type="Plant", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_EXCEL,
                    message=f"Plant '{obj.code}' (company {obj.company.code}) exists in app but not in Excel",
                ))
        return rows

    @staticmethod
    def _compare_production_lines(parsed: ParsedWorkbook) -> list[CompareRow]:
        rows: list[CompareRow] = []
        excel_keys: set[str] = set()
        for excel_row in parsed.sheets.get("ProductionLines", []):
            d = excel_row.data
            code = d.get("line_code", "").strip()
            pc = d.get("plant_code", "").strip()
            key = f"{pc}:{code}"
            if not code:
                continue
            if key in excel_keys:
                rows.append(CompareRow(
                    sheet="ProductionLines", row_number=excel_row.row_number,
                    entity_type="ProductionLine", business_key=key,
                    status=COMPARE_STATUS_DUPLICATE_IN_EXCEL,
                    message=f"Duplicate line '{code}' for plant '{pc}'",
                ))
                continue
            excel_keys.add(key)
            try:
                qs = ProductionLine.objects.filter(code=code)
                if pc:
                    qs = qs.filter(plant__code=pc)
                obj = qs.first()
                if not obj:
                    raise ProductionLine.DoesNotExist
                diffs: list[FieldDifference] = []
                if _get_field(obj.name) != _get_field(d.get("line_name")):
                    diffs.append(FieldDifference(field="line_name", excel_value=_get_field(d.get("line_name")), app_value=_get_field(obj.name)))
                if d.get("status") and _get_field(obj.status) != d.get("status", "").upper():
                    diffs.append(FieldDifference(field="status", excel_value=d.get("status", ""), app_value=_get_field(obj.status)))
                status = COMPARE_STATUS_DIFFERENT if diffs else COMPARE_STATUS_MATCH
                rows.append(CompareRow(
                    sheet="ProductionLines", row_number=excel_row.row_number,
                    entity_type="ProductionLine", business_key=key,
                    status=status, field_differences=diffs,
                ))
            except ProductionLine.DoesNotExist:
                rows.append(CompareRow(
                    sheet="ProductionLines", row_number=excel_row.row_number,
                    entity_type="ProductionLine", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_APP,
                    message=f"Line '{code}' for plant '{pc}' not found in application",
                ))

        for obj in ProductionLine.objects.all():
            key = f"{obj.plant.code}:{obj.code}"
            if key not in excel_keys:
                rows.append(CompareRow(
                    sheet="ProductionLines", row_number=0,
                    entity_type="ProductionLine", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_EXCEL,
                    message=f"Line '{obj.code}' (plant {obj.plant.code}) exists in app but not in Excel",
                ))
        return rows

    @staticmethod
    def _compare_departments(parsed: ParsedWorkbook) -> list[CompareRow]:
        rows: list[CompareRow] = []
        excel_keys: set[str] = set()
        for excel_row in parsed.sheets.get("Departments", []):
            d = excel_row.data
            code = d.get("department_code", "").strip()
            pc = d.get("plant_code", "").strip()
            key = f"{pc}:{code}"
            if not code:
                continue
            if key in excel_keys:
                rows.append(CompareRow(
                    sheet="Departments", row_number=excel_row.row_number,
                    entity_type="Department", business_key=key,
                    status=COMPARE_STATUS_DUPLICATE_IN_EXCEL,
                    message=f"Duplicate department '{code}' for plant '{pc}'",
                ))
                continue
            excel_keys.add(key)
            try:
                qs = Department.objects.filter(code=code)
                if pc:
                    qs = qs.filter(plant__code=pc)
                obj = qs.first()
                if not obj:
                    raise Department.DoesNotExist
                diffs: list[FieldDifference] = []
                if _get_field(obj.name) != _get_field(d.get("department_name")):
                    diffs.append(FieldDifference(field="department_name", excel_value=_get_field(d.get("department_name")), app_value=_get_field(obj.name)))
                if d.get("status") and _get_field(obj.status) != d.get("status", "").upper():
                    diffs.append(FieldDifference(field="status", excel_value=d.get("status", ""), app_value=_get_field(obj.status)))
                status = COMPARE_STATUS_DIFFERENT if diffs else COMPARE_STATUS_MATCH
                rows.append(CompareRow(
                    sheet="Departments", row_number=excel_row.row_number,
                    entity_type="Department", business_key=key,
                    status=status, field_differences=diffs,
                ))
            except Department.DoesNotExist:
                rows.append(CompareRow(
                    sheet="Departments", row_number=excel_row.row_number,
                    entity_type="Department", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_APP,
                    message=f"Department '{code}' for plant '{pc}' not found in application",
                ))

        for obj in Department.objects.all():
            key = f"{obj.plant.code}:{obj.code}"
            if key not in excel_keys:
                rows.append(CompareRow(
                    sheet="Departments", row_number=0,
                    entity_type="Department", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_EXCEL,
                    message=f"Department '{obj.code}' (plant {obj.plant.code}) exists in app but not in Excel",
                ))
        return rows

    @staticmethod
    def _compare_line_departments(parsed: ParsedWorkbook) -> list[CompareRow]:
        rows: list[CompareRow] = []
        excel_keys: set[str] = set()
        for excel_row in parsed.sheets.get("ProductionLineDepartments", []):
            d = excel_row.data
            lc = d.get("line_code", "").strip()
            dc = d.get("department_code", "").strip()
            pc = d.get("plant_code", "").strip()
            key = f"{pc}:{lc}:{dc}"
            if not lc or not dc:
                continue
            if key in excel_keys:
                rows.append(CompareRow(
                    sheet="ProductionLineDepartments", row_number=excel_row.row_number,
                    entity_type="ProductionLineDepartment", business_key=key,
                    status=COMPARE_STATUS_DUPLICATE_IN_EXCEL,
                    message=f"Duplicate assignment line '{lc}' / dept '{dc}'",
                ))
                continue
            excel_keys.add(key)
            try:
                qs = ProductionLineDepartmentAssignment.objects.filter(
                    production_line__code=lc, department__code=dc,
                )
                if pc:
                    qs = qs.filter(plant__code=pc)
                obj = qs.first()
                if not obj:
                    raise ProductionLineDepartmentAssignment.DoesNotExist
                diffs: list[FieldDifference] = []
                seq_str = d.get("sequence", "").strip()
                if seq_str.isdigit():
                    excel_seq = int(seq_str)
                    if obj.sequence != excel_seq:
                        diffs.append(FieldDifference(field="sequence", excel_value=str(excel_seq), app_value=str(obj.sequence)))
                if d.get("status") and _get_field(obj.status) != d.get("status", "").upper():
                    diffs.append(FieldDifference(field="status", excel_value=d.get("status", ""), app_value=_get_field(obj.status)))
                status = COMPARE_STATUS_DIFFERENT if diffs else COMPARE_STATUS_MATCH
                rows.append(CompareRow(
                    sheet="ProductionLineDepartments", row_number=excel_row.row_number,
                    entity_type="ProductionLineDepartment", business_key=key,
                    status=status, field_differences=diffs,
                ))
            except ProductionLineDepartmentAssignment.DoesNotExist:
                rows.append(CompareRow(
                    sheet="ProductionLineDepartments", row_number=excel_row.row_number,
                    entity_type="ProductionLineDepartment", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_APP,
                    message=f"Assignment line '{lc}' / dept '{dc}' (plant {pc}) not found in app",
                ))

        for obj in ProductionLineDepartmentAssignment.objects.all():
            key = f"{obj.plant.code}:{obj.production_line.code}:{obj.department.code}"
            if key not in excel_keys:
                rows.append(CompareRow(
                    sheet="ProductionLineDepartments", row_number=0,
                    entity_type="ProductionLineDepartment", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_EXCEL,
                    message=f"Assignment line '{obj.production_line.code}' / dept '{obj.department.code}' exists in app but not in Excel",
                ))
        return rows

    @staticmethod
    def _compare_resource_groups(parsed: ParsedWorkbook) -> list[CompareRow]:
        rows: list[CompareRow] = []
        excel_keys: set[str] = set()
        for excel_row in parsed.sheets.get("ResourceGroups", []):
            d = excel_row.data
            code = d.get("resource_group_code", "").strip()
            dc = d.get("department_code", "").strip()
            key = f"{dc}:{code}"
            if not code:
                continue
            if key in excel_keys:
                rows.append(CompareRow(
                    sheet="ResourceGroups", row_number=excel_row.row_number,
                    entity_type="ResourceGroup", business_key=key,
                    status=COMPARE_STATUS_DUPLICATE_IN_EXCEL,
                    message=f"Duplicate resource group '{code}' for department '{dc}'",
                ))
                continue
            excel_keys.add(key)
            try:
                qs = ResourceGroup.objects.filter(code=code)
                if dc:
                    qs = qs.filter(department__code=dc)
                obj = qs.first()
                if not obj:
                    raise ResourceGroup.DoesNotExist
                diffs: list[FieldDifference] = []
                if _get_field(obj.name) != _get_field(d.get("resource_group_name")):
                    diffs.append(FieldDifference(field="resource_group_name", excel_value=_get_field(d.get("resource_group_name")), app_value=_get_field(obj.name)))
                if d.get("status") and _get_field(obj.status) != d.get("status", "").upper():
                    diffs.append(FieldDifference(field="status", excel_value=d.get("status", ""), app_value=_get_field(obj.status)))
                status = COMPARE_STATUS_DIFFERENT if diffs else COMPARE_STATUS_MATCH
                rows.append(CompareRow(
                    sheet="ResourceGroups", row_number=excel_row.row_number,
                    entity_type="ResourceGroup", business_key=key,
                    status=status, field_differences=diffs,
                ))
            except ResourceGroup.DoesNotExist:
                rows.append(CompareRow(
                    sheet="ResourceGroups", row_number=excel_row.row_number,
                    entity_type="ResourceGroup", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_APP,
                    message=f"Resource group '{code}' for department '{dc}' not found in app",
                ))

        for obj in ResourceGroup.objects.all():
            key = f"{obj.department.code}:{obj.code}"
            if key not in excel_keys:
                rows.append(CompareRow(
                    sheet="ResourceGroups", row_number=0,
                    entity_type="ResourceGroup", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_EXCEL,
                    message=f"Resource group '{obj.code}' (dept {obj.department.code}) exists in app but not in Excel",
                ))
        return rows

    @staticmethod
    def _compare_resources(parsed: ParsedWorkbook) -> list[CompareRow]:
        rows: list[CompareRow] = []
        excel_keys: set[str] = set()
        for excel_row in parsed.sheets.get("Resources", []):
            d = excel_row.data
            code = d.get("resource_code", "").strip()
            rc = d.get("resource_group_code", "").strip()
            key = f"{rc}:{code}"
            if not code:
                continue
            if key in excel_keys:
                rows.append(CompareRow(
                    sheet="Resources", row_number=excel_row.row_number,
                    entity_type="Resource", business_key=key,
                    status=COMPARE_STATUS_DUPLICATE_IN_EXCEL,
                    message=f"Duplicate resource '{code}' for resource group '{rc}'",
                ))
                continue
            excel_keys.add(key)
            try:
                qs = Resource.objects.filter(code=code)
                if rc:
                    qs = qs.filter(resource_group__code=rc)
                obj = qs.first()
                if not obj:
                    raise Resource.DoesNotExist
                diffs: list[FieldDifference] = []
                if _get_field(obj.name) != _get_field(d.get("resource_name")):
                    diffs.append(FieldDifference(field="resource_name", excel_value=_get_field(d.get("resource_name")), app_value=_get_field(obj.name)))
                if d.get("resource_group_code") and _get_field(obj.resource_group.code) != d.get("resource_group_code", "").strip():
                    diffs.append(FieldDifference(field="resource_group_code", excel_value=d.get("resource_group_code", ""), app_value=_get_field(obj.resource_group.code)))
                if d.get("status") and _get_field(obj.status) != d.get("status", "").upper():
                    diffs.append(FieldDifference(field="status", excel_value=d.get("status", ""), app_value=_get_field(obj.status)))
                status = COMPARE_STATUS_DIFFERENT if diffs else COMPARE_STATUS_MATCH
                rows.append(CompareRow(
                    sheet="Resources", row_number=excel_row.row_number,
                    entity_type="Resource", business_key=key,
                    status=status, field_differences=diffs,
                ))
            except Resource.DoesNotExist:
                rows.append(CompareRow(
                    sheet="Resources", row_number=excel_row.row_number,
                    entity_type="Resource", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_APP,
                    message=f"Resource '{code}' for group '{rc}' not found in app",
                ))

        for obj in Resource.objects.all():
            key = f"{obj.resource_group.code}:{obj.code}"
            if key not in excel_keys:
                rows.append(CompareRow(
                    sheet="Resources", row_number=0,
                    entity_type="Resource", business_key=key,
                    status=COMPARE_STATUS_MISSING_IN_EXCEL,
                    message=f"Resource '{obj.code}' (group {obj.resource_group.code}) exists in app but not in Excel",
                ))
        return rows
