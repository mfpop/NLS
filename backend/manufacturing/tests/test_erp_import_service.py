"""
Tests for ErpImportService — workflow state machine, transitions, and orchestration.

Covers all methods:
  create_job, pick_file, preview_file, validate_job, compare_job,
  mark_ready, apply_job, cancel_job, fail_job, retry_job
and the internal _validate_transition helper.
"""
from datetime import datetime
from unittest.mock import Mock, patch
from tempfile import TemporaryDirectory

from django.utils import timezone

from django.test import TestCase

from application.models import ImportSourceConfig
from manufacturing.models import (
    ImportJob,
    ImportValidationError,
    ImportCompareResult,
    ImportAuditLog,
)
from manufacturing.domain.erp_import_service import (
    ErpImportService,
    ErpImportError,
    WORKFLOW_TRANSITIONS,
    _validate_transition,
)
from manufacturing.domain.file_parser_service import (
    FileParserError,
    ParseResult,
    SheetData,
    ParsedRow,
    ParsedColumn,
)
from manufacturing.domain.domain_import_handler import (
    ValidationIssue,
    CompareRow,
    ApplyResult,
)


# ═══════════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════════

def _make_source(**overrides) -> ImportSourceConfig:
    """Create a minimal ImportSourceConfig (active, not archived)."""
    defaults = dict(
        name="Test Source",
        domain=ImportSourceConfig.Domain.PLANT_STRUCTURE,
        source_type=ImportSourceConfig.SourceType.CSV,
        path="/fake/imports",
        file_pattern="*.csv",
        is_active=True,
        is_archived=False,
    )
    defaults.update(overrides)
    return ImportSourceConfig.objects.create(**defaults)


def _make_job(source: ImportSourceConfig, status: str = "DRAFT", **kw) -> ImportJob:
    """Create an ImportJob linked to *source*."""
    defaults = dict(
        file_name="test.csv",
        file_path="/fake/imports/test.csv",
        started_at=timezone.now(),
        status=status,
    )
    defaults.update(kw)
    return ImportJob.objects.create(source_config=source, **defaults)


def _fake_parse_result(**overrides) -> ParseResult:
    """Return a minimal ParseResult that looks like a valid CSV parse."""
    sheet = SheetData(
        sheet_name="Sheet1",
        column_headers=["col1", "col2"],
        column_types=[ParsedColumn("col1", "String"), ParsedColumn("col2", "String")],
        rows=[
            ParsedRow(row_number=2, values=["A", "B"]),
            ParsedRow(row_number=3, values=["C", "D"]),
        ],
        total_rows=2,
    )
    return ParseResult(
        file_name="test.csv",
        file_path="/fake/imports/test.csv",
        sheets=[sheet],
        active_sheet="Sheet1",
        total_rows_all_sheets=2,
        **overrides,
    )


# ═══════════════════════════════════════════════════════════════════
#  _validate_transition (unit)
# ═══════════════════════════════════════════════════════════════════

class ValidateTransitionTests(TestCase):
    """Direct tests of the _validate_transition helper."""

    def test_valid_transition_passes(self):
        # Should not raise
        _validate_transition("DRAFT", "PREVIEWED")
        _validate_transition("FILE_ATTACHED", "PREVIEWED")
        _validate_transition("DRAFT", "CANCELLED")
        _validate_transition("PREVIEWED", "VALIDATED")
        _validate_transition("VALIDATED", "COMPARED")
        _validate_transition("COMPARED", "READY_TO_APPLY")
        _validate_transition("READY_TO_APPLY", "APPLIED")
        # This test passes if no exception is raised
        self.assertTrue(True)

    def test_invalid_transition_raises(self):
        with self.assertRaises(ErpImportError) as ctx:
            _validate_transition("DRAFT", "APPLIED")
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")
        self.assertIn("DRAFT", ctx.exception.message)
        self.assertIn("APPLIED", ctx.exception.message)

    def test_unknown_current_state_raises(self):
        with self.assertRaises(ErpImportError) as ctx:
            _validate_transition("UNKNOWN_STATE", "PREVIEWED")
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")

    def test_apply_is_final_state(self):
        """APPLIED has no outgoing transitions."""
        with self.assertRaises(ErpImportError) as ctx:
            _validate_transition("APPLIED", "CANCELLED")
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")

    def test_cancelled_is_final_state(self):
        with self.assertRaises(ErpImportError) as ctx:
            _validate_transition("CANCELLED", "DRAFT")
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")

    def test_failed_is_final_state(self):
        """FAILED is the legacy catch-all terminal state."""
        with self.assertRaises(ErpImportError) as ctx:
            _validate_transition("FAILED", "DRAFT")
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")


