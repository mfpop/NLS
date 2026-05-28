import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch, Mock
from django.utils import timezone

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from manufacturing.models.erp_import_pattern import ErpImportPattern, ErpImportPatternFieldMapping
from manufacturing.domain.erp_import_pattern_service import ErpImportPatternService, ErpImportPatternError
from manufacturing.domain.erp_schema_detection_service import (
    ErpSchemaDetectionService, SchemaDetectionResult, SchemaDetectionError,
)
from data_management.models import ErpPattern, ErpPatternMapping, ErpSourceFile, ErpImportLog
from data_management.services.erp_source_file_service import ErpSourceFileService, get_source_root
from data_management.services.erp_import_validation_service import (
    ErpImportValidationService, ValidationResult,
    VALIDATION_STATUS_READY, VALIDATION_STATUS_MISSING_FILE,
    VALIDATION_STATUS_MISSING_FIELDS, VALIDATION_STATUS_INVALID_FILE,
)
from data_management.services.erp_import_service import ErpImportService
from data_management.services.erp_import_workspace_service import ErpImportWorkspaceService


def _make_excel_file(sheets: dict[str, list[list[str]]], file_path: str | None = None) -> str:
    """Create a temporary Excel file with given sheets."""
    import openpyxl
    if file_path is None:
        tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
        tmp.close()
        file_path = tmp.name
    wb = openpyxl.Workbook()
    first = True
    for sheet_name, rows in sheets.items():
        if first:
            ws = wb.active
            ws.title = sheet_name
            first = False
        else:
            ws = wb.create_sheet(title=sheet_name)
        for row in rows:
            ws.append(row)
    wb.save(file_path)
    wb.close()
    return file_path


def _make_csv_file(content: str, file_path: str | None = None) -> str:
    if file_path is None:
        tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8")
        tmp.close()
        file_path = tmp.name
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    return file_path


# ══════════════════════════════════════════════════════════════════
#  MODEL TESTS (manufacturing.ErpImportPattern)
# ══════════════════════════════════════════════════════════════════

class ErpImportPatternModelTest(TestCase):
    """Model-level tests for source_sheet_name."""

    def test_source_sheet_name_field_exists(self):
        field = ErpImportPattern._meta.get_field("source_sheet_name")
        self.assertTrue(field.null)
        self.assertTrue(field.blank)
        self.assertEqual(field.max_length, 255)

    def test_source_sheet_name_null_for_csv_pattern(self):
        pattern = ErpImportPattern.objects.create(
            name="CSV Pattern", destination_entity="Plant",
            source_file_type="csv", source_sheet_name=None,
        )
        self.assertIsNone(pattern.source_sheet_name)

    def test_source_sheet_name_saved_for_excel_pattern(self):
        pattern = ErpImportPattern.objects.create(
            name="Excel Pattern", destination_entity="Plant",
            source_file_type="xlsx", source_sheet_name="Sheet1",
        )
        self.assertEqual(pattern.source_sheet_name, "Sheet1")

    def test_source_sheet_name_persists_after_schema_update(self):
        pattern = ErpImportPattern.objects.create(
            name="Schema Persist", destination_entity="Plant",
            source_file_type="xlsx", source_sheet_name="Sheet1",
            source_schema=[{"fieldName": "Code", "dataType": "string"}],
        )
        ErpImportPatternService.update_pattern(str(pattern.id), description="Updated")
        pattern.refresh_from_db()
        self.assertEqual(pattern.source_schema, [{"fieldName": "Code", "dataType": "string"}])
        self.assertEqual(pattern.source_sheet_name, "Sheet1")

    def test_source_sheet_name_not_required_for_non_excel(self):
        for ft in ("csv", "json", "xml"):
            pattern = ErpImportPattern.objects.create(
                name=f"{ft.upper()} Pattern",
                destination_entity="Plant",
                source_file_type=ft,
                source_sheet_name=None,
            )
            self.assertIsNone(pattern.source_sheet_name)


# ══════════════════════════════════════════════════════════════════
#  SCHEMA DETECTION TESTS
# ══════════════════════════════════════════════════════════════════

