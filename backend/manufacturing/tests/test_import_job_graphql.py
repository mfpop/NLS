from django.test import TestCase
from django.utils import timezone
from unittest.mock import Mock, patch

from application.models import ImportSourceConfig
from manufacturing.domain.import_job_service import ImportJobDuplicateError, ImportJobService
from manufacturing.domain.erp_import_service import ErpImportError
from manufacturing.models import ImportJob


def _make_mock_info(role: str = "db_admin", is_authenticated: bool = True):
    user = Mock()
    user.is_authenticated = is_authenticated
    user.role_profile.role = role
    info = Mock()
    info.context.user = user
    return info


class GraphQLImportJobDuplicateTests(TestCase):

    def setUp(self):
        self.config = ImportSourceConfig.objects.create(
            name="Test Source",
            domain=ImportSourceConfig.Domain.ROUTING,
            source_type=ImportSourceConfig.SourceType.CSV,
            path="/imports",
            file_pattern="*.csv",
        )
        self.job = ImportJob.objects.create(
            source_config=self.config,
            status=ImportJob.Status.DRAFT,
            started_at=timezone.now(),
        )

    def test_graphql_duplicate_import_job_returns_structured_error(self):
        from api.mutations.integration import IntegrationMutation

        duplicate = ImportJob.objects.create(
            source_config=self.config,
            status=ImportJob.Status.FILE_ATTACHED,
            started_at=timezone.now(),
            file_name="routing.csv",
            file_hash="abc123",
        )

        with patch.object(ImportJobService, "create_draft_job") as mock:
            mock.side_effect = ImportJobDuplicateError(str(duplicate.id), "routing.csv", str(self.config.id))
            mutation = IntegrationMutation()
            result = mutation.create_import_job(_make_mock_info(), source_id=str(self.config.id), file_name="routing.csv")

        self.assertFalse(result.ok)
        self.assertEqual(result.error_code, "DUPLICATE_ACTIVE_IMPORT_JOB")
        self.assertEqual(str(result.existing_job_id), str(duplicate.id))
        self.assertEqual(result.message, "Import job already exists for this file/source.")
        self.assertIsNotNone(result.job)

    def test_graphql_attach_file_duplicate_returns_structured_error(self):
        from api.mutations.integration import IntegrationMutation
        from api.types.integration import AttachFileInput

        duplicate = ImportJob.objects.create(
            source_config=self.config,
            status=ImportJob.Status.FILE_ATTACHED,
            started_at=timezone.now(),
            file_name="routing.csv",
            file_hash="abc123",
        )

        with patch.object(ImportJobService, "attach_file") as mock:
            mock.side_effect = ImportJobDuplicateError(str(duplicate.id), "routing.csv", str(self.config.id))
            mutation = IntegrationMutation()
            result = mutation.attach_import_file(
                _make_mock_info(),
                job_id=str(self.job.id),
                input=AttachFileInput(file_name="routing.csv", file_path="/imports/routing.csv"),
            )

        self.assertFalse(result.ok)
        self.assertEqual(result.error_code, "DUPLICATE_ACTIVE_IMPORT_JOB")
        self.assertEqual(str(result.existing_job_id), str(duplicate.id))
        self.assertIsNotNone(result.job)

    def test_graphql_preview_returns_structured_error_message(self):
        from api.mutations.integration import IntegrationMutation

        with patch("manufacturing.domain.erp_import_service.ErpImportService.preview_file") as mock_preview:
            mock_preview.side_effect = ErpImportError("filePath", "FILE_NOT_FOUND", "File not found: /missing.xlsx")
            mutation = IntegrationMutation()
            result = mutation.transition_import_job(_make_mock_info(), action="PREVIEW", job_id=str(self.job.id))

        self.assertFalse(result.ok)
        self.assertEqual(result.errors[0].code, "FILE_NOT_FOUND")
        self.assertIn("File not found", result.errors[0].message)