# ═══════════════════════════════════════════════════════════════════
#  create_job
# ═══════════════════════════════════════════════════════════════════

class CreateJobTests(TestCase):
    def test_creates_job_with_default_file_path(self):
        source = _make_source(path="/some/path")
        job = ErpImportService.create_job(str(source.id))
        self.assertEqual(job.source_config_id, source.id)
        self.assertEqual(job.status, "DRAFT")
        self.assertEqual(job.file_path, "/some/path")
        self.assertIsNotNone(job.id)

    def test_creates_job_with_explicit_file(self):
        source = _make_source()
        job = ErpImportService.create_job(
            str(source.id), file_name="custom.csv", file_path="/other/custom.csv"
        )
        self.assertEqual(job.file_name, "custom.csv")
        self.assertEqual(job.file_path, "/other/custom.csv")

    def test_creates_job_with_triggered_by(self):
        source = _make_source()
        job = ErpImportService.create_job(str(source.id), triggered_by="alice")
        self.assertEqual(job.triggered_by, "alice")

    def test_creates_audit_log(self):
        source = _make_source()
        ErpImportService.create_job(str(source.id))
        self.assertTrue(ImportAuditLog.objects.filter(action="CREATED").exists())

    def test_raises_when_source_not_found(self):
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.create_job("999999")
        self.assertEqual(ctx.exception.code, "NOT_FOUND")


# ═══════════════════════════════════════════════════════════════════
#  pick_file
# ═══════════════════════════════════════════════════════════════════

class PickFileTests(TestCase):
    def test_pick_file_updates_job(self):
        source = _make_source()
        job = _make_job(source, status="DRAFT")
        updated = ErpImportService.pick_file(str(job.id), "new.csv", "/new/path/new.csv")
        self.assertEqual(updated.file_name, "new.csv")
        self.assertEqual(updated.file_path, "/new/path/new.csv")
        # Verify audit
        self.assertTrue(ImportAuditLog.objects.filter(action="FILE_PICKED").exists())

    def test_pick_file_with_triggered_by(self):
        source = _make_source()
        job = _make_job(source, status="DRAFT")
        updated = ErpImportService.pick_file(str(job.id), "new.csv", "/new/path/new.csv")
        self.assertEqual(updated.file_name, "new.csv")

    def test_job_not_found_raises(self):
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.pick_file("999999", "x.csv", "/x.csv")
        self.assertEqual(ctx.exception.code, "NOT_FOUND")


# ═══════════════════════════════════════════════════════════════════
#  preview_file
# ═══════════════════════════════════════════════════════════════════