class ErpSchemaDetectionServiceTest(TestCase):
    """Tests for schema detection with multi-sheet Excel support."""

    def setUp(self):
        self.single_sheet_file = _make_excel_file({
            "Sheet1": [["Code", "Name"], ["P01", "Alpha"], ["P02", "Beta"]],
        })
        self.multi_sheet_file = _make_excel_file({
            "Products": [["Code", "Name"], ["P01", "Alpha"]],
            "Prices": [["Code", "Price"], ["P01", "100"]],
            "Inventory": [["Code", "Qty"], ["P01", "50"]],
        })

    def tearDown(self):
        for f in [self.single_sheet_file, self.multi_sheet_file]:
            if os.path.isfile(f):
                os.unlink(f)

    def _make_source_file(self, file_path: str) -> ErpSourceFile:
        ext = Path(file_path).suffix.lstrip(".").lower()
        return ErpSourceFile.objects.create(
            original_name=f"test.{ext}",
            stored_name=f"stored_test.{ext}",
            file_path=file_path,
            file_type=ext,
        )

    def test_one_sheet_excel_auto_selects_sheet(self):
        sf = self._make_source_file(self.single_sheet_file)
        result = ErpSchemaDetectionService.detect_schema(sf)
        self.assertEqual(result.file_type, "xlsx")
        self.assertEqual(result.sheet_names, ["Sheet1"])
        self.assertEqual(result.selected_sheet_name, "Sheet1")
        self.assertFalse(result.requires_sheet_selection)
        field_names = [f["fieldName"] for f in result.source_schema]
        self.assertIn("Code", field_names)
        self.assertIn("Name", field_names)

    def test_multi_sheet_excel_returns_sheet_names_and_requires_selection(self):
        sf = self._make_source_file(self.multi_sheet_file)
        result = ErpSchemaDetectionService.detect_schema(sf)
        self.assertEqual(result.file_type, "xlsx")
        self.assertEqual(set(result.sheet_names), {"Products", "Prices", "Inventory"})
        self.assertIsNone(result.selected_sheet_name)
        self.assertEqual(result.source_schema, [])
        self.assertTrue(result.requires_sheet_selection)

    def test_selected_sheet_returns_schema_from_selected_only(self):
        sf = self._make_source_file(self.multi_sheet_file)
        result = ErpSchemaDetectionService.detect_schema(sf, selected_sheet_name="Prices")
        self.assertEqual(result.selected_sheet_name, "Prices")
        self.assertFalse(result.requires_sheet_selection)
        field_names = [f["fieldName"] for f in result.source_schema]
        self.assertIn("Code", field_names)
        self.assertIn("Price", field_names)
        self.assertNotIn("Name", field_names)
        self.assertNotIn("Qty", field_names)

    def test_missing_selected_sheet_raises_invalid_file(self):
        sf = self._make_source_file(self.multi_sheet_file)
        with self.assertRaises(SchemaDetectionError) as ctx:
            ErpSchemaDetectionService.detect_schema(sf, selected_sheet_name="NonExistent")
        self.assertEqual(ctx.exception.code, "INVALID_FILE")

    def test_csv_returns_no_sheet_info(self):
        csv_path = _make_csv_file("Code,Name\nP01,Alpha\n")
        sf = self._make_source_file(csv_path)
        result = ErpSchemaDetectionService.detect_schema(sf)
        self.assertEqual(result.file_type, "csv")
        self.assertEqual(result.sheet_names, [])
        self.assertIsNone(result.selected_sheet_name)
        self.assertFalse(result.requires_sheet_selection)
        field_names = [f["fieldName"] for f in result.source_schema]
        self.assertIn("Code", field_names)
        if os.path.isfile(csv_path):
            os.unlink(csv_path)

    def test_json_returns_no_sheet_info(self):
        import json as j
        tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w")
        j.dump([{"Code": "P01", "Name": "Alpha"}], tmp)
        tmp.close()
        sf = self._make_source_file(tmp.name)
        result = ErpSchemaDetectionService.detect_schema(sf)
        self.assertEqual(result.file_type, "json")
        self.assertEqual(result.sheet_names, [])
        self.assertIsNone(result.selected_sheet_name)
        self.assertFalse(result.requires_sheet_selection)
        if os.path.isfile(tmp.name):
            os.unlink(tmp.name)

    def test_xml_returns_no_sheet_info(self):
        xml_content = "<root><item><Code>P01</Code><Name>Alpha</Name></item></root>"
        tmp = tempfile.NamedTemporaryFile(suffix=".xml", delete=False, mode="w")
        tmp.write(xml_content)
        tmp.close()
        sf = self._make_source_file(tmp.name)
        result = ErpSchemaDetectionService.detect_schema(sf)
        self.assertEqual(result.file_type, "xml")
        self.assertEqual(result.sheet_names, [])
        self.assertIsNone(result.selected_sheet_name)
        self.assertFalse(result.requires_sheet_selection)
        if os.path.isfile(tmp.name):
            os.unlink(tmp.name)


