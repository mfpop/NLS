from unittest.mock import patch

from django.test import TestCase
from django.db import connection
from django.db.utils import OperationalError
from django.utils import timezone

from application.models import ApplicationSetting
from application.services import ApplicationSettingsError, ApplicationSettingsService
from application.settings_registry import SETTING_DEFINITIONS, is_allowed_setting_key
from api.queries.application import SystemHealth, ApplicationSettingsQuery
from api.schema import schema


class ApplicationSettingsGraphQLTests(TestCase):
    """Integration tests for numbering settings through the GraphQL layer."""

    NUMBERING_KEYS = {
        "numbering.document_prefix": {"default": "DOC-", "type": "STRING", "category": "numbering"},
        "numbering.task_prefix": {"default": "TASK-", "type": "STRING", "category": "numbering"},
        "numbering.mer_prefix": {"default": "MER-", "type": "STRING", "category": "numbering"},
        "numbering.audit_prefix": {"default": "AUD-", "type": "STRING", "category": "numbering"},
        "numbering.safety_prefix": {"default": "SAF-", "type": "STRING", "category": "numbering"},
        "numbering.sequence_reset": {"default": "never", "type": "STRING", "category": "numbering"},
    }

    QUERY_CATEGORY = """
        query NumberingSettings($category: String) {
            applicationSettings(category: $category) {
                key
                category
                valueType
                value
                description
                updatedAt
            }
        }
    """

    MUTATION_UPDATE = """
        mutation UpdateNumberingSettings($settings: [ApplicationSettingInput!]!) {
            updateApplicationSettings(settings: $settings) {
                ok
                settings {
                    key
                    category
                    valueType
                    value
                    description
                }
                errors {
                    field
                    code
                    message
                }
            }
        }
    """

    def test_query_all_numbering_settings_by_category(self):
        result = schema.execute_sync(
            self.QUERY_CATEGORY,
            variable_values={"category": "numbering"},
        )
        self.assertIsNone(result.errors, f"GraphQL errors: {result.errors}")
        self.assertIsNotNone(result.data)
        settings = result.data["applicationSettings"]
        self.assertEqual(len(settings), len(self.NUMBERING_KEYS))
        returned_keys = {s["key"] for s in settings}
        for key in self.NUMBERING_KEYS:
            self.assertIn(key, returned_keys, f"Missing key: {key}")

    def test_query_numbering_settings_have_correct_defaults(self):
        result = schema.execute_sync(
            self.QUERY_CATEGORY,
            variable_values={"category": "numbering"},
        )
        self.assertIsNone(result.errors)
        settings_by_key = {s["key"]: s for s in result.data["applicationSettings"]}
        for key, expected in self.NUMBERING_KEYS.items():
            setting = settings_by_key[key]
            self.assertEqual(setting["value"], expected["default"], f"Default value mismatch for {key}")
            self.assertEqual(setting["valueType"], expected["type"], f"Type mismatch for {key}")
            self.assertEqual(setting["category"], expected["category"], f"Category mismatch for {key}")

    def test_query_numbering_settings_have_descriptions(self):
        result = schema.execute_sync(
            self.QUERY_CATEGORY,
            variable_values={"category": "numbering"},
        )
        self.assertIsNone(result.errors)
        for s in result.data["applicationSettings"]:
            self.assertTrue(len(s["description"]) > 0, f"Empty description for {s['key']}")

    def test_mutation_updates_multiple_numbering_settings(self):
        result = schema.execute_sync(
            self.MUTATION_UPDATE,
            variable_values={
                "settings": [
                    {"key": "numbering.document_prefix", "value": "INV-"},
                    {"key": "numbering.task_prefix", "value": "WRK-"},
                    {"key": "numbering.mer_prefix", "value": "ENG-"},
                    {"key": "numbering.audit_prefix", "value": "CHK-"},
                    {"key": "numbering.safety_prefix", "value": "EHS-"},
                    {"key": "numbering.sequence_reset", "value": "yearly"},
                ],
            },
        )
        self.assertIsNone(result.errors, f"GraphQL errors: {result.errors}")
        self.assertTrue(result.data["updateApplicationSettings"]["ok"])
        self.assertEqual(len(result.data["updateApplicationSettings"]["errors"]), 0)
        # Verify via query
        query_result = schema.execute_sync(
            self.QUERY_CATEGORY,
            variable_values={"category": "numbering"},
        )
        updated_by_key = {s["key"]: s for s in query_result.data["applicationSettings"]}
        self.assertEqual(updated_by_key["numbering.document_prefix"]["value"], "INV-")
        self.assertEqual(updated_by_key["numbering.task_prefix"]["value"], "WRK-")
        self.assertEqual(updated_by_key["numbering.mer_prefix"]["value"], "ENG-")
        self.assertEqual(updated_by_key["numbering.audit_prefix"]["value"], "CHK-")
        self.assertEqual(updated_by_key["numbering.safety_prefix"]["value"], "EHS-")
        self.assertEqual(updated_by_key["numbering.sequence_reset"]["value"], "yearly")

    def test_mutation_updates_single_setting(self):
        result = schema.execute_sync(
            self.MUTATION_UPDATE,
            variable_values={"settings": [{"key": "numbering.document_prefix", "value": "ORD-"}]},
        )
        self.assertIsNone(result.errors)
        self.assertTrue(result.data["updateApplicationSettings"]["ok"])
        self.assertEqual(len(result.data["updateApplicationSettings"]["settings"]), 1)
        self.assertEqual(result.data["updateApplicationSettings"]["settings"][0]["value"], "ORD-")

    def test_mutation_single_update_does_not_affect_others(self):
        schema.execute_sync(
            self.MUTATION_UPDATE,
            variable_values={
                "settings": [
                    {"key": "numbering.document_prefix", "value": "DOC2-"},
                    {"key": "numbering.mer_prefix", "value": "MER2-"},
                ],
            },
        )
        query_result = schema.execute_sync(
            self.QUERY_CATEGORY,
            variable_values={"category": "numbering"},
        )
        updated_by_key = {s["key"]: s for s in query_result.data["applicationSettings"]}
        self.assertEqual(updated_by_key["numbering.document_prefix"]["value"], "DOC2-")
        self.assertEqual(updated_by_key["numbering.mer_prefix"]["value"], "MER2-")
        self.assertEqual(updated_by_key["numbering.task_prefix"]["value"], "TASK-", "Unrelated setting should retain default")

    def test_mutation_rejects_forbidden_setting_key(self):
        result = schema.execute_sync(
            self.MUTATION_UPDATE,
            variable_values={"settings": [{"key": "plant.default", "value": "forbidden"}]},
        )
        self.assertIsNone(result.errors)
        self.assertFalse(result.data["updateApplicationSettings"]["ok"])
        self.assertEqual(len(result.data["updateApplicationSettings"]["errors"]), 1)
        self.assertEqual(result.data["updateApplicationSettings"]["errors"][0]["code"], "invalid_scope")

    def test_mutation_returns_updated_settings_in_payload(self):
        result = schema.execute_sync(
            self.MUTATION_UPDATE,
            variable_values={"settings": [{"key": "numbering.safety_prefix", "value": "EHS-"}]},
        )
        self.assertIsNone(result.errors)
        payload = result.data["updateApplicationSettings"]
        self.assertTrue(payload["ok"])
        self.assertEqual(len(payload["settings"]), 1)
        returned = payload["settings"][0]
        self.assertEqual(returned["key"], "numbering.safety_prefix")
        self.assertEqual(returned["value"], "EHS-")
        self.assertEqual(returned["category"], "numbering")
        self.assertEqual(returned["valueType"], "STRING")

    def test_mutation_empty_settings_list_returns_ok(self):
        result = schema.execute_sync(
            self.MUTATION_UPDATE,
            variable_values={"settings": []},
        )
        self.assertIsNone(result.errors)
        self.assertTrue(result.data["updateApplicationSettings"]["ok"])
        self.assertEqual(len(result.data["updateApplicationSettings"]["settings"]), 0)

    def test_query_without_category_returns_all_settings(self):
        result = schema.execute_sync(
            """
            query AllSettings {
                applicationSettings {
                    key
                    category
                }
            }
            """,
        )
        self.assertIsNone(result.errors)
        self.assertGreater(len(result.data["applicationSettings"]), len(self.NUMBERING_KEYS))
        categories = {s["category"] for s in result.data["applicationSettings"]}
        self.assertIn("numbering", categories)
        self.assertIn("general", categories)
        self.assertIn("security", categories)


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
        result = query.app_system_health()
        self.assertIsNotNone(result)
        self.assertEqual(result.graphql_status, "OK")

    def test_system_health_query_returns_database_ok(self):
        query = ApplicationSettingsQuery()
        result = query.app_system_health()
        self.assertEqual(result.database_status, "OK")

    def test_system_health_query_returns_server_time(self):
        query = ApplicationSettingsQuery()
        result = query.app_system_health()
        self.assertIsNotNone(result.server_time)

    def test_system_health_query_returns_version(self):
        query = ApplicationSettingsQuery()
        result = query.app_system_health()
        self.assertEqual(result.version, "1.0.0")

    def test_system_health_query_does_not_require_auth(self):
        query = ApplicationSettingsQuery()
        result = query.app_system_health()
        self.assertIsNotNone(result)
        self.assertEqual(result.graphql_status, "OK")

    def test_system_health_query_handles_db_error(self):
        with patch.object(connection, "ensure_connection", side_effect=OperationalError):
            query = ApplicationSettingsQuery()
            result = query.app_system_health()
            self.assertEqual(result.database_status, "ERROR")
            self.assertEqual(result.graphql_status, "OK")

    def test_application_settings_query_matches_schema(self):
        from api.schema import schema
        result = schema.execute_sync("""
            query { appSystemHealth { graphqlStatus databaseStatus serverTime version } }
        """)
        self.assertIsNone(result.errors, f"GraphQL errors: {result.errors}")
        self.assertIsNotNone(result.data)
        health = result.data["appSystemHealth"]
        self.assertEqual(health["graphqlStatus"], "OK")
        self.assertEqual(health["databaseStatus"], "OK")
        self.assertIsNotNone(health["serverTime"])
        self.assertEqual(health["version"], "1.0.0")