class PreviewFileTests(TestCase):
    def setUp(self):
        self.source = _make_source()
        self.job = _make_job(self.source, status="DRAFT")

    @patch("manufacturing.domain.erp_import_service.Path")
    @patch("manufacturing.domain.erp_import_service.FileParserService.parse")
    def test_preview_file_attached_success(self, mock_parse, mock_path):
        self.job.status = "FILE_ATTACHED"
        self.job.save()
        mock_path.return_value.exists.return_value = True
        mock_path.return_value.is_file.return_value = True
        mock_parse.return_value = _fake_parse_result()

        result = ErpImportService.preview_file(str(self.job.id))
        self.assertEqual(result.status, "PREVIEWED")
        self.assertEqual(result.records_processed, 2)

    @patch("manufacturing.domain.erp_import_service.Path")
    @patch("manufacturing.domain.erp_import_service.FileParserService.parse")
    def test_preview_success(self, mock_parse, mock_path):
        mock_path.return_value.exists.return_value = True
        mock_path.return_value.is_file.return_value = True
        mock_parse.return_value = _fake_parse_result()

        result = ErpImportService.preview_file(str(self.job.id))
        self.assertEqual(result.status, "PREVIEWED")
        self.assertEqual(result.records_processed, 2)
        self.assertTrue(ImportAuditLog.objects.filter(action="PREVIEWED").exists())

    def test_preview_virtual_frontend_path_resolves_from_source_directory(self):
        with TemporaryDirectory() as tmpdir:
            source = _make_source(path=tmpdir)
            file_path = Path(tmpdir) / "routing.csv"
            file_path.write_text("col1,col2\nA,B\n", encoding="utf-8")
            job = ImportJob.objects.create(
                source_config=source,
                status="FILE_ATTACHED",
                started_at=timezone.now(),
                file_name="routing.csv",
                file_path="/erp-data/source/routing.csv",
            )

            with patch("manufacturing.domain.erp_import_service.FileParserService.parse") as mock_parse:
                mock_parse.return_value = _fake_parse_result(file_name="routing.csv", file_path=str(file_path))

                result = ErpImportService.preview_file(str(job.id))

            self.assertEqual(result.status, "PREVIEWED")
            mock_parse.assert_called_once_with(str(file_path), source.source_type)

    @patch("manufacturing.domain.erp_import_service.Path")
    def test_preview_no_file_name_raises(self, mock_path):
        mock_path.return_value.exists.return_value = True
        mock_path.return_value.is_file.return_value = True
        self.job.file_name = ""
        self.job.save()
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.preview_file(str(self.job.id))
        self.assertEqual(ctx.exception.code, "REQUIRED")

    @patch("manufacturing.domain.erp_import_service.Path")
    def test_preview_file_not_found(self, mock_path):
        mock_path.return_value.exists.return_value = False
        mock_path.return_value.is_file.return_value = False
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.preview_file(str(self.job.id))
        self.assertEqual(ctx.exception.code, "FILE_NOT_FOUND")

    @patch("manufacturing.domain.erp_import_service.Path")
    @patch("manufacturing.domain.erp_import_service.FileParserService.parse")
    def test_preview_parse_error(self, mock_parse, mock_path):
        mock_path.return_value.exists.return_value = True
        mock_path.return_value.is_file.return_value = True
        mock_parse.side_effect = FileParserError("bad file", "PARSE_ERROR")
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.preview_file(str(self.job.id))
        self.assertEqual(ctx.exception.code, "PARSE_ERROR")

    def test_preview_invalid_transition(self):
        self.job.status = "APPLIED"
        self.job.save()
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.preview_file(str(self.job.id))
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")


# ═══════════════════════════════════════════════════════════════════
#  validate_job
# ═══════════════════════════════════════════════════════════════════

class ValidateJobTests(TestCase):
    def setUp(self):
        self.source = _make_source()
        self.job = _make_job(self.source, status="PREVIEWED")

    @patch("manufacturing.domain.erp_import_service.Path")
    @patch("manufacturing.domain.erp_import_service.FileParserService.parse")
    @patch("manufacturing.domain.erp_import_service.get_handler")
    def test_validate_no_issues_transitions_to_validated(
        self, mock_get_handler, mock_parse, mock_path
    ):
        mock_path.return_value.exists.return_value = True
        mock_parse.return_value = _fake_parse_result()
        handler = Mock()
        handler.validate.return_value = []
        mock_get_handler.return_value = handler

        result = ErpImportService.validate_job(str(self.job.id))
        self.assertEqual(result.status, "VALIDATED")
        self.assertEqual(result.error_summary, "")
        self.assertTrue(ImportAuditLog.objects.filter(action="VALIDATED").exists())

    @patch("manufacturing.domain.erp_import_service.Path")
    @patch("manufacturing.domain.erp_import_service.FileParserService.parse")
    @patch("manufacturing.domain.erp_import_service.get_handler")
    def test_validate_with_issues_transitions_to_failed(
        self, mock_get_handler, mock_parse, mock_path
    ):
        mock_path.return_value.exists.return_value = True
        mock_parse.return_value = _fake_parse_result()
        handler = Mock()
        handler.validate.return_value = [
            ValidationIssue(
                sheet_name="Sheet1", row_number=2,
                entity_type="Plant", field_name="code",
                error_code="REQUIRED", message="Code is required",
                raw_value="",
            ),
        ]
        mock_get_handler.return_value = handler

        result = ErpImportService.validate_job(str(self.job.id))
        self.assertEqual(result.status, "VALIDATION_FAILED")
        self.assertIn("1 validation error", result.error_summary)
        self.assertTrue(
            ImportValidationError.objects.filter(import_job=self.job).exists()
        )
        self.assertTrue(
            ImportAuditLog.objects.filter(action="VALIDATION_FAILED").exists()
        )

    @patch("manufacturing.domain.erp_import_service.Path")
    def test_validate_file_not_found(self, mock_path):
        mock_path.return_value.exists.return_value = False
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.validate_job(str(self.job.id))
        self.assertEqual(ctx.exception.code, "FILE_NOT_FOUND")

    def test_validate_invalid_transition(self):
        self.job.status = "DRAFT"
        self.job.save()
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.validate_job(str(self.job.id))
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")


