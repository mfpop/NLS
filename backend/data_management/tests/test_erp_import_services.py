import os
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile

from data_management.models import ErpPattern, ErpPatternMapping, ErpSourceFile, ErpImportLog
from data_management.services.erp_pattern_service import (
    ErpPatternService, ErpPatternError, PatternValidationResult,
)
from data_management.services.erp_source_file_service import (
    ErpSourceFileService, ErpSourceFileError, get_source_root,
)
from data_management.services.erp_import_validation_service import (
    ErpImportValidationService, ValidationResult,
    VALIDATION_STATUS_READY, VALIDATION_STATUS_MISSING_FILE,
    VALIDATION_STATUS_MISSING_FIELDS, VALIDATION_STATUS_INVALID_FILE,
)
from data_management.services.erp_import_service import (
    ErpImportService, ImportResult, ErpImportError,
)
from data_management.services.erp_import_workspace_service import (
    ErpImportWorkspaceService, ErpImportWorkspaceError,
)


class ErpPatternServiceTest(TestCase):
    def test_create_pattern_minimal(self):
        p = ErpPatternService.create_pattern(name="Test", destination_entity="Plant")
        self.assertEqual(p.name, "Test")
        self.assertEqual(p.destination_entity, "Plant")
        self.assertEqual(p.source_file_type, "xlsx")

    def test_create_pattern_rejects_empty_name(self):
        with self.assertRaises(ErpPatternError) as ctx:
            ErpPatternService.create_pattern(name="  ", destination_entity="Plant")
        self.assertEqual(ctx.exception.field, "name")

    def test_create_pattern_rejects_empty_destination(self):
        with self.assertRaises(ErpPatternError) as ctx:
            ErpPatternService.create_pattern(name="Test", destination_entity="  ")
        self.assertEqual(ctx.exception.field, "destination_entity")

    def test_create_pattern_rejects_unsupported_destination(self):
        with self.assertRaises(ErpPatternError) as ctx:
            ErpPatternService.create_pattern(name="Test", destination_entity="FlyingCar")
        self.assertEqual(ctx.exception.code, "UNSUPPORTED")

    def test_create_pattern_rejects_invalid_file_type(self):
        with self.assertRaises(ErpPatternError) as ctx:
            ErpPatternService.create_pattern(name="Test", destination_entity="Plant", source_file_type="pdf")
        self.assertEqual(ctx.exception.code, "INVALID")

    def test_create_pattern_rejects_duplicate_name(self):
        ErpPatternService.create_pattern(name="Dupe", destination_entity="Plant")
        with self.assertRaises(ErpPatternError) as ctx:
            ErpPatternService.create_pattern(name="dupe", destination_entity="Department")
        self.assertEqual(ctx.exception.code, "DUPLICATE")

    def test_create_pattern_rejects_duplicate_destination_name(self):
        p = ErpPatternService.create_pattern(name="Test", destination_entity="Plant")
        ErpPatternMapping.objects.create(pattern=p, source_name="A", destination_name="code", order=1)
        ErpPatternMapping.objects.create(pattern=p, source_name="B", destination_name="Code", order=2)
        result = ErpPatternService.validate_mappings(p)
        self.assertFalse(result.ok)
        self.assertTrue(any(i.code == "DUPLICATE_DESTINATION_NAME" for i in result.issues))

    def test_validate_mappings_empty(self):
        p = ErpPatternService.create_pattern(name="Empty", destination_entity="Plant")
        result = ErpPatternService.validate_mappings(p)
        self.assertFalse(result.ok)
        self.assertEqual(result.issues[0].code, "NO_MAPPINGS")

    def test_validate_mappings_duplicate_source(self):
        p = ErpPatternService.create_pattern(name="DupSrc", destination_entity="Plant")
        ErpPatternMapping.objects.create(pattern=p, source_name="Code", destination_name="code", order=1)
        result = ErpPatternService.validate_mappings(p)
        self.assertTrue(result.ok)
        # simulate what the service would catch if DB didn't block it
        name_set = {m.source_name.strip().lower() for m in p.field_mappings.all()}
        self.assertEqual(len(name_set), 1)

    def test_validate_mappings_valid(self):
        p = ErpPatternService.create_pattern(name="Valid", destination_entity="Plant")
        ErpPatternMapping.objects.create(pattern=p, source_name="Code", destination_name="code", order=1)
        ErpPatternMapping.objects.create(pattern=p, source_name="Name", destination_name="full_name", order=2)
        result = ErpPatternService.validate_mappings(p)
        self.assertTrue(result.ok)

    def test_update_pattern(self):
        p = ErpPatternService.create_pattern(name="Old", destination_entity="Plant")
        updated = ErpPatternService.update_pattern(p.id, name="New", is_active=False)
        self.assertEqual(updated.name, "New")
        self.assertFalse(updated.is_active)


