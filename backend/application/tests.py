from unittest.mock import patch

from django.test import TestCase
from django.db import connection
from django.db.utils import OperationalError
from django.utils import timezone

from application.models import ApplicationSetting
from application.services import ApplicationSettingsError, ApplicationSettingsService
from api.queries.application import SystemHealth, ApplicationSettingsQuery


class ApplicationSettingsServiceTests(TestCase):
    def test_defaults_are_created_without_manufacturing_dependencies(self):
        settings = ApplicationSettingsService.list_settings()

        self.assertGreater(len(settings), 0)
        self.assertTrue(ApplicationSetting.objects.filter(key="appearance.theme_default").exists())
        self.assertFalse(any(setting.key.startswith("plant") for setting in settings))

    def test_theme_and_localization_settings_persist(self):
        ApplicationSettingsService.update_settings({
            "appearance.theme_default": "dark",
            "localization.language": "es-MX",
            "localization.timezone": "America/Mexico_City",
        })

        self.assertEqual(ApplicationSetting.objects.get(key="appearance.theme_default").value, "dark")
        self.assertEqual(ApplicationSetting.objects.get(key="localization.language").value, "es-MX")
        self.assertEqual(ApplicationSetting.objects.get(key="localization.timezone").value, "America/Mexico_City")

    def test_manufacturing_scope_keys_are_rejected(self):
        with self.assertRaises(ApplicationSettingsError):
            ApplicationSettingsService.update_settings({"plant.default": "forbidden"})

        with self.assertRaises(ApplicationSettingsError):
            ApplicationSettingsService.update_settings({"routing.default": "forbidden"})


class SystemHealthQueryTests(TestCase):
    """Tests for the systemHealth GraphQL query."""

    def test_system_health_query_returns_graphql_ok(self):
        query = ApplicationSettingsQuery()
        result = query.system_health()
        self.assertIsNotNone(result)
        self.assertEqual(result.graphql_status, "OK")

    def test_system_health_query_returns_database_ok(self):
        query = ApplicationSettingsQuery()
        result = query.system_health()
        self.assertEqual(result.database_status, "OK")

    def test_system_health_query_returns_server_time(self):
        query = ApplicationSettingsQuery()
        result = query.system_health()
        self.assertIsNotNone(result.server_time)

    def test_system_health_query_returns_version(self):
        query = ApplicationSettingsQuery()
        result = query.system_health()
        self.assertEqual(result.version, "1.0.0")

    def test_system_health_query_does_not_require_auth(self):
        query = ApplicationSettingsQuery()
        result = query.system_health()
        self.assertIsNotNone(result)
        self.assertEqual(result.graphql_status, "OK")

    def test_system_health_query_handles_db_error(self):
        with patch.object(connection, "ensure_connection", side_effect=OperationalError):
            query = ApplicationSettingsQuery()
            result = query.system_health()
            self.assertEqual(result.database_status, "ERROR")
            self.assertEqual(result.graphql_status, "OK")

    def test_application_settings_query_matches_schema(self):
        from api.schema import schema
        schema_str = str(schema)
        self.assertIn("systemHealth", schema_str)
        self.assertIn("graphqlStatus", schema_str)
        self.assertIn("databaseStatus", schema_str)
        self.assertIn("serverTime", schema_str)
        self.assertIn("version", schema_str)
