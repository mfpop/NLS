from django.test import TestCase
from django.db import IntegrityError

from application.models import ImportSourceConfig
from manufacturing.models import (
    ImportJob, ImportValidationError, MappingRule,
)


class Input:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __getattr__(self, name):
        return None


class ImportSourceConfigModelTests(TestCase):

    def test_creates_source_config(self):
        config = ImportSourceConfig.objects.create(
            name="ERP Plant Import",
            domain=ImportSourceConfig.Domain.PLANT_STRUCTURE,
            source_type=ImportSourceConfig.SourceType.EXCEL,
            path="/imports/plants.xlsx",
            file_pattern="plants_*.xlsx",
        )
        self.assertEqual(config.name, "ERP Plant Import")
        self.assertEqual(config.domain, "PLANT_STRUCTURE")
        self.assertTrue(config.is_active)

    def test_disabled_source_cannot_run_import(self):
        config = ImportSourceConfig.objects.create(
            name="Disabled Source",
            domain=ImportSourceConfig.Domain.MATERIALS,
            source_type=ImportSourceConfig.SourceType.CSV,
            path="/imports/materials.csv",
            is_active=False,
        )
        from manufacturing.domain.import_job_service import ImportJobService, ImportJobError
        with self.assertRaises(ImportJobError) as ctx:
            ImportJobService.trigger(str(config.id))
        self.assertIn("disabled", str(ctx.exception.message).lower())

    def test_source_config_default_is_active(self):
        config = ImportSourceConfig.objects.create(
            name="Test Source", domain=ImportSourceConfig.Domain.BOM,
            source_type=ImportSourceConfig.SourceType.CSV, path="/imports/bom.csv",
        )
        self.assertTrue(config.is_active)


class ImportJobModelTests(TestCase):

    def setUp(self):
        self.config = ImportSourceConfig.objects.create(
            name="Test Source", domain=ImportSourceConfig.Domain.ROUTING,
            source_type=ImportSourceConfig.SourceType.EXCEL, path="/imports/routing.xlsx",
        )

    def test_import_job_persists_immutable_history(self):
        job = ImportJob.objects.create(
            source_config=self.config,
            file_name="routing_2024.xlsx",
            file_path="/imports/routing_2024.xlsx",
            started_at="2024-01-01 00:00:00",
            status=ImportJob.Status.COMPLETED,
            records_processed=100,
            records_created=80,
            records_updated=15,
            records_failed=5,
            error_summary="5 rows failed validation",
            triggered_by="system",
        )
        self.assertEqual(job.status, "COMPLETED")
        self.assertEqual(job.records_processed, 100)
        self.assertEqual(job.records_failed, 5)

    def test_import_job_default_status(self):
        job = ImportJob.objects.create(
            source_config=self.config,
            file_name="inv.csv",
            file_path="/imports/inv.csv",
            started_at="2024-01-01 00:00:00",
        )
        self.assertEqual(job.status, "PENDING")


class ImportValidationErrorModelTests(TestCase):

    def setUp(self):
        self.config = ImportSourceConfig.objects.create(
            name="Test Source", domain=ImportSourceConfig.Domain.MATERIALS,
            source_type=ImportSourceConfig.SourceType.CSV, path="/imports/mat.csv",
        )
        self.job = ImportJob.objects.create(
            source_config=self.config,
            file_name="mat.csv",  file_path="/imports/mat.csv",
            started_at="2024-01-01 00:00:00", status=ImportJob.Status.FAILED,
        )

    def test_validation_errors_persist_correctly(self):
        err = ImportValidationError.objects.create(
            import_job=self.job,
            sheet_name="Materials",
            row_number=15,
            entity_type="Material",
            field_name="code",
            error_code="REQUIRED",
            message="Code is required",
            raw_value="",
        )
        self.assertEqual(err.entity_type, "Material")
        self.assertEqual(err.error_code, "REQUIRED")
        self.assertEqual(err.row_number, 15)


class MappingRuleModelTests(TestCase):

    def test_mapping_rule_validation(self):
        rule = MappingRule.objects.create(
            domain=ImportSourceConfig.Domain.PLANT_STRUCTURE,
            source_field="PlantCode",
            destination_field="code",
            is_required=True,
        )
        self.assertEqual(rule.source_field, "PlantCode")
        self.assertEqual(rule.destination_field, "code")
        self.assertTrue(rule.is_required)
        self.assertTrue(rule.is_active)


class GraphQLMutationDelegationTests(TestCase):

    def test_create_source_config_calls_service(self):
        from unittest.mock import patch
        from api.mutations.integration import IntegrationMutation
        with patch.object(ImportSourceConfigService, "create") as mock:
            mock.return_value = None
            mutation = IntegrationMutation()
            try:
                mutation.create_import_source_config(Input(name="Test"))
            except AttributeError:
                pass
            mock.assert_called_once()

    def test_archive_source_config_calls_service(self):
        from unittest.mock import patch
        from api.mutations.integration import IntegrationMutation
        from manufacturing.domain.import_source_config_service import ImportSourceConfigService
        with patch.object(ImportSourceConfigService, "archive") as mock:
            mock.return_value = None
            mutation = IntegrationMutation()
            try:
                mutation.archive_import_source_config("some-id")
            except AttributeError:
                pass
            mock.assert_called_once_with("some-id")

    def test_trigger_import_job_rejects_disabled_source(self):
        from api.mutations.integration import IntegrationMutation
        config = ImportSourceConfig.objects.create(
            name="Disabled", domain=ImportSourceConfig.Domain.BOM,
            source_type=ImportSourceConfig.SourceType.CSV, path="/imports/bom.csv",
            is_active=False,
        )
        mutation = IntegrationMutation()
        result = mutation.trigger_import_job(source_id=str(config.id))
        self.assertFalse(result.ok)

    def test_trigger_import_job_no_orm_save_directly(self):
        from unittest.mock import patch
        from api.mutations.integration import IntegrationMutation
        from manufacturing.domain.import_job_service import ImportJobService
        with patch("manufacturing.models.ImportJob.save") as mock_save:
            with patch.object(ImportJobService, "trigger") as mock_service:
                mock_service.side_effect = ImportJobError("sourceId", "NOT_FOUND", "not found")
                mutation = IntegrationMutation()
                mutation.trigger_import_job(source_id="nonexistent")
                mock_save.assert_not_called()

    def test_mapping_rule_validation(self):
        from api.mutations.integration import IntegrationMutation
        mutation = IntegrationMutation()
        result = mutation.create_mapping_rule(
            Input(source_field="", destination_field="")
        )
        self.assertFalse(result.ok)

    def test_test_import_source_path_returns_status(self):
        from unittest.mock import patch
        from api.mutations.integration import IntegrationMutation
        from manufacturing.domain.import_source_config_service import ImportSourceConfigService
        with patch.object(ImportSourceConfigService, "test_path") as mock:
            mock.return_value = {
                "sourceId": "test-id", "path": "/test", "exists": True,
                "isDirectory": False, "isReadable": True,
            }
            mutation = IntegrationMutation()
            result = mutation.test_import_source_path(id="test-id")
            self.assertTrue(result.exists)
            self.assertFalse(result.is_directory)
            self.assertTrue(result.is_readable)


# Import needed at module level for tests
from manufacturing.domain.import_source_config_service import ImportSourceConfigService
from manufacturing.domain.import_job_service import ImportJobService, ImportJobError