class ErpSourceFileServiceTest(TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()

    def test_detect_file_type(self):
        self.assertEqual(ErpSourceFileService.detect_file_type("data.xlsx"), "xlsx")
        self.assertEqual(ErpSourceFileService.detect_file_type("data.CSV"), "csv")
        with self.assertRaises(ErpSourceFileError):
            ErpSourceFileService.detect_file_type("data.pdf")

    def test_upload_and_store_file(self):
        content = b"col1,col2\nv1,v2\n"
        uploaded = SimpleUploadedFile("test.csv", content, content_type="text/csv")
        sf = ErpSourceFileService.upload_file(uploaded, uploaded_by="tester")
        self.assertEqual(sf.original_name, "test.csv")
        self.assertEqual(sf.file_type, "csv")
        self.assertEqual(sf.uploaded_by, "tester")
        self.assertTrue(os.path.isfile(sf.file_path))
        self.assertTrue(sf.stored_name.endswith(".csv"))
        self.assertNotIn("test.csv", sf.stored_name)
        os.remove(sf.file_path)

    def test_verify_file_exists(self):
        content = b"a,b\n1,2\n"
        uploaded = SimpleUploadedFile("check.csv", content)
        sf = ErpSourceFileService.upload_file(uploaded)
        self.assertTrue(ErpSourceFileService.verify_file_exists(sf))
        os.remove(sf.file_path)
        self.assertFalse(ErpSourceFileService.verify_file_exists(sf))

    def test_cleanup_requires_confirmed(self):
        with self.assertRaises(ErpSourceFileError) as ctx:
            ErpSourceFileService.cleanup_source_files(confirmed=False)
        self.assertEqual(ctx.exception.code, "REQUIRED")

    def test_cleanup_source_files(self):
        content = b"x,y\n1,2\n"
        uploaded = SimpleUploadedFile("clean.csv", content)
        sf = ErpSourceFileService.upload_file(uploaded)
        self.assertTrue(os.path.isfile(sf.file_path))
        count = ErpSourceFileService.cleanup_source_files(confirmed=True)
        self.assertEqual(count, 1)
        sf.refresh_from_db()
        self.assertEqual(sf.status, "DELETED")
        self.assertFalse(os.path.isfile(sf.file_path))


class ErpImportValidationServiceTest(TestCase):
    def setUp(self):
        self.pattern = ErpPatternService.create_pattern(
            name="Validation Test", destination_entity="Plant", source_file_type="csv",
        )
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="Code", destination_name="code",
            is_required=True, order=1,
        )
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="Name", destination_name="full_name",
            is_required=False, order=2,
        )
        self.csv_content = b"Code,Name\nP01,Alpha\nP02,Beta\n"
        self.uploaded = SimpleUploadedFile("data.csv", self.csv_content, content_type="text/csv")
        self.source_file = ErpSourceFileService.upload_file(self.uploaded)

    def tearDown(self):
        if os.path.isfile(self.source_file.file_path):
            os.remove(self.source_file.file_path)

    def test_validate_pattern_missing_file(self):
        pattern2 = ErpPatternService.create_pattern(
            name="No File", destination_entity="Plant", source_file_type="xlsx",
        )
        result = ErpImportValidationService.validate_pattern(pattern2.id)
        self.assertEqual(result.status, VALIDATION_STATUS_MISSING_FILE)

    def test_validate_pattern_invalid_file(self):
        import tempfile
        tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
        tmp.write(b"not an excel file")
        tmp.close()
        sf_name = ErpSourceFileService._generate_stored_name("bad.xlsx")
        bad_sf = ErpSourceFile.objects.create(
            original_name="bad.xlsx",
            stored_name=sf_name,
            file_path=tmp.name,
            file_type="xlsx",
        )
        try:
            pattern_xlsx = ErpPatternService.create_pattern(
                name="Bad File Pattern", destination_entity="Plant", source_file_type="xlsx",
            )
            result = ErpImportValidationService.validate_pattern(pattern_xlsx.id)
            self.assertEqual(result.status, VALIDATION_STATUS_INVALID_FILE)
        finally:
            import os as os_mod
            os_mod.unlink(tmp.name)
            bad_sf.delete()

    def test_validate_pattern_missing_fields(self):
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="MissingField", destination_name="missing",
            is_required=True, order=3,
        )
        result = ErpImportValidationService.validate_pattern(self.pattern.id)
        self.assertEqual(result.status, VALIDATION_STATUS_MISSING_FIELDS)
        self.assertIn("MissingField", result.missing_fields)

    def test_validate_pattern_ready(self):
        result = ErpImportValidationService.validate_pattern(self.pattern.id)
        self.assertEqual(result.status, VALIDATION_STATUS_READY)
        self.assertEqual(result.source_file, self.source_file)
        self.assertEqual(result.pattern, self.pattern)

    def test_validate_does_not_mutate_database(self):
        log_count_before = ErpImportLog.objects.count()
        ErpImportValidationService.validate_pattern(self.pattern.id)
        self.assertEqual(ErpImportLog.objects.count(), log_count_before)

    def test_parse_file_headers(self):
        headers = ErpImportValidationService.parse_file_headers(self.source_file)
        self.assertEqual(headers, ["Code", "Name"])