# ══════════════════════════════════════════════════════════════════
#  PATTERN SERVICE TESTS (manufacturing.ErpImportPatternService)
# ══════════════════════════════════════════════════════════════════

class ErpImportPatternServiceMultiSheetTest(TestCase):
    """Tests for pattern service multi-sheet Excel support."""

    def test_create_pattern_saves_source_sheet_name(self):
        pattern = ErpImportPatternService.create_pattern(
            name="Multi Sheet Pattern",
            destination_entity="Plant",
            source_file_pattern="data_*.xlsx",
            source_sheet_name="Products",
            source_schema=[{"fieldName": "Code", "dataType": "string"}],
        )
        self.assertEqual(pattern.source_sheet_name, "Products")
        self.assertEqual(pattern.source_schema, [{"fieldName": "Code", "dataType": "string"}])

    def test_create_pattern_clears_sheet_name_for_csv(self):
        pattern = ErpImportPatternService.create_pattern(
            name="CSV No Sheet",
            destination_entity="Plant",
            source_file_pattern="data_*.csv",
            source_sheet_name="Sheet1",
        )
        self.assertIsNone(pattern.source_sheet_name)

    def test_create_pattern_clears_sheet_name_for_json(self):
        pattern = ErpImportPatternService.create_pattern(
            name="JSON No Sheet",
            destination_entity="Plant",
            source_file_pattern="data_*.json",
            source_sheet_name="Sheet1",
        )
        self.assertIsNone(pattern.source_sheet_name)

    def test_create_pattern_clears_sheet_name_for_xml(self):
        pattern = ErpImportPatternService.create_pattern(
            name="XML No Sheet",
            destination_entity="Plant",
            source_file_pattern="data_*.xml",
            source_sheet_name="Sheet1",
        )
        self.assertIsNone(pattern.source_sheet_name)

    def test_update_pattern_saves_source_sheet_name(self):
        pattern = ErpImportPatternService.create_pattern(
            name="Update Sheet Pattern",
            destination_entity="Plant",
        )
        updated = ErpImportPatternService.update_pattern(
            str(pattern.id),
            source_sheet_name="NewSheet",
            source_file_pattern="data_*.xlsx",
        )
        self.assertEqual(updated.source_sheet_name, "NewSheet")

    def test_update_pattern_clears_sheet_for_csv(self):
        pattern = ErpImportPatternService.create_pattern(
            name="Update CSV Sheet",
            destination_entity="Plant",
            source_sheet_name="OldSheet",
            source_file_pattern="data_*.xlsx",
        )
        updated = ErpImportPatternService.update_pattern(
            str(pattern.id),
            source_file_pattern="data_*.csv",
        )
        self.assertIsNone(updated.source_sheet_name)

    def test_update_pattern_preserves_schema_when_not_provided(self):
        pattern = ErpImportPatternService.create_pattern(
            name="Preserve Schema",
            destination_entity="Plant",
            source_sheet_name="Sheet1",
            source_file_pattern="data_*.xlsx",
            source_schema=[{"fieldName": "Code", "dataType": "string"}],
        )
        updated = ErpImportPatternService.update_pattern(
            str(pattern.id), description="No schema change",
        )
        self.assertEqual(updated.source_schema, [{"fieldName": "Code", "dataType": "string"}])
        self.assertEqual(updated.source_sheet_name, "Sheet1")


# ══════════════════════════════════════════════════════════════════
#  VALIDATION SERVICE TESTS (uses legacy data_management.ErpPattern)
# ══════════════════════════════════════════════════════════════════

