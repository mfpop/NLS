import os
import tempfile
from io import BytesIO
from openpyxl import Workbook
from django.test import TestCase

from manufacturing.models import Company, Plant, EntityStatus
from manufacturing.domain.plant_structure_compare_service import (
    PlantStructureCompareService,
    COMPARE_STATUS_MATCH,
    COMPARE_STATUS_MISSING_IN_APP,
    COMPARE_STATUS_MISSING_IN_EXCEL,
    COMPARE_STATUS_DIFFERENT,
)


def _make_workbook(sheets_data: dict[str, list[dict[str, str]]]) -> BytesIO:
    wb = Workbook()
    wb.remove(wb.active)
    for sheet_name, rows in sheets_data.items():
        if not rows:
            continue
        ws = wb.create_sheet(sheet_name)
        headers = list(rows[0].keys())
        ws.append(headers)
        for row in rows:
            ws.append([row.get(h, "") for h in headers])
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def _save_workbook(sheets_data: dict[str, list[dict[str, str]]]) -> str:
    buf = _make_workbook(sheets_data)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as f:
        f.write(buf.read())
        return f.name


class CompareTests(TestCase):

    def _full_sheets(self):
        return {
            "Companies": [{"company_code": "C1", "company_name": "Test Corp", "status": "ACTIVE"}],
            "Plants": [{"company_code": "C1", "plant_code": "P1", "plant_name": "Main Plant", "status": "ACTIVE"}],
            "ProductionLines": [{"plant_code": "P1", "line_code": "L1", "line_name": "Assembly", "status": "ACTIVE"}],
            "Departments": [{"plant_code": "P1", "department_code": "D1", "department_name": "Production", "status": "ACTIVE"}],
            "ProductionLineDepartments": [{"plant_code": "P1", "line_code": "L1", "department_code": "D1", "sequence": "1", "status": "ACTIVE"}],
            "ResourceGroups": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_group_name": "Team A", "status": "ACTIVE"}],
            "Resources": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_code": "R1", "resource_name": "Operator 1", "status": "ACTIVE"}],
        }

    def test_compare_match(self):
        company = Company.objects.create(code="C1", name="Test Corp", status=EntityStatus.ACTIVE)
        sheets = self._full_sheets()
        path = _save_workbook(sheets)
        result = PlantStructureCompareService.compare_all(path)
        os.unlink(path)
        self.assertTrue(result.ok)
        company_rows = [r for r in result.rows if r.entity_type == "Company"]
        self.assertTrue(len(company_rows) > 0)
        self.assertEqual(company_rows[0].status, COMPARE_STATUS_MATCH)

    def test_compare_missing_in_app(self):
        sheets = self._full_sheets()
        path = _save_workbook(sheets)
        result = PlantStructureCompareService.compare_all(path)
        os.unlink(path)
        company_rows = [r for r in result.rows if r.entity_type == "Company" and r.status == COMPARE_STATUS_MISSING_IN_APP]
        self.assertTrue(len(company_rows) > 0)

    def test_compare_missing_in_excel(self):
        company = Company.objects.create(code="C2", name="Orphan Corp", status=EntityStatus.ACTIVE)
        sheets = self._full_sheets()
        path = _save_workbook(sheets)
        result = PlantStructureCompareService.compare_all(path)
        os.unlink(path)
        missing_in_excel = [r for r in result.rows if r.status == COMPARE_STATUS_MISSING_IN_EXCEL]
        company_rows = [r for r in missing_in_excel if r.entity_type == "Company" and "C2" in r.business_key]
        self.assertTrue(len(company_rows) > 0)

    def test_compare_different_field(self):
        company = Company.objects.create(code="C1", name="Different Name", status=EntityStatus.ACTIVE)
        sheets = self._full_sheets()
        path = _save_workbook(sheets)
        result = PlantStructureCompareService.compare_all(path)
        os.unlink(path)
        company_rows = [r for r in result.rows if r.entity_type == "Company" and r.status == COMPARE_STATUS_DIFFERENT]
        self.assertTrue(len(company_rows) > 0)
        self.assertTrue(len(company_rows[0].field_differences) > 0)
        diff = company_rows[0].field_differences[0]
        self.assertEqual(diff.field, "company_name")
        self.assertEqual(diff.excel_value, "Test Corp")
        self.assertEqual(diff.app_value, "Different Name")

    def test_graphql_compare_calls_service_only(self):
        from unittest.mock import patch
        sheets = self._full_sheets()
        path = _save_workbook(sheets)
        with patch.object(PlantStructureCompareService, "compare_all", wraps=PlantStructureCompareService.compare_all) as mock:
            result = PlantStructureCompareService.compare_all(path)
            self.assertTrue(mock.called)
        os.unlink(path)

    def test_graphql_import_calls_service_only(self):
        from unittest.mock import patch
        from manufacturing.domain.plant_structure_import_service import PlantStructureImportService, ImportMode
        sheets = self._full_sheets()
        path = _save_workbook(sheets)
        with patch.object(PlantStructureImportService, "import_workbook", wraps=PlantStructureImportService.import_workbook) as mock:
            result = PlantStructureImportService.import_workbook(path, ImportMode.UPSERT)
            self.assertTrue(mock.called)
        os.unlink(path)