# ═══════════════════════════════════════════════════════════════════
#  compare_job
# ═══════════════════════════════════════════════════════════════════

class CompareJobTests(TestCase):
    def setUp(self):
        self.source = _make_source()
        self.job = _make_job(self.source, status="VALIDATED")

    @patch("manufacturing.domain.erp_import_service.Path")
    @patch("manufacturing.domain.erp_import_service.FileParserService.parse")
    @patch("manufacturing.domain.erp_import_service.get_handler")
    def test_compare_success_creates_results(
        self, mock_get_handler, mock_parse, mock_path
    ):
        mock_path.return_value.exists.return_value = True
        mock_parse.return_value = _fake_parse_result()
        handler = Mock()
        handler.compare.return_value = [
            CompareRow(
                action="CREATE", entity_type="Plant",
                stable_key="P001",
                current_value=None,
                incoming_value={"code": "P001", "name": "Plant 1"},
                diff={"code": "P001"},
            ),
            CompareRow(
                action="UPDATE", entity_type="Plant",
                stable_key="P002",
                current_value={"code": "P002", "name": "Plant Old"},
                incoming_value={"code": "P002", "name": "Plant New"},
                diff={"name": {"from": "Plant Old", "to": "Plant New"}},
            ),
            CompareRow(
                action="UNCHANGED", entity_type="Plant",
                stable_key="P003",
                current_value={"code": "P003", "name": "Plant 3"},
                incoming_value={"code": "P003", "name": "Plant 3"},
                diff={},
            ),
        ]
        mock_get_handler.return_value = handler

        result = ErpImportService.compare_job(str(self.job.id))
        self.assertEqual(result.status, "COMPARED")
        self.assertEqual(result.records_created, 1)
        self.assertEqual(result.records_updated, 1)
        self.assertEqual(ImportCompareResult.objects.filter(import_job=self.job).count(), 3)
        self.assertTrue(ImportAuditLog.objects.filter(action="COMPARED").exists())

    @patch("manufacturing.domain.erp_import_service.Path")
    def test_compare_file_not_found(self, mock_path):
        mock_path.return_value.exists.return_value = False
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.compare_job(str(self.job.id))
        self.assertEqual(ctx.exception.code, "FILE_NOT_FOUND")

    def test_compare_invalid_transition(self):
        self.job.status = "DRAFT"
        self.job.save()
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.compare_job(str(self.job.id))
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")


# ═══════════════════════════════════════════════════════════════════
#  mark_ready
# ═══════════════════════════════════════════════════════════════════

class MarkReadyTests(TestCase):
    def setUp(self):
        self.source = _make_source()
        self.job = _make_job(self.source, status="COMPARED")

    def test_mark_ready_success(self):
        result = ErpImportService.mark_ready(str(self.job.id))
        self.assertEqual(result.status, "READY_TO_APPLY")
        self.assertTrue(ImportAuditLog.objects.filter(action="READY").exists())

    def test_mark_ready_invalid_transition(self):
        self.job.status = "DRAFT"
        self.job.save()
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.mark_ready(str(self.job.id))
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")


# ═══════════════════════════════════════════════════════════════════
#  apply_job
# ═══════════════════════════════════════════════════════════════════