class ErpImportValidationServiceMultiSheetTest(TestCase):
    """Tests for validation service with multi-sheet Excel."""

    def setUp(self):
        self.excel_path = _make_excel_file({
            "Products": [["Code", "Name"], ["P01", "Alpha"]],
            "Prices": [["Code", "Price"], ["P01", "100"]],
        })
        self.single_excel_path = _make_excel_file({
            "Data": [["Code", "Name", "Price"], ["P01", "Alpha", "100"]],
        })
        self.csv_path = _make_csv_file("Code,Name\nP01,Alpha\n")

    def tearDown(self):
        for f in [self.excel_path, self.single_excel_path, self.csv_path]:
            if os.path.isfile(f):
                os.unlink(f)

    def _create_legacy_pattern(self, **overrides) -> ErpPattern:
        params = dict(
            name="Legacy Pattern",
            destination_entity="Plant",
            source_file_type="xlsx",
        )
        params.update(overrides)
        return ErpPattern.objects.create(**params)

    def _create_source_file(self, file_path: str, file_type: str = "xlsx") -> ErpSourceFile:
        ext = Path(file_path).suffix.lstrip(".") or file_type
        return ErpSourceFile.objects.create(
            original_name=f"test_source.{ext}",
            stored_name=f"stored.{ext}",
            file_path=file_path,
            file_type=file_type or ext,
        )

    def _add_field_mapping(self, pattern, source_name: str, destination_name: str, order: int = 1):
        ErpPatternMapping.objects.create(
            pattern=pattern,
            source_name=source_name,
            destination_name=destination_name,
            is_required=True,
            order=order,
        )

    def test_missing_sheet_returns_invalid_file(self):
        pattern = self._create_legacy_pattern(
            name="Missing Sheet Pattern",
        )
        self._add_field_mapping(pattern, "Code", "code")
        sf = self._create_source_file(self.excel_path)
        result = ErpImportValidationService.validate_pattern(int(pattern.id))
        self.assertEqual(result.status, VALIDATION_STATUS_INVALID_FILE)
        self.assertTrue(any("sheet" in e.lower() for e in result.errors))

    def test_wrong_filename_returns_missing_file(self):
        pattern = self._create_legacy_pattern(
            name="No File Pattern",
        )
        result = ErpImportValidationService.validate_pattern(int(pattern.id))
        self.assertEqual(result.status, VALIDATION_STATUS_MISSING_FILE)

    def test_wrong_extension_returns_missing_file(self):
        pattern = self._create_legacy_pattern(
            name="Wrong Type Pattern",
            source_file_type="csv",
        )
        self._add_field_mapping(pattern, "Code", "code")
        sf = self._create_source_file(self.excel_path, file_type="xlsx")
        result = ErpImportValidationService.validate_pattern(int(pattern.id))
        self.assertEqual(result.status, VALIDATION_STATUS_MISSING_FILE)

    def test_csv_validation_works(self):
        pattern = self._create_legacy_pattern(
            name="CSV Valid",
            source_file_type="csv",
        )
        self._add_field_mapping(pattern, "Code", "code")
        self._add_field_mapping(pattern, "Name", "name")
        sf = self._create_source_file(self.csv_path, file_type="csv")
        result = ErpImportValidationService.validate_pattern(int(pattern.id))
        self.assertEqual(result.status, VALIDATION_STATUS_READY)

    def test_parse_headers_with_sheet_name(self):
        sf = self._create_source_file(self.excel_path)
        headers = ErpImportValidationService.parse_file_headers(sf, sheet_name="Prices")
        self.assertIn("Code", headers)
        self.assertIn("Price", headers)
        self.assertNotIn("Name", headers)

    def test_parse_headers_missing_sheet_raises(self):
        sf = self._create_source_file(self.excel_path)
        with self.assertRaises(Exception) as ctx:
            ErpImportValidationService.parse_file_headers(sf, sheet_name="NonExistent")
        self.assertIn("NonExistent", str(ctx.exception))


# ══════════════════════════════════════════════════════════════════
#  IMPORT SERVICE TESTS (uses legacy data_management.ErpPattern)
# ══════════════════════════════════════════════════════════════════