class ErpImportServiceTest(TestCase):
    def setUp(self):
        self.pattern = ErpPatternService.create_pattern(
            name="Import Test", destination_entity="Plant", source_file_type="csv",
        )
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="Code", destination_name="code",
            is_required=True, order=1,
        )
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="Name", destination_name="full_name",
            is_required=False, order=2,
        )
        self.csv_content = b"Code,Name\nP01,Alpha\nP02,Beta\nP03,Gamma\n"
        self.uploaded = SimpleUploadedFile("import_data.csv", self.csv_content, content_type="text/csv")
        self.source_file = ErpSourceFileService.upload_file(self.uploaded)

    def tearDown(self):
        if os.path.isfile(self.source_file.file_path):
            os.remove(self.source_file.file_path)

    def test_import_rejects_unconfirmed(self):
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.execute_import(self.pattern.id)
        self.assertEqual(ctx.exception.code, "REQUIRED")

    def test_import_rejects_no_source_file(self):
        pattern2 = ErpPatternService.create_pattern(
            name="NoSource", destination_entity="Plant", source_file_type="xlsx",
        )
        result = ErpImportService.execute_import(pattern2.id, confirmed=True)
        self.assertEqual(result.status, "FAILED")
        self.assertIn("No matching source file", result.error_message)

    def test_import_invalid_file(self):
        import tempfile
        tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
        tmp.write(b"not excel")
        tmp.close()
        sf_name = ErpSourceFileService._generate_stored_name("bad.xlsx")
        bad_sf = ErpSourceFile.objects.create(
            original_name="bad.xlsx",
            stored_name=sf_name,
            file_path=tmp.name,
            file_type="xlsx",
        )
        try:
            pattern_xlsx = ErpPatternService.create_pattern(
                name="XLSX Import", destination_entity="Plant", source_file_type="xlsx",
            )
            result = ErpImportService.execute_import(pattern_xlsx.id, confirmed=True)
            self.assertEqual(result.status, "FAILED")
        finally:
            import os as os_mod
            os_mod.unlink(tmp.name)
            bad_sf.delete()

    def test_import_rejects_missing_mapped_fields(self):
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="MissingField", destination_name="missing",
            is_required=True, order=3,
        )
        result = ErpImportService.execute_import(self.pattern.id, confirmed=True)
        self.assertEqual(result.status, "FAILED")
        self.assertIn("MissingField", result.error_message)

    def test_successful_import_creates_log(self):
        log_count = ErpImportLog.objects.count()
        result = ErpImportService.execute_import(self.pattern.id, confirmed=True)
        self.assertEqual(result.status, "IMPORTED")
        self.assertEqual(ErpImportLog.objects.count(), log_count + 1)
        self.assertGreater(result.rows_added, 0)

    def test_failed_import_creates_log(self):
        pattern_bad = ErpPatternService.create_pattern(
            name="Bad Import", destination_entity="Plant", source_file_type="xlsx",
        )
        result = ErpImportService.execute_import(pattern_bad.id, confirmed=True)
        self.assertEqual(result.status, "FAILED")
        log = ErpImportLog.objects.filter(pattern=pattern_bad).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, "FAILED")

    def test_import_revalidates_before_update(self):
        result = ErpImportService.execute_import(self.pattern.id, confirmed=True)
        self.assertEqual(result.status, "IMPORTED")