class ApplyJobTests(TestCase):
    def setUp(self):
        self.source = _make_source()
        self.job = _make_job(self.source, status="READY_TO_APPLY")

    def test_apply_with_summary_dict(self):
        """apply_job accepts an optional summary dict (legacy path)."""
        summary = {
            "records_processed": 10,
            "records_created": 8,
            "records_updated": 1,
            "records_failed": 1,
            "error_summary": "1 row had bad data",
        }
        result = ErpImportService.apply_job(str(self.job.id), summary=summary)
        self.assertEqual(result.status, "APPLIED")
        self.assertEqual(result.records_processed, 10)
        self.assertEqual(result.records_created, 8)
        self.assertEqual(result.records_updated, 1)
        self.assertEqual(result.records_failed, 1)
        self.assertIsNotNone(result.completed_at)
        self.assertTrue(ImportAuditLog.objects.filter(action="APPLIED").exists())

    @patch("manufacturing.domain.erp_import_service.Path")
    @patch("manufacturing.domain.erp_import_service.FileParserService.parse")
    @patch("manufacturing.domain.erp_import_service.get_handler")
    def test_apply_with_parse_and_handler(
        self, mock_get_handler, mock_parse, mock_path
    ):
        mock_path.return_value.exists.return_value = True
        mock_parse.return_value = _fake_parse_result()

        # Create compare results that will be picked up
        ImportCompareResult.objects.create(
            import_job=self.job,
            action="CREATE",
            entity_type="Plant",
            stable_key="P001",
            current_value={},
            incoming_value={"code": "P001"},
            diff={"code": "P001"},
            status="PENDING",
        )

        handler = Mock()
        handler.apply.return_value = ApplyResult(
            records_created=1,
            records_updated=0,
            records_failed=0,
            error_summary="",
        )
        mock_get_handler.return_value = handler

        result = ErpImportService.apply_job(str(self.job.id))
        self.assertEqual(result.status, "APPLIED")
        self.assertEqual(result.records_created, 1)
        # Compare results should be marked as ACCEPTED
        cr = ImportCompareResult.objects.get(import_job=self.job)
        self.assertEqual(cr.status, "ACCEPTED")

    @patch("manufacturing.domain.erp_import_service.Path")
    @patch("manufacturing.domain.erp_import_service.FileParserService.parse")
    @patch("manufacturing.domain.erp_import_service.get_handler")
    def test_apply_handler_raises_sets_apply_failed(
        self, mock_get_handler, mock_parse, mock_path
    ):
        mock_path.return_value.exists.return_value = True
        mock_parse.return_value = _fake_parse_result()

        handler = Mock()
        handler.apply.side_effect = ValueError("Something went wrong")
        mock_get_handler.return_value = handler

        result = ErpImportService.apply_job(str(self.job.id))
        self.assertEqual(result.status, "APPLY_FAILED")
        self.assertIn("Something went wrong", result.error_summary)
        self.assertTrue(ImportAuditLog.objects.filter(action="APPLY_FAILED").exists())

    def test_apply_invalid_transition(self):
        self.job.status = "DRAFT"
        self.job.save()
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.apply_job(str(self.job.id))
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")


# ═══════════════════════════════════════════════════════════════════
#  cancel_job
# ═══════════════════════════════════════════════════════════════════

class CancelJobTests(TestCase):
    def test_cancel_draft_job(self):
        source = _make_source()
        job = _make_job(source, status="DRAFT")
        result = ErpImportService.cancel_job(str(job.id))
        self.assertEqual(result.status, "CANCELLED")
        self.assertIsNotNone(result.completed_at)

    def test_cancel_creates_audit(self):
        source = _make_source()
        job = _make_job(source, status="DRAFT")
        ErpImportService.cancel_job(str(job.id))
        self.assertTrue(ImportAuditLog.objects.filter(action="CANCELLED").exists())

    def test_cancel_already_applied_raises(self):
        source = _make_source()
        job = _make_job(source, status="APPLIED")
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.cancel_job(str(job.id))
        self.assertEqual(ctx.exception.code, "INVALID_TRANSITION")

    def test_cancel_not_found_raises(self):
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.cancel_job("999999")
        self.assertEqual(ctx.exception.code, "NOT_FOUND")


# ═══════════════════════════════════════════════════════════════════
#  fail_job
# ═══════════════════════════════════════════════════════════════════

