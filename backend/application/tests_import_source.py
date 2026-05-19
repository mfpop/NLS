from unittest.mock import patch

from django.test import TestCase, override_settings

from api.mutations.application import ApplicationSettingsMutation
from api.queries.application import ApplicationSettingsQuery
from api.types.application import ImportSourceConfigInput, ImportSourceConfigUpdateInput
from application.import_source_service import ImportSourceConfigError, ImportSourceConfigService
from application.models import ImportSourceConfig


class ImportSourceConfigServiceTests(TestCase):
    def test_create_config_saves_erp_excel_path(self):
        config = ImportSourceConfigService.create_config({
            "name": "Plant export",
            "source_type": ImportSourceConfig.SourceType.EXCEL,
            "domain": ImportSourceConfig.Domain.PLANT_STRUCTURE,
            "path": r"D:\imports\erp\plants",
            "file_pattern": "plants_*.xlsx",
        })
        self.assertEqual(config.path, r"D:\imports\erp\plants")
        self.assertEqual(config.source_type, ImportSourceConfig.SourceType.EXCEL)

    def test_path_is_required(self):
        with self.assertRaises(ImportSourceConfigError) as ctx:
            ImportSourceConfigService.create_config({
                "name": "Missing path",
                "source_type": ImportSourceConfig.SourceType.CSV,
                "domain": ImportSourceConfig.Domain.MATERIALS,
                "path": "   ",
                "file_pattern": "*.csv",
            })
        self.assertEqual(ctx.exception.field, "path")

    def test_file_pattern_is_required(self):
        with self.assertRaises(ImportSourceConfigError):
            ImportSourceConfigService.create_config({
                "name": "No pattern",
                "source_type": ImportSourceConfig.SourceType.CSV,
                "domain": ImportSourceConfig.Domain.BOM,
                "path": "/data/bom",
                "file_pattern": "",
            })

    def test_domain_is_required(self):
        with self.assertRaises(ImportSourceConfigError):
            ImportSourceConfigService.create_config({
                "name": "No domain",
                "source_type": ImportSourceConfig.SourceType.ERP_EXPORT,
                "domain": "",
                "path": "/data/schedules",
                "file_pattern": "*.xml",
            })

    def test_disabled_source_not_used_by_import_job(self):
        active = ImportSourceConfigService.create_config({
            "name": "Active",
            "source_type": ImportSourceConfig.SourceType.CSV,
            "domain": ImportSourceConfig.Domain.INVENTORY,
            "path": "/data/inventory",
            "file_pattern": "*.csv",
            "is_active": True,
        })
        disabled = ImportSourceConfigService.create_config({
            "name": "Disabled",
            "source_type": ImportSourceConfig.SourceType.CSV,
            "domain": ImportSourceConfig.Domain.INVENTORY,
            "path": "/data/inventory/old",
            "file_pattern": "*.csv",
            "is_active": False,
        })
        job_sources = ImportSourceConfigService.list_active_configs(ImportSourceConfig.Domain.INVENTORY)
        ids = {item.id for item in job_sources}
        self.assertIn(active.id, ids)
        self.assertNotIn(disabled.id, ids)

    @override_settings(IMPORT_SOURCE_VALIDATE_PATHS=False)
        def test_path_validation_can_be_skipped(self):
        config = ImportSourceConfigService.create_config({
            "name": "Remote",
            "source_type": ImportSourceConfig.SourceType.EXCEL,
            "domain": ImportSourceConfig.Domain.ROUTING,
            "path": "/mnt/erp/routing",
            "file_pattern": "*.xlsx",
        })
        result = ImportSourceConfigService.test_path_access(config.id)
        self.assertTrue(result.ok)
        self.assertIsNone(result.exists)

    def test_create_duplicate_by_name_is_rejected(self):
        ImportSourceConfigService.create_config({
            "name": "DupName",
            "source_type": ImportSourceConfig.SourceType.CSV,
            "domain": ImportSourceConfig.Domain.MATERIALS,
            "path": "/data/mat",
            "file_pattern": "*.csv",
            "is_active": True,
        })
        with self.assertRaises(ImportSourceConfigError) as ctx:
            ImportSourceConfigService.create_config({
                "name": "DupName",
                "source_type": ImportSourceConfig.SourceType.CSV,
                "domain": ImportSourceConfig.Domain.MATERIALS,
                "path": "/data/mat/other",
                "file_pattern": "*.csv",
                "is_active": True,
            })
        self.assertEqual(ctx.exception.code, "DUPLICATE")

    def test_create_duplicate_by_fields_is_rejected(self):
        ImportSourceConfigService.create_config({
            "name": "A",
            "source_type": ImportSourceConfig.SourceType.EXCEL,
            "domain": ImportSourceConfig.Domain.BOM,
            "path": "/data/bom",
            "file_pattern": "bom_*.xlsx",
            "is_active": True,
        })
        with self.assertRaises(ImportSourceConfigError) as ctx:
            ImportSourceConfigService.create_config({
                "name": "B",
                "source_type": ImportSourceConfig.SourceType.EXCEL,
                "domain": ImportSourceConfig.Domain.BOM,
                "path": "/data/bom",
                "file_pattern": "bom_*.xlsx",
                "is_active": True,
            })
        self.assertEqual(ctx.exception.code, "DUPLICATE")

        def test_update_allows_updating_same_record(self):
        cfg = ImportSourceConfigService.create_config({
            "name": "Original",
            "source_type": ImportSourceConfig.SourceType.CSV,
            "domain": ImportSourceConfig.Domain.INVENTORY,
            "path": "/data/inv",
            "file_pattern": "*.csv",
            "is_active": True,
        })
        # Updating same record's name to same value should be allowed
        updated = ImportSourceConfigService.update_config(cfg.id, {"name": "Original"})
        self.assertEqual(updated.id, cfg.id)

    def test_management_command_archives_duplicates_preferring_referenced(self):
        # Create two duplicate active sources, create a job referencing the older one; command should keep referenced
        a = ImportSourceConfigService.create_config({
            "name": "DupManage",
            "source_type": ImportSourceConfig.SourceType.CSV,
            "domain": ImportSourceConfig.Domain.MATERIALS,
            "path": "/data/mats",
            "file_pattern": "*.csv",
            "is_active": True,
        })
        b = ImportSourceConfigService.create_config({
            "name": "DupManage",
            "source_type": ImportSourceConfig.SourceType.CSV,
            "domain": ImportSourceConfig.Domain.MATERIALS,
            "path": "/data/mats/other",
            "file_pattern": "*.csv",
            "is_active": True,
        })
        # Create an import job referencing 'a'
        from manufacturing.domain.import_job_service import ImportJobService
        job = ImportJobService.trigger(a.id, triggered_by="tester")

        # Run management command
        from django.core.management import call_command
        call_command("archive_duplicate_import_sources")

        a.refresh_from_db()
        b.refresh_from_db()
        # a should remain active (referenced), b should be archived
        self.assertTrue(a.is_active and not a.is_archived)
        self.assertFalse(b.is_active)
        self.assertTrue(b.is_archived)




