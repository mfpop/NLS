import os
import tempfile
from io import BytesIO
from unittest.mock import patch

from openpyxl import Workbook
from django.test import TestCase

from manufacturing.models import (
    Company, Plant, ProductionLine, Department,
    ProductionLineDepartmentAssignment,
    ResourceGroup, Resource, EntityStatus,
)
from manufacturing.domain.plant_structure_import_service import (
    PlantStructureImportService, ImportMode, ParsedWorkbook, ParsedRow,
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


class ValidateExcelTests(TestCase):

    def test_excel_missing_required_sheet_rejected(self):
        buf = _make_workbook({"Companies": [{"company_code": "C1", "company_name": "Test", "status": "ACTIVE"}]})
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as f:
            f.write(buf.read())
            path = f.name
        result = PlantStructureImportService.import_workbook(path, ImportMode.VALIDATE_ONLY)
        os.unlink(path)
        self.assertFalse(result.ok)
        sheet_errors = [e for e in result.validation_errors if e.field == "sheet"]
        self.assertTrue(len(sheet_errors) > 0)

    def test_excel_missing_required_column_rejected(self):
        sheets = {
            "Companies": [{"company_code": "C1"}],
            "Plants": [{"plant_code": "P1", "company_code": "C1", "plant_name": "Plant", "status": "ACTIVE"}],
            "ProductionLines": [{"line_code": "L1", "plant_code": "P1", "line_name": "Line", "status": "ACTIVE"}],
            "Departments": [{"department_code": "D1", "plant_code": "P1", "department_name": "Dept", "status": "ACTIVE"}],
            "ProductionLineDepartments": [{"plant_code": "P1", "line_code": "L1", "department_code": "D1", "sequence": "1", "status": "ACTIVE"}],
            "ResourceGroups": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_group_name": "RG", "status": "ACTIVE"}],
            "Resources": [{"plant_code": "P1", "department_code": "D1", "resource_code": "R1", "resource_group_code": "RG1", "resource_name": "Res", "status": "ACTIVE"}],
        }
        path = _save_workbook(sheets)
        result = PlantStructureImportService.import_workbook(path, ImportMode.VALIDATE_ONLY)
        os.unlink(path)
        self.assertFalse(result.ok)
        name_errors = [e for e in result.validation_errors if "company_name" in e.message.lower() and "empty" in e.message.lower()]
        self.assertTrue(len(name_errors) > 0, "Expected error about empty company_name")

    def test_duplicate_excel_company_rejected(self):
        sheets = {
            "Companies": [
                {"company_code": "C1", "company_name": "Test", "status": "ACTIVE"},
                {"company_code": "C1", "company_name": "Test Dup", "status": "ACTIVE"},
            ],
            "Plants": [{"plant_code": "P1", "company_code": "C1", "plant_name": "Plant", "status": "ACTIVE"}],
            "ProductionLines": [{"line_code": "L1", "plant_code": "P1", "line_name": "Line", "status": "ACTIVE"}],
            "Departments": [{"department_code": "D1", "plant_code": "P1", "department_name": "Dept", "status": "ACTIVE"}],
            "ProductionLineDepartments": [{"plant_code": "P1", "line_code": "L1", "department_code": "D1", "sequence": "1", "status": "ACTIVE"}],
            "ResourceGroups": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_group_name": "RG", "status": "ACTIVE"}],
            "Resources": [{"plant_code": "P1", "department_code": "D1", "resource_code": "R1", "resource_group_code": "RG1", "resource_name": "Res", "status": "ACTIVE"}],
        }
        path = _save_workbook(sheets)
        result = PlantStructureImportService.import_workbook(path, ImportMode.VALIDATE_ONLY)
        os.unlink(path)
        self.assertFalse(result.ok)
        dup_errors = [e for e in result.validation_errors if "duplicate" in e.message.lower()]
        self.assertTrue(len(dup_errors) > 0)

    def test_duplicate_excel_plant_rejected(self):
        sheets = {
            "Companies": [{"company_code": "C1", "company_name": "Test", "status": "ACTIVE"}],
            "Plants": [
                {"company_code": "C1", "plant_code": "P1", "plant_name": "Plant", "status": "ACTIVE"},
                {"company_code": "C1", "plant_code": "P1", "plant_name": "Plant Dup", "status": "ACTIVE"},
            ],
            "ProductionLines": [{"line_code": "L1", "plant_code": "P1", "line_name": "Line", "status": "ACTIVE"}],
            "Departments": [{"department_code": "D1", "plant_code": "P1", "department_name": "Dept", "status": "ACTIVE"}],
            "ProductionLineDepartments": [{"plant_code": "P1", "line_code": "L1", "department_code": "D1", "sequence": "1", "status": "ACTIVE"}],
            "ResourceGroups": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_group_name": "RG", "status": "ACTIVE"}],
            "Resources": [{"plant_code": "P1", "department_code": "D1", "resource_code": "R1", "resource_group_code": "RG1", "resource_name": "Res", "status": "ACTIVE"}],
        }
        path = _save_workbook(sheets)
        result = PlantStructureImportService.import_workbook(path, ImportMode.VALIDATE_ONLY)
        os.unlink(path)
        self.assertFalse(result.ok)
        dup_errors = [e for e in result.validation_errors if "duplicate" in e.message.lower()]
        self.assertTrue(len(dup_errors) > 0)

    def test_cross_plant_line_department_rejected(self):
        sheets = {
            "Companies": [{"company_code": "C1", "company_name": "Test", "status": "ACTIVE"}],
            "Plants": [
                {"company_code": "C1", "plant_code": "P1", "plant_name": "Plant A", "status": "ACTIVE"},
                {"company_code": "C1", "plant_code": "P2", "plant_name": "Plant B", "status": "ACTIVE"},
            ],
            "ProductionLines": [{"plant_code": "P1", "line_code": "L1", "line_name": "Line", "status": "ACTIVE"}],
            "Departments": [{"plant_code": "P2", "department_code": "D1", "department_name": "Dept", "status": "ACTIVE"}],
            "ProductionLineDepartments": [{"plant_code": "P1", "line_code": "L1", "department_code": "D1", "sequence": "1", "status": "ACTIVE"}],
            "ResourceGroups": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_group_name": "RG", "status": "ACTIVE"}],
            "Resources": [{"plant_code": "P1", "department_code": "D1", "resource_code": "R1", "resource_group_code": "RG1", "resource_name": "Res", "status": "ACTIVE"}],
        }
        path = _save_workbook(sheets)
        result = PlantStructureImportService.import_workbook(path, ImportMode.VALIDATE_ONLY)
        os.unlink(path)
        self.assertFalse(result.ok)
        cross_errors = [e for e in result.validation_errors if "different plants" in e.message.lower()]
        self.assertTrue(len(cross_errors) > 0, "Expected cross-plant error — found: " + str([e.message for e in result.validation_errors]))

    def test_resource_group_invalid_department_rejected(self):
        sheets = {
            "Companies": [{"company_code": "C1", "company_name": "Test", "status": "ACTIVE"}],
            "Plants": [{"company_code": "C1", "plant_code": "P1", "plant_name": "Plant", "status": "ACTIVE"}],
            "ProductionLines": [{"plant_code": "P1", "line_code": "L1", "line_name": "Line", "status": "ACTIVE"}],
            "Departments": [{"plant_code": "P1", "department_code": "D1", "department_name": "Dept", "status": "ACTIVE"}],
            "ProductionLineDepartments": [{"plant_code": "P1", "line_code": "L1", "department_code": "D1", "sequence": "1", "status": "ACTIVE"}],
            "ResourceGroups": [{"plant_code": "P1", "department_code": "NONEXISTENT", "resource_group_code": "RG1", "resource_group_name": "RG", "status": "ACTIVE"}],
            "Resources": [{"plant_code": "P1", "department_code": "D1", "resource_code": "R1", "resource_group_code": "RG1", "resource_name": "Res", "status": "ACTIVE"}],
        }
        path = _save_workbook(sheets)
        result = PlantStructureImportService.import_workbook(path, ImportMode.VALIDATE_ONLY)
        os.unlink(path)
        self.assertFalse(result.ok)
        dept_errors = [e for e in result.validation_errors if "not found" in e.message.lower() and "NONEXISTENT" in e.message]
        self.assertTrue(len(dept_errors) > 0)

    def test_resource_invalid_resource_group_rejected(self):
        sheets = {
            "Companies": [{"company_code": "C1", "company_name": "Test", "status": "ACTIVE"}],
            "Plants": [{"company_code": "C1", "plant_code": "P1", "plant_name": "Plant", "status": "ACTIVE"}],
            "ProductionLines": [{"plant_code": "P1", "line_code": "L1", "line_name": "Line", "status": "ACTIVE"}],
            "Departments": [{"plant_code": "P1", "department_code": "D1", "department_name": "Dept", "status": "ACTIVE"}],
            "ProductionLineDepartments": [{"plant_code": "P1", "line_code": "L1", "department_code": "D1", "sequence": "1", "status": "ACTIVE"}],
            "ResourceGroups": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_group_name": "RG", "status": "ACTIVE"}],
            "Resources": [{"plant_code": "P1", "department_code": "D1", "resource_code": "R1", "resource_group_code": "NONEXISTENT", "resource_name": "Res", "status": "ACTIVE"}],
        }
        path = _save_workbook(sheets)
        result = PlantStructureImportService.import_workbook(path, ImportMode.VALIDATE_ONLY)
        os.unlink(path)
        self.assertFalse(result.ok)
        rg_errors = [e for e in result.validation_errors if "not found" in e.message.lower() and "resources" in e.sheet.lower()]
        self.assertTrue(len(rg_errors) > 0)


class ValidateOnlyTests(TestCase):

    def test_validate_only_makes_no_db_writes(self):
        sheets = {
            "Companies": [{"company_code": "C1", "company_name": "Test", "status": "ACTIVE"}],
            "Plants": [{"company_code": "C1", "plant_code": "P1", "plant_name": "Plant", "status": "ACTIVE"}],
            "ProductionLines": [{"plant_code": "P1", "line_code": "L1", "line_name": "Line", "status": "ACTIVE"}],
            "Departments": [{"plant_code": "P1", "department_code": "D1", "department_name": "Dept", "status": "ACTIVE"}],
            "ProductionLineDepartments": [{"plant_code": "P1", "line_code": "L1", "department_code": "D1", "sequence": "1", "status": "ACTIVE"}],
            "ResourceGroups": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_group_name": "RG", "status": "ACTIVE"}],
            "Resources": [{"plant_code": "P1", "department_code": "D1", "resource_code": "R1", "resource_group_code": "RG1", "resource_name": "Res", "status": "ACTIVE"}],
        }
        path = _save_workbook(sheets)
        result = PlantStructureImportService.import_workbook(path, ImportMode.VALIDATE_ONLY)
        os.unlink(path)
        self.assertTrue(result.ok)
        # VALIDATE_ONLY creates no records
        self.assertEqual(result.companies_created, 0)
        self.assertEqual(result.plants_created, 0)
        self.assertEqual(result.resources_created, 0)

    def test_compare_only_makes_no_db_writes(self):
        sheets = {
            "Companies": [{"company_code": "C1", "company_name": "Test", "status": "ACTIVE"}],
            "Plants": [{"company_code": "C1", "plant_code": "P1", "plant_name": "Plant", "status": "ACTIVE"}],
            "ProductionLines": [{"plant_code": "P1", "line_code": "L1", "line_name": "Line", "status": "ACTIVE"}],
            "Departments": [{"plant_code": "P1", "department_code": "D1", "department_name": "Dept", "status": "ACTIVE"}],
            "ProductionLineDepartments": [{"plant_code": "P1", "line_code": "L1", "department_code": "D1", "sequence": "1", "status": "ACTIVE"}],
            "ResourceGroups": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_group_name": "RG", "status": "ACTIVE"}],
            "Resources": [{"plant_code": "P1", "department_code": "D1", "resource_code": "R1", "resource_group_code": "RG1", "resource_name": "Res", "status": "ACTIVE"}],
        }
        path = _save_workbook(sheets)
        result = PlantStructureImportService.import_workbook(path, ImportMode.COMPARE_ONLY)
        os.unlink(path)
        self.assertTrue(result.ok)
        # COMPARE_ONLY creates no records
        self.assertEqual(result.companies_created, 0)
        self.assertEqual(result.resources_created, 0)


class UpsertTests(TestCase):

    def _valid_sheets(self):
        return {
            "Companies": [{"company_code": "C1", "company_name": "Test Corp", "status": "ACTIVE"}],
            "Plants": [{"company_code": "C1", "plant_code": "P1", "plant_name": "Main Plant", "status": "ACTIVE"}],
            "ProductionLines": [{"plant_code": "P1", "line_code": "L1", "line_name": "Assembly", "status": "ACTIVE"}],
            "Departments": [{"plant_code": "P1", "department_code": "D1", "department_name": "Production", "status": "ACTIVE"}],
            "ProductionLineDepartments": [{"plant_code": "P1", "line_code": "L1", "department_code": "D1", "sequence": "1", "status": "ACTIVE"}],
            "ResourceGroups": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_group_name": "Team A", "status": "ACTIVE"}],
            "Resources": [{"plant_code": "P1", "department_code": "D1", "resource_group_code": "RG1", "resource_code": "R1", "resource_name": "Operator 1", "status": "ACTIVE"}],
        }

    def test_upsert_creates_valid_structure(self):
        sheets = self._valid_sheets()
        path = _save_workbook(sheets)
        result = PlantStructureImportService.import_workbook(path, ImportMode.UPSERT)
        os.unlink(path)
        self.assertTrue(result.ok, f"Validation errors: {[e.message for e in result.validation_errors]}")
        self.assertEqual(result.assignments_created + result.assignments_updated, 1, f"Expected 1 assignment, got created={result.assignments_created} updated={result.assignments_updated}")
        self.assertEqual(result.companies_created, 1)
        self.assertEqual(result.plants_created, 1)
        self.assertEqual(result.lines_created, 1)
        self.assertEqual(result.departments_created, 1)
        self.assertEqual(result.resource_groups_created, 1)
        self.assertEqual(result.resources_created, 1)
        self.assertTrue(Company.objects.exists(), "Company should exist")
        self.assertTrue(Plant.objects.exists(), "Plant should exist")
        self.assertTrue(ProductionLine.objects.exists(), "Line should exist")
        self.assertTrue(Department.objects.exists(), "Dept should exist")
        self.assertTrue(ProductionLineDepartmentAssignment.objects.exists(), "Assignment should exist")
        self.assertTrue(ResourceGroup.objects.exists(), "RG should exist")
        self.assertTrue(Resource.objects.exists(), "Resource should exist")

    def test_upsert_updates_existing_structure(self):
        company = Company.objects.create(code="C1", name="Old Name", status=EntityStatus.ACTIVE)
        plant = Plant.objects.create(company=company, code="P1", name="Old Plant", status=EntityStatus.ACTIVE)
        ProductionLine.objects.create(plant=plant, code="L1", name="Old Line", status=EntityStatus.ACTIVE)
        dept = Department.objects.create(plant=plant, code="D1", name="Old Dept", status=EntityStatus.ACTIVE)
        ProductionLineDepartmentAssignment.objects.create(
            plant=plant,
            production_line=ProductionLine.objects.get(code="L1", plant=plant),
            department=dept,
            sequence=0,
            status=EntityStatus.ACTIVE,
        )
        ResourceGroup.objects.create(department=dept, code="RG1", name="Old RG", status=EntityStatus.ACTIVE)

        sheets = self._valid_sheets()
        path = _save_workbook(sheets)
        result = PlantStructureImportService.import_workbook(path, ImportMode.UPSERT)
        os.unlink(path)
        self.assertTrue(result.ok)
        self.assertEqual(result.companies_updated, 1)
        self.assertEqual(result.plants_updated, 1)
        self.assertEqual(result.lines_updated, 1)
        self.assertEqual(result.departments_updated, 1)
        self.assertEqual(result.resource_groups_updated, 1)
        self.assertEqual(Company.objects.get(code="C1").name, "Test Corp")
        self.assertEqual(Plant.objects.get(code="P1", company=company).name, "Main Plant")


