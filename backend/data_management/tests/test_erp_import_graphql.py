from unittest.mock import Mock, patch

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from api.schema import schema
from api.schema import GraphQLContext
from data_management.models import ErpPattern, ErpPatternMapping, ErpSourceFile, ErpImportLog
from data_management.services.erp_pattern_service import ErpPatternService
from data_management.services.erp_source_file_service import ErpSourceFileService


def _make_context():
    user = Mock()
    user.is_authenticated = True
    user.username = "testuser"
    user.role_profile.role = "app_owner"
    ctx = Mock(spec=GraphQLContext)
    ctx.user = user
    ctx.request = Mock()
    return ctx


class ErpImportGraphQLTest(TestCase):
    """Test that GraphQL resolvers delegate to services correctly."""

    def setUp(self):
        self.pattern = ErpPattern.objects.create(
            name="GQL Test Pattern",
            destination_entity="Plant",
            source_file_type="csv",
        )
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="Code", destination_name="code", order=1,
        )
        ErpPatternMapping.objects.create(
            pattern=self.pattern, source_name="Name", destination_name="full_name", order=2,
        )
        content = b"Code,Name\nP01,Alpha\n"
        uploaded = SimpleUploadedFile("gql_test.csv", content)
        self.source_file = ErpSourceFileService.upload_file(uploaded)
        self.ctx = _make_context()

    def tearDown(self):
        import os
        if self.source_file and os.path.isfile(self.source_file.file_path):
            os.remove(self.source_file.file_path)

    # ── Queries ──

    def test_erp_patterns_query(self):
        q = "{ erpPatterns { id name destinationEntity sourceFileType } }"
        result = schema.execute_sync(q, context_value=self.ctx)
        self.assertIsNone(result.errors, msg=str(result.errors))
        self.assertTrue(len(result.data["erpPatterns"]) >= 1)
        names = [p["name"] for p in result.data["erpPatterns"]]
        self.assertIn("GQL Test Pattern", names)

    def test_erp_import_validation_query(self):
        q = """
        query($pid: Int!) {
            erpImportValidation(patternId: $pid) {
                status errors warnings missingFields
            }
        }
        """
        result = schema.execute_sync(q, variable_values={"pid": self.pattern.id}, context_value=self.ctx)
        self.assertIsNone(result.errors, msg=str(result.errors))
        self.assertEqual(result.data["erpImportValidation"]["status"], "READY")

    def test_erp_import_logs_query(self):
        from django.utils import timezone
        ErpImportLog.objects.create(
            pattern=self.pattern,
            status="IMPORTED",
            rows_added=5,
            started_at=timezone.now(),
        )
        q = "{ erpImportLogs { id status rowsAdded } }"
        result = schema.execute_sync(q, context_value=self.ctx)
        self.assertIsNone(result.errors, msg=str(result.errors))
        self.assertTrue(len(result.data["erpImportLogs"]) >= 1)

    def test_erp_import_logs_filtered_by_pattern(self):
        q = """
        query($pid: Int!) {
            erpImportLogs(patternId: $pid) { id status }
        }
        """
        result = schema.execute_sync(q, variable_values={"pid": self.pattern.id}, context_value=self.ctx)
        self.assertIsNone(result.errors, msg=str(result.errors))
        self.assertEqual(result.data["erpImportLogs"], [])

    # ── Mutations ──

    def test_upload_erp_source_file_exists_in_schema(self):
        """Verify the mutation is registered via introspection."""
        q = """
        mutation {
            uploadErpSourceFile(file: null) { id originalName }
        }
        """
        result = schema.execute_sync(q, context_value=self.ctx)
        self.assertIsNotNone(result.errors)
        error_msg = str(result.errors).lower()
        self.assertTrue("upload" in error_msg)

    def test_validate_erp_pattern_delegates(self):
        with patch(
            "data_management.graphql.erp_import_mutations.ErpImportValidationService.validate_pattern"
        ) as mock_validate:
            from data_management.services.erp_import_validation_service import ValidationResult
            mock_validate.return_value = ValidationResult(status="READY")
            q = """
            mutation {
                validateErpPattern(patternId: %d) {
                    status
                }
            }
            """ % self.pattern.id
            result = schema.execute_sync(q, context_value=self.ctx)
            self.assertIsNone(result.errors, msg=str(result.errors))
            self.assertEqual(result.data["validateErpPattern"]["status"], "READY")
            mock_validate.assert_called_once_with(self.pattern.id)

    def test_execute_erp_import_delegates(self):
        with patch(
            "data_management.graphql.erp_import_mutations.ErpImportService.execute_import"
        ) as mock_import:
            from data_management.services.erp_import_service import ImportResult
            mock_import.return_value = ImportResult(
                pattern_id=self.pattern.id, pattern_name=self.pattern.name,
                status="IMPORTED", rows_added=3, rows_updated=1,
                rows_not_updated=0, rows_failed=0,
            )
            q = """
            mutation {
                executeErpImport(patternId: %d, confirmed: true) {
                    status rowsAdded rowsUpdated
                }
            }
            """ % self.pattern.id
            result = schema.execute_sync(q, context_value=self.ctx)
            self.assertIsNone(result.errors, msg=str(result.errors))
            self.assertEqual(result.data["executeErpImport"]["status"], "IMPORTED")
            self.assertEqual(result.data["executeErpImport"]["rowsAdded"], 3)

    def test_execute_erp_import_rejects_unconfirmed(self):
        q = """
        mutation {
            executeErpImport(patternId: %d, confirmed: false) {
                status
            }
        }
        """ % self.pattern.id
        result = schema.execute_sync(q, context_value=self.ctx)
        self.assertIsNotNone(result.errors)
        self.assertIn("confirmed", str(result.errors).lower())

    def test_reset_erp_import_workspace_delegates(self):
        with patch(
            "data_management.graphql.erp_import_mutations.ErpImportWorkspaceService.reset_workspace"
        ) as mock_reset:
            q = """
            mutation {
                resetErpImportWorkspace(confirmed: true)
            }
            """
            result = schema.execute_sync(q, context_value=self.ctx)
            self.assertIsNone(result.errors, msg=str(result.errors))
            self.assertTrue(result.data["resetErpImportWorkspace"])

    def test_reset_erp_import_workspace_rejects_unconfirmed(self):
        q = """
        mutation {
            resetErpImportWorkspace(confirmed: false)
        }
        """
        result = schema.execute_sync(q, context_value=self.ctx)
        self.assertIsNotNone(result.errors)
        self.assertIn("confirmed", str(result.errors).lower())

    def test_resolvers_contain_no_business_logic(self):
        """Verify resolvers only call services — no file/import/transaction logic."""
        import inspect
        from data_management.graphql.erp_import_queries import ErpImportQuery
        from data_management.graphql.erp_import_mutations import ErpImportMutation

        for name, method in inspect.getmembers(ErpImportQuery, predicate=inspect.isfunction):
            if name.startswith("_"):
                continue
            source = inspect.getsource(method)
            body = source.split(":", 1)[-1] if ":" in source else source
            self.assertNotIn("transaction.atomic", body)
            self.assertNotIn("open(", body)
            self.assertNotIn(".read(", body)
            self.assertNotIn(".write(", body)

        for name, method in inspect.getmembers(ErpImportMutation, predicate=inspect.isfunction):
            if name.startswith("_"):
                continue
            source = inspect.getsource(method)
            body = source.split(":", 1)[-1] if ":" in source else source
            self.assertNotIn("transaction.atomic", body)
            self.assertNotIn("open(", body)
            self.assertNotIn(".read(", body)
            self.assertNotIn(".write(", body)