class ErpImportServiceMultiSheetTest(TestCase):
    """Tests for import execution with multi-sheet Excel."""

    def setUp(self):
        self.excel_path = _make_excel_file({
            "Data": [["Code", "Name"], ["P01", "Alpha"], ["P02", "Beta"]],
        })
        self.csv_path = _make_csv_file("Code,Name\nP01,Alpha\nP02,Beta\n")

    def tearDown(self):
        for f in [self.excel_path, self.csv_path]:
            if os.path.isfile(f):
                os.unlink(f)

    def _create_legacy_pattern(self, **overrides) -> ErpPattern:
        params = dict(
            name="Legacy Import Pattern",
            destination_entity="Plant",
            source_file_type="xlsx",
        )
        params.update(overrides)
        return ErpPattern.objects.create(**params)

    def _create_source_file(self, file_path: str, file_type: str = "xlsx") -> ErpSourceFile:
        ext = Path(file_path).suffix.lstrip(".") or file_type
        return ErpSourceFile.objects.create(
            original_name=f"test_source.{ext}",
            stored_name=f"stored.{ext}",
            file_path=file_path,
            file_type=file_type or ext,
        )

    def _add_mappings(self, pattern):
        ErpPatternMapping.objects.create(pattern=pattern, source_name="Code", destination_name="code", is_required=True, order=1)
        ErpPatternMapping.objects.create(pattern=pattern, source_name="Name", destination_name="name", is_required=True, order=2)

    def test_csv_import_still_works(self):
        pattern = self._create_legacy_pattern(
            name="CSV Import",
            source_file_type="csv",
        )
        self._add_mappings(pattern)
        sf = self._create_source_file(self.csv_path, file_type="csv")
        result = ErpImportService.execute_import(int(pattern.id), confirmed=True)
        self.assertEqual(result.status, "IMPORTED")
        self.assertEqual(result.rows_added, 2)

    def test_csv_import_creates_log_with_source_file_name(self):
        pattern = self._create_legacy_pattern(
            name="CSV Log Test",
            source_file_type="csv",
        )
        self._add_mappings(pattern)
        sf = self._create_source_file(self.csv_path, file_type="csv")
        result = ErpImportService.execute_import(int(pattern.id), confirmed=True)
        log = ErpImportLog.objects.filter(pattern=pattern).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.source_file_name, "test_source.csv")

    def test_import_revalidates_before_import(self):
        pattern = self._create_legacy_pattern(name="Revalidate Test")
        ErpPatternMapping.objects.create(pattern=pattern, source_name="Code", destination_name="code", is_required=True, order=1)
        ErpPatternMapping.objects.create(pattern=pattern, source_name="Name", destination_name="name", is_required=True, order=2)
        sf = self._create_source_file(self.excel_path)
        result = ErpImportService.execute_import(int(pattern.id), confirmed=True)
        self.assertEqual(result.status, "IMPORTED")


# ══════════════════════════════════════════════════════════════════
#  GRAPHQL RESOLVER PURITY TESTS
# ══════════════════════════════════════════════════════════════════

class GraphQLResolverPurityTest(TestCase):
    """Verify GraphQL resolvers for ERP import pattern contain no forbidden calls."""

    def _get_source_body(self, method) -> str:
        import inspect
        source = inspect.getsource(method)
        body = source.split(":", 1)[-1] if ":" in source else source
        return body

    def test_erp_import_pattern_mutations_no_forbidden_calls(self):
        from api.mutations.erp_import_pattern import ErpImportPatternMutation
        import inspect
        forbidden = ["transaction.atomic", "open(", ".read(", ".write(",
                     "bulk_create", " save(", ".delete("]
        for name, method in inspect.getmembers(ErpImportPatternMutation, predicate=inspect.isfunction):
            if name.startswith("_"):
                continue
            body = self._get_source_body(method)
            for token in forbidden:
                self.assertNotIn(token, body,
                                 f"Mutation '{name}' contains forbidden '{token}'")

    def test_erp_import_pattern_queries_no_forbidden_calls(self):
        from api.queries.erp_import_pattern import ErpImportPatternQuery
        import inspect
        forbidden = ["transaction.atomic", "open(", ".read(", ".write(",
                     "bulk_create", " save(", ".delete("]
        for name, method in inspect.getmembers(ErpImportPatternQuery, predicate=inspect.isfunction):
            if name.startswith("_"):
                continue
            body = self._get_source_body(method)
            for token in forbidden:
                self.assertNotIn(token, body,
                                 f"Query '{name}' contains forbidden '{token}'")