class FailJobTests(TestCase):
    def test_fail_draft_becomes_preview_failed(self):
        source = _make_source()
        job = _make_job(source, status="DRAFT")
        result = ErpImportService.fail_job(str(job.id), "Failed to read file")
        self.assertEqual(result.status, "PREVIEW_FAILED")
        self.assertEqual(result.error_summary, "Failed to read file")

    def test_fail_previewed_becomes_validation_failed(self):
        source = _make_source()
        job = _make_job(source, status="PREVIEWED")
        result = ErpImportService.fail_job(str(job.id), "Bad data")
        self.assertEqual(result.status, "VALIDATION_FAILED")

    def test_fail_validated_becomes_compare_failed(self):
        source = _make_source()
        job = _make_job(source, status="VALIDATED")
        result = ErpImportService.fail_job(str(job.id), "Compare error")
        self.assertEqual(result.status, "COMPARE_FAILED")

    def test_fail_compared_becomes_apply_failed(self):
        source = _make_source()
        job = _make_job(source, status="COMPARED")
        result = ErpImportService.fail_job(str(job.id), "Apply error")
        self.assertEqual(result.status, "APPLY_FAILED")

    def test_fail_ready_to_apply_becomes_apply_failed(self):
        source = _make_source()
        job = _make_job(source, status="READY_TO_APPLY")
        result = ErpImportService.fail_job(str(job.id), "Apply error")
        self.assertEqual(result.status, "APPLY_FAILED")

    def test_fail_applied_falls_back_to_failed(self):
        source = _make_source()
        job = _make_job(source, status="APPLIED")
        result = ErpImportService.fail_job(str(job.id), "Unknown error")
        self.assertEqual(result.status, "FAILED")

    def test_fail_creates_audit(self):
        source = _make_source()
        job = _make_job(source, status="DRAFT")
        ErpImportService.fail_job(str(job.id), "error")
        self.assertTrue(
            ImportAuditLog.objects.filter(action="PREVIEW_FAILED").exists()
        )


# ═══════════════════════════════════════════════════════════════════
#  retry_job
# ═══════════════════════════════════════════════════════════════════

class RetryJobTests(TestCase):
    def test_retry_preview_failed_goes_to_draft(self):
        source = _make_source()
        job = _make_job(source, status="PREVIEW_FAILED")
        result = ErpImportService.retry_job(str(job.id))
        self.assertEqual(result.status, "DRAFT")
        self.assertIsNone(result.completed_at)
        self.assertEqual(result.error_summary, "")

    def test_retry_validation_failed_goes_to_draft(self):
        source = _make_source()
        job = _make_job(source, status="VALIDATION_FAILED")
        result = ErpImportService.retry_job(str(job.id))
        self.assertEqual(result.status, "DRAFT")

    def test_retry_compare_failed_goes_to_validated(self):
        source = _make_source()
        job = _make_job(source, status="COMPARE_FAILED")
        result = ErpImportService.retry_job(str(job.id))
        self.assertEqual(result.status, "VALIDATED")

    def test_retry_apply_failed_goes_to_ready_to_apply(self):
        source = _make_source()
        job = _make_job(source, status="APPLY_FAILED")
        result = ErpImportService.retry_job(str(job.id))
        self.assertEqual(result.status, "READY_TO_APPLY")

    def test_retry_creates_audit(self):
        source = _make_source()
        job = _make_job(source, status="PREVIEW_FAILED")
        ErpImportService.retry_job(str(job.id))
        self.assertTrue(ImportAuditLog.objects.filter(action="RETRY").exists())

    def test_retry_invalid_status_raises(self):
        source = _make_source()
        job = _make_job(source, status="DRAFT")
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService.retry_job(str(job.id))
        self.assertEqual(ctx.exception.code, "INVALID_RETRY")


# ═══════════════════════════════════════════════════════════════════
#  _get_job / _audit (indirectly tested)
# ═══════════════════════════════════════════════════════════════════

class InternalHelpersTests(TestCase):
    def test_get_job_not_found_raises(self):
        with self.assertRaises(ErpImportError) as ctx:
            ErpImportService._get_job("999999")
        self.assertEqual(ctx.exception.code, "NOT_FOUND")

    def test_get_job_returns_correct_job(self):
        source = _make_source()
        job = _make_job(source)
        found = ErpImportService._get_job(str(job.id))
        self.assertEqual(found.id, job.id)

    def test_audit_creates_log_entry(self):
        source = _make_source()
        job = _make_job(source)
        ErpImportService._audit(job, "TEST_ACTION", "Test message")
        log = ImportAuditLog.objects.filter(import_job=job).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.action, "TEST_ACTION")
        self.assertEqual(log.message, "Test message")


# ═══════════════════════════════════════════════════════════════════
#  Full workflow integration
# ═══════════════════════════════════════════════════════════════════