class NumberingSettingsDefinitionTests(TestCase):
    """Tests for the numbering SettingDefinition entries in settings_registry.py."""

    NUMBERING_KEYS = {
        "numbering.document_prefix": {"category": "numbering", "type": "STRING", "default": "DOC-", "desc": "Default document numbering prefix."},
        "numbering.task_prefix": {"category": "numbering", "type": "STRING", "default": "TASK-", "desc": "Default task numbering prefix."},
        "numbering.mer_prefix": {"category": "numbering", "type": "STRING", "default": "MER-", "desc": "Default MER numbering prefix."},
        "numbering.audit_prefix": {"category": "numbering", "type": "STRING", "default": "AUD-", "desc": "Default audit numbering prefix."},
        "numbering.safety_prefix": {"category": "numbering", "type": "STRING", "default": "SAF-", "desc": "Default safety event numbering prefix."},
        "numbering.sequence_reset": {"category": "numbering", "type": "STRING", "default": "never", "desc": "Numbering sequence reset rule."},
    }

    def test_all_numbering_settings_defined_in_registry(self):
        for key in self.NUMBERING_KEYS:
            self.assertIn(key, SETTING_DEFINITIONS, f"Missing numbering setting: {key}")

    def test_numbering_settings_have_correct_defaults(self):
        for key, expected in self.NUMBERING_KEYS.items():
            definition = SETTING_DEFINITIONS[key]
            self.assertEqual(definition.default, expected["default"], f"Default mismatch for {key}")
            self.assertEqual(definition.value_type, expected["type"], f"Type mismatch for {key}")
            self.assertEqual(definition.category, expected["category"], f"Category mismatch for {key}")
            self.assertEqual(definition.description, expected["desc"], f"Description mismatch for {key}")

    def test_numbering_settings_have_distinct_prefixes(self):
        prefixes = [SETTING_DEFINITIONS[key].default for key in self.NUMBERING_KEYS if "prefix" in key]
        self.assertEqual(len(prefixes), len(set(prefixes)), "Prefix defaults must be distinct")

    def test_sequence_reset_default_is_never(self):
        definition = SETTING_DEFINITIONS["numbering.sequence_reset"]
        self.assertEqual(definition.default, "never")
        self.assertEqual(definition.value_type, "STRING")
        self.assertEqual(definition.description, "Numbering sequence reset rule.")

    def test_all_numbering_keys_are_allowed(self):
        for key in self.NUMBERING_KEYS:
            self.assertTrue(is_allowed_setting_key(key), f"Numbering key {key} should be allowed")

    def test_numbering_settings_appear_in_list_settings(self):
        settings = ApplicationSettingsService.list_settings()
        setting_keys = {s.key for s in settings}
        for key in self.NUMBERING_KEYS:
            self.assertIn(key, setting_keys, f"{key} not found in list_settings()")

    def test_numbering_settings_persist_after_update(self):
        ApplicationSettingsService.update_settings({
            "numbering.document_prefix": "INV-",
            "numbering.task_prefix": "WRK-",
            "numbering.mer_prefix": "ENG-",
            "numbering.audit_prefix": "CHK-",
            "numbering.safety_prefix": "EHS-",
            "numbering.sequence_reset": "yearly",
        })
        self.assertEqual(ApplicationSetting.objects.get(key="numbering.document_prefix").value, "INV-")
        self.assertEqual(ApplicationSetting.objects.get(key="numbering.task_prefix").value, "WRK-")
        self.assertEqual(ApplicationSetting.objects.get(key="numbering.mer_prefix").value, "ENG-")
        self.assertEqual(ApplicationSetting.objects.get(key="numbering.audit_prefix").value, "CHK-")
        self.assertEqual(ApplicationSetting.objects.get(key="numbering.safety_prefix").value, "EHS-")
        self.assertEqual(ApplicationSetting.objects.get(key="numbering.sequence_reset").value, "yearly")

    def test_numbering_settings_can_be_listed_by_category(self):
        numbering_settings = ApplicationSettingsService.list_settings(category="numbering")
        self.assertGreater(len(numbering_settings), 0)
        for setting in numbering_settings:
            self.assertEqual(setting.category, "numbering")
        retrieved_keys = {s.key for s in numbering_settings}
        for key in self.NUMBERING_KEYS:
            self.assertIn(key, retrieved_keys, f"{key} missing from category='numbering' filter")

    def test_numbering_setting_counts_match_registry(self):
        numbering_settings = ApplicationSettingsService.list_settings(category="numbering")
        self.assertEqual(len(numbering_settings), len(self.NUMBERING_KEYS))

    def test_numbering_keys_are_not_forbidden(self):
        from application.settings_registry import FORBIDDEN_SETTING_KEYWORDS
        for key in self.NUMBERING_KEYS:
            normalized = key.strip().lower()
            for token in FORBIDDEN_SETTING_KEYWORDS:
                self.assertNotIn(token, normalized, f"{key} contains forbidden token: {token}")

    def test_update_single_numbering_setting(self):
        ApplicationSettingsService.update_settings({"numbering.document_prefix": "ORD-"})
        setting = ApplicationSetting.objects.get(key="numbering.document_prefix")
        self.assertEqual(setting.value, "ORD-")
        self.assertEqual(setting.category, "numbering")
        self.assertEqual(setting.value_type, "STRING")

    def test_update_single_numbering_setting_does_not_affect_others(self):
        ApplicationSettingsService.update_settings({
            "numbering.document_prefix": "DOC2-",
            "numbering.mer_prefix": "MER2-",
        })
        doc = ApplicationSetting.objects.get(key="numbering.document_prefix")
        mer = ApplicationSetting.objects.get(key="numbering.mer_prefix")
        task = ApplicationSetting.objects.get(key="numbering.task_prefix")
        self.assertEqual(doc.value, "DOC2-")
        self.assertEqual(mer.value, "MER2-")
        self.assertEqual(task.value, "TASK-", "Unrelated numbering setting should retain its default")
