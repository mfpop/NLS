import os
import tempfile
from pathlib import Path
from unittest.mock import patch, Mock

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from data_management.models import ErpPattern, ErpPatternMapping, ErpSourceFile, ErpImportLog
from data_management.services.erp_source_file_service import (
    ErpSourceFileService, ErpSourceFileError, _validate_path_within_source_root, get_source_root,
)
from data_management.services.erp_import_workspace_service import ErpImportWorkspaceService
from data_management.services.erp_import_validation_service import ErpImportValidationService
from data_management.services.erp_import_service import ErpImportService


# ─── Model Contract ────────────────────────────────────────────────

class ModelContractTest(TestCase):
    """Verify model fields match the approved contract."""

    def test_erp_pattern_contract_fields(self):
        approved = {"name", "source_file_type", "destination_entity",
                     "is_active", "created_by", "created_at", "updated_at"}
        field_names = {f.name for f in ErpPattern._meta.get_fields()
                       if not f.is_relation}
        self.assertTrue(approved.issubset(field_names),
                        msg=f"Missing: {approved - field_names}")

    def test_erp_pattern_mapping_contract_fields(self):
        approved = {"pattern", "source_name", "source_data_type",
                     "destination_name", "destination_data_type",
                     "is_required", "transform_rule", "order"}
        field_names = {f.name for f in ErpPatternMapping._meta.get_fields()}
        self.assertTrue(approved.issubset(field_names),
                        msg=f"Missing: {approved - field_names}")

    def test_erp_source_file_no_required_pattern_fk(self):
        for f in ErpSourceFile._meta.get_fields():
            if f.name == "pattern":
                self.fail("ErpSourceFile must not have a pattern FK")
        # Verify no FK to ErpPattern
        for f in ErpSourceFile._meta.get_fields():
            if f.is_relation and hasattr(f, "related_model") and f.related_model == ErpPattern:
                self.fail(f"ErpSourceFile has unexpected FK to ErpPattern: {f.name}")

    def test_erp_import_log_protect_not_cascade(self):
        pattern_fk = ErpImportLog._meta.get_field("pattern")
        self.assertEqual(pattern_fk.remote_field.on_delete.__name__, "PROTECT")

    def test_erp_import_log_source_file_set_null(self):
        sf_fk = ErpImportLog._meta.get_field("source_file")
        self.assertEqual(sf_fk.remote_field.on_delete.__name__, "SET_NULL")


# ─── Security / Path Safety ────────────────────────────────────────

class PathSafetyTest(TestCase):
    def test_path_containment_valid(self):
        root = get_source_root()
        safe_path = root / "test.csv"
        resolved = _validate_path_within_source_root(str(safe_path))
        self.assertEqual(resolved, safe_path.resolve())

    def test_path_containment_rejects_escape(self):
        with self.assertRaises(ErpSourceFileError) as ctx:
            _validate_path_within_source_root("/etc/passwd")
        self.assertEqual(ctx.exception.code, "PATH_ESCAPE")

    def test_path_containment_rejects_relative_escape(self):
        with self.assertRaises(ErpSourceFileError) as ctx:
            _validate_path_within_source_root("../../../../etc/passwd")
        self.assertEqual(ctx.exception.code, "PATH_ESCAPE")

    def test_stored_name_ignores_original_path(self):
        stored = ErpSourceFileService._generate_stored_name("../../../etc/passwd.csv")
        self.assertNotIn("etc", stored)
        self.assertNotIn("passwd", stored)
        self.assertTrue(stored.endswith(".csv"))
        self.assertEqual(len(stored), 32 + 4)  # 32 hex chars + ".csv"

    def test_upload_rejects_unknown_extension(self):
        evil = SimpleUploadedFile("test.exe", b"evil", content_type="application/x-msdownload")
        with self.assertRaises(ErpSourceFileError) as ctx:
            ErpSourceFileService.upload_file(evil)
        self.assertEqual(ctx.exception.code, "UNSUPPORTED")

    def test_upload_sanitizes_filename(self):
        content = b"a,b\n1,2\n"
        uploaded = SimpleUploadedFile("../../../etc/hosts.csv", content)
        sf = ErpSourceFileService.upload_file(uploaded)
        try:
            self.assertNotIn("etc", sf.stored_name)
            self.assertNotIn("hosts", sf.stored_name)
            self.assertNotIn("..", sf.stored_name)
            self.assertTrue(sf.stored_name.endswith(".csv"))
            self.assertIn("source", sf.file_path)
        finally:
            if os.path.isfile(sf.file_path):
                os.remove(sf.file_path)

    def test_cleanup_rejects_escaped_path(self):
        sf = ErpSourceFile.objects.create(
            original_name="escape.csv",
            stored_name="escape.csv",
            file_path="/tmp/outside_erp.csv",
        )
        with self.assertRaises(ErpSourceFileError) as ctx:
            ErpSourceFileService.cleanup_source_files(confirmed=True)
        self.assertEqual(ctx.exception.code, "PATH_ESCAPE")


# ─── Validation Isolation ──────────────────────────────────────────