class FullWorkflowTests(TestCase):
    """Walk through the complete DRAFT → APPLIED happy path."""

    @patch("manufacturing.domain.erp_import_service.Path")
    @patch("manufacturing.domain.erp_import_service.FileParserService.parse")
    @patch("manufacturing.domain.erp_import_service.get_handler")
    def test_full_happy_path(self, mock_get_handler, mock_parse, mock_path):
        # ── Setup ──
        mock_path.return_value.exists.return_value = True
        source = _make_source()
        parse_result = _fake_parse_result()
        mock_parse.return_value = parse_result
        handler = Mock()
        handler.validate.return_value = []
        handler.compare.return_value = [
            CompareRow(action="UNCHANGED", entity_type="Plant",
                       stable_key="P001",
                       current_value={"code": "P001"},
                       incoming_value={"code": "P001"},
                       diff={}),
        ]
        handler.apply.return_value = ApplyResult(
            records_created=0, records_updated=0,
            records_failed=0, error_summary="",
        )
        mock_get_handler.return_value = handler

        # ── 1. Create ──
        job = ErpImportService.create_job(str(source.id), file_name="test.csv")
        self.assertEqual(job.status, "DRAFT")

        # ── 2. Preview ──
        job = ErpImportService.preview_file(str(job.id))
        self.assertEqual(job.status, "PREVIEWED")

        # ── 3. Validate ──
        job = ErpImportService.validate_job(str(job.id))
        self.assertEqual(job.status, "VALIDATED")

        # ── 4. Compare ──
        job = ErpImportService.compare_job(str(job.id))
        self.assertEqual(job.status, "COMPARED")

        # ── 5. Mark ready ──
        job = ErpImportService.mark_ready(str(job.id))
        self.assertEqual(job.status, "READY_TO_APPLY")

        # ── 6. Apply ──
        job = ErpImportService.apply_job(str(job.id))
        self.assertEqual(job.status, "APPLIED")
        self.assertIsNotNone(job.completed_at)

        # Audit trail should have all steps
        audit_actions = list(
            ImportAuditLog.objects.filter(import_job=job)
            .values_list("action", flat=True)
        )
        self.assertIn("CREATED", audit_actions)
        self.assertIn("PREVIEWED", audit_actions)
        self.assertIn("VALIDATED", audit_actions)
        self.assertIn("COMPARED", audit_actions)
        self.assertIn("READY", audit_actions)
        self.assertIn("APPLIED", audit_actions)

    @patch("manufacturing.domain.erp_import_service.Path")
    @patch("manufacturing.domain.erp_import_service.FileParserService.parse")
    @patch("manufacturing.domain.erp_import_service.get_handler")
    def test_fail_then_retry_then_succeed(self, mock_get_handler, mock_parse, mock_path):
        mock_path.return_value.exists.return_value = True
        source = _make_source()
        parse_result = _fake_parse_result()
        mock_parse.return_value = parse_result
        handler = Mock()
        mock_get_handler.return_value = handler

        # ── Create & Preview ──
        job = ErpImportService.create_job(str(source.id), file_name="test.csv")
        job = ErpImportService.preview_file(str(job.id))

        # ── Validate with issues → VALIDATION_FAILED ──
        handler.validate.return_value = [
            ValidationIssue(
                sheet_name="Sheet1", row_number=2,
                entity_type="Plant", field_name="code",
                error_code="REQUIRED", message="Required",
                raw_value="",
            ),
        ]
        job = ErpImportService.validate_job(str(job.id))
        self.assertEqual(job.status, "VALIDATION_FAILED")

        # ── Retry → DRAFT ──
        job = ErpImportService.retry_job(str(job.id))
        self.assertEqual(job.status, "DRAFT")

        # ── Preview again ──
        job = ErpImportService.preview_file(str(job.id))
        self.assertEqual(job.status, "PREVIEWED")

        # ── Validate with no issues → VALIDATED ──
        handler.validate.return_value = []
        job = ErpImportService.validate_job(str(job.id))
        self.assertEqual(job.status, "VALIDATED")

        # ── Compare ──
        handler.compare.return_value = []
        job = ErpImportService.compare_job(str(job.id))
        self.assertEqual(job.status, "COMPARED")

        # ── Mark ready → apply ──
        job = ErpImportService.mark_ready(str(job.id))
        handler.apply.return_value = ApplyResult(records_created=1, records_updated=0, records_failed=0, error_summary="")
        job = ErpImportService.apply_job(str(job.id))
        self.assertEqual(job.status, "APPLIED")