class ImportSourceGraphQLTests(TestCase):
    def setUp(self):
        self.config = ImportSourceConfigService.create_config({
            "name": "GraphQL source",
            "source_type": ImportSourceConfig.SourceType.EXCEL,
            "domain": ImportSourceConfig.Domain.MATERIALS,
            "path": "/imports/materials",
            "file_pattern": "mat_*.xlsx",
        })

    def test_graphql_list_uses_service(self):
        with patch.object(ImportSourceConfigService, "list_configs", wraps=ImportSourceConfigService.list_configs) as mocked:
            query = ApplicationSettingsQuery()
            nodes = query.import_source_configs(domain=ImportSourceConfig.Domain.MATERIALS, is_active=True)
            mocked.assert_called_once()
        self.assertEqual(len(nodes), 1)
        self.assertEqual(nodes[0].name, "GraphQL source")

    def test_graphql_create_calls_service_only(self):
        mutation = ApplicationSettingsMutation()
        payload_input = ImportSourceConfigInput(
            name="New",
            source_type="CSV",
            domain="BOM",
            path="/imports/bom",
            file_pattern="bom_*.csv",
            archive_path=None,
            error_path=None,
            is_active=True,
        )
        with patch.object(ImportSourceConfigService, "create_config", wraps=ImportSourceConfigService.create_config) as mocked:
            result = mutation.create_import_source_config(input=payload_input)
            mocked.assert_called_once()
        self.assertTrue(result.ok)

    def test_update_application_settings_does_not_trigger_import(self):
        mutation = ApplicationSettingsMutation()
        with patch.object(ImportSourceConfigService, "create_config") as create_mock:
            with patch.object(ImportSourceConfigService, "list_active_configs") as list_mock:
                mutation.update_application_settings(settings=[])
                create_mock.assert_not_called()
                list_mock.assert_not_called()

    def test_archive_mutation_delegates_to_service(self):
        mutation = ApplicationSettingsMutation()
        with patch.object(ImportSourceConfigService, "archive_config", wraps=ImportSourceConfigService.archive_config) as mocked:
            result = mutation.archive_import_source_config(id=str(self.config.id))
            mocked.assert_called_once_with(self.config.id)
        self.assertTrue(result.ok)
        self.assertTrue(result.config.is_archived)

    def test_schema_exposes_import_source_fields(self):
        from api.schema import schema

        schema_str = str(schema)
        self.assertIn("importSourceConfigs", schema_str)
        self.assertIn("testImportSourcePath", schema_str)
        self.assertIn("createImportSourceConfig", schema_str)
        self.assertIn("updateImportSourceConfig", schema_str)
        self.assertIn("archiveImportSourceConfig", schema_str)