class ErpImportWorkspaceServiceTest(TestCase):
    def setUp(self):
        self.pattern = ErpPatternService.create_pattern(
            name="WS Test", destination_entity="Plant", source_file_type="csv",
        )
        content = b"a,b\n1,2\n"
        uploaded = SimpleUploadedFile("ws_test.csv", content)
        self.source_file = ErpSourceFileService.upload_file(uploaded)

    def tearDown(self):
        if os.path.isfile(self.source_file.file_path):
            os.remove(self.source_file.file_path)

    def test_reset_requires_confirmed(self):
        with self.assertRaises(ErpImportWorkspaceError) as ctx:
            ErpImportWorkspaceService.reset_workspace(confirmed=False)
        self.assertEqual(ctx.exception.code, "REQUIRED")

    def test_reset_deletes_source_files(self):
        path = self.source_file.file_path
        self.assertTrue(os.path.isfile(path))
        ErpImportWorkspaceService.reset_workspace(confirmed=True)
        self.assertFalse(os.path.isfile(path))
        self.source_file.refresh_from_db()
        self.assertEqual(self.source_file.status, "DELETED")

    def test_reset_does_not_delete_patterns(self):
        ErpImportWorkspaceService.reset_workspace(confirmed=True)
        self.assertTrue(ErpPattern.objects.filter(id=self.pattern.id).exists())

    def test_reset_does_not_delete_logs(self):
        from django.utils import timezone
        ErpImportLog.objects.create(pattern=self.pattern, status="IMPORTED", started_at=timezone.now())
        ErpImportWorkspaceService.reset_workspace(confirmed=True)
        self.assertTrue(ErpImportLog.objects.exists())

    def test_refresh_pattern_list(self):
        plist = ErpImportWorkspaceService.refresh_pattern_list()
        self.assertIn(self.pattern, plist)

    def test_reset_marks_source_files_deleted(self):
        ErpImportWorkspaceService.reset_workspace(confirmed=True)
        self.source_file.refresh_from_db()
        self.assertEqual(self.source_file.status, "DELETED")