class ValidationIsolationTest(TestCase):
    def setUp(self):
        self.pattern = ErpPattern.objects.create(
            name="Isolation Test", destination_entity="Plant", source_file_type="csv",
        )
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="Code", destination_name="code", order=1,
        )
        content = b"Code,Name\nP01,Alpha\n"
        uploaded = SimpleUploadedFile("iso.csv", content)
        self.sf = ErpSourceFileService.upload_file(uploaded)

    def tearDown(self):
        if os.path.isfile(self.sf.file_path):
            os.remove(self.sf.file_path)

    def test_validation_creates_no_import_log(self):
        count_before = ErpImportLog.objects.count()
        ErpImportValidationService.validate_pattern(self.pattern.id)
        self.assertEqual(ErpImportLog.objects.count(), count_before)

    def test_validation_does_not_change_source_file_status(self):
        original_status = self.sf.status
        ErpImportValidationService.validate_pattern(self.pattern.id)
        self.sf.refresh_from_db()
        self.assertEqual(self.sf.status, original_status)


# ─── Import Transaction Safety ─────────────────────────────────────

class ImportTransactionSafetyTest(TestCase):
    def setUp(self):
        self.pattern = ErpPattern.objects.create(
            name="Tx Safety", destination_entity="Plant", source_file_type="csv",
        )
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="A", destination_name="a", order=1,
        )

    def test_import_failure_inside_transaction_creates_failed_log(self):
        """When _apply_import raises, a FAILED log must still exist."""
        from data_management.services.erp_import_service import ErpImportService
        # No source file uploaded → validation fails → FAILED log
        result = ErpImportService.execute_import(self.pattern.id, confirmed=True)
        self.assertEqual(result.status, "FAILED")
        log = ErpImportLog.objects.filter(pattern=self.pattern, status="FAILED").first()
        self.assertIsNotNone(log, "Failed import must create a FAILED ErpImportLog")


# ─── Reset Isolation ───────────────────────────────────────────────

class ResetIsolationTest(TestCase):
    def setUp(self):
        self.pattern = ErpPattern.objects.create(
            name="Reset Iso", destination_entity="Plant", source_file_type="csv",
        )
        content = b"a,b\n1,2\n"
        uploaded = SimpleUploadedFile("reset_iso.csv", content)
        self.sf = ErpSourceFileService.upload_file(uploaded)

    def tearDown(self):
        if os.path.isfile(self.sf.file_path):
            os.remove(self.sf.file_path)

    def test_reset_marks_source_files_deleted(self):
        ErpImportWorkspaceService.reset_workspace(confirmed=True)
        self.sf.refresh_from_db()
        self.assertEqual(self.sf.status, "DELETED")

    def test_reset_does_not_delete_patterns(self):
        ErpImportWorkspaceService.reset_workspace(confirmed=True)
        self.assertTrue(ErpPattern.objects.filter(id=self.pattern.id).exists())

    def test_reset_does_not_delete_logs(self):
        from django.utils import timezone
        ErpImportLog.objects.create(pattern=self.pattern, status="IMPORTED", started_at=timezone.now())
        ErpImportWorkspaceService.reset_workspace(confirmed=True)
        self.assertTrue(ErpImportLog.objects.exists())


# ─── GraphQL Resolver Purity ───────────────────────────────────────

class GraphQLResolverPurityTest(TestCase):
    """Verify GraphQL resolvers contain no forbidden calls."""

    def _get_source_body(self, method) -> str:
        import inspect
        source = inspect.getsource(method)
        body = source.split(":", 1)[-1] if ":" in source else source
        return body

    def test_queries_no_forbidden_calls(self):
        from data_management.graphql.erp_import_queries import ErpImportQuery
        import inspect
        forbidden = ["transaction.atomic", "open(", ".read(", ".write(",
                     "bulk_create", " save(", ".delete("]
        for name, method in inspect.getmembers(ErpImportQuery, predicate=inspect.isfunction):
            if name.startswith("_"):
                continue
            body = self._get_source_body(method)
            for token in forbidden:
                self.assertNotIn(token, body,
                                 f"Query '{name}' contains forbidden '{token}'")

    def test_mutations_no_forbidden_calls(self):
        from data_management.graphql.erp_import_mutations import ErpImportMutation
        import inspect
        forbidden = ["transaction.atomic", "open(", ".read(", ".write(",
                     "bulk_create", " save(", ".delete("]
        for name, method in inspect.getmembers(ErpImportMutation, predicate=inspect.isfunction):
            if name.startswith("_"):
                continue
            body = self._get_source_body(method)
            for token in forbidden:
                self.assertNotIn(token, body,
                                 f"Mutation '{name}' contains forbidden '{token}'")


# ─── ErpImportLog Immutability ─────────────────────────────────────

class ImportLogImmutabilityTest(TestCase):
    def setUp(self):
        self.pattern = ErpPattern.objects.create(
            name="Log Immu", destination_entity="Plant", source_file_type="csv",
        )
        self.log = ErpImportLog.objects.create(pattern=self.pattern, status="IMPORTED")

    def test_log_survives_source_file_delete(self):
        content = b"a,b\n1,2\n"
        uploaded = SimpleUploadedFile("log_survive.csv", content)
        sf = ErpSourceFileService.upload_file(uploaded)
        log2 = ErpImportLog.objects.create(pattern=self.pattern, source_file=sf)
        log_id = log2.pk
        sf.delete()
        self.assertTrue(ErpImportLog.objects.filter(pk=log_id).exists())

    def test_log_survives_pattern_reset(self):
        """Workspace reset must not cascade to logs."""
        log_id = self.log.pk
        from data_management.services.erp_import_workspace_service import ErpImportWorkspaceService
        ErpImportWorkspaceService.reset_workspace(confirmed=True)
        self.assertTrue(ErpImportLog.objects.filter(pk=log_id).exists())
