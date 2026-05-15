from django.core.management import call_command
from django.test import TestCase

from api.mutations.manufacturing import ManufacturingMutation, ReferenceItemInput, _validate_reference_item_input
from api.queries.manufacturing import LegacyReferenceItemNode
from manufacturing.models import ReferenceCategory, ReferenceValue


class ReferenceDataTests(TestCase):
    def test_reference_item_validation_requires_core_fields(self):
        errors = _validate_reference_item_input(ReferenceItemInput(
            table_type="role",
            code="",
            name="",
            description="",
            usage_context="",
        ))
        fields = {error.field for error in errors}
        self.assertTrue({"code", "name", "description", "usageContext"}.issubset(fields))

    def test_duplicate_code_is_rejected_in_scope(self):
        category = ReferenceCategory.objects.create(code="role", name="Role", description="Production job roles.")
        ReferenceValue.objects.create(
            category=category,
            code="operator",
            name="Operator",
            description="Executes standard work.",
            usage_context="Used in staff assignment selection.",
        )
        errors = _validate_reference_item_input(ReferenceItemInput(
            table_type="role",
            code="OPERATOR",
            name="Operator 2",
            description="Another operator role.",
            usage_context="Used in staff assignment selection.",
        ))
        self.assertIn("DUPLICATE", {error.code for error in errors})

    def test_seed_lean_reference_values_is_idempotent_and_complete(self):
        call_command("seed_lean_reference_values")
        first_count = ReferenceValue.objects.count()
        call_command("seed_lean_reference_values")
        self.assertEqual(ReferenceValue.objects.count(), first_count)
        self.assertFalse(ReferenceValue.objects.filter(description="").exists())
        self.assertFalse(ReferenceValue.objects.filter(usage_context="").exists())
        expected_roles = {
            "plant_manager", "production_manager", "line_supervisor", "team_leader", "operator",
            "quality_manager", "quality_inspector", "maintenance_manager", "maintenance_tech",
            "planner", "warehouse_op", "logistics_coordinator", "process_engineer",
            "industrial_engineer", "lean_coordinator", "ehs_specialist", "system_admin", "viewer",
        }
        self.assertTrue(expected_roles.issubset(set(
            ReferenceValue.objects.filter(category__code="role").values_list("code", flat=True)
        )))

    def test_system_managed_records_are_not_configurable(self):
        call_command("seed_lean_reference_values")
        locked = ReferenceValue.objects.get(category__code="status", code="locked")
        self.assertTrue(locked.is_system_managed)
        self.assertFalse(locked.is_configurable)

    def test_reference_query_node_returns_db_metadata(self):
        call_command("seed_lean_reference_values")
        role = ReferenceValue.objects.get(category__code="role", code="operator")
        node = LegacyReferenceItemNode.from_ref_value(role, "role")
        self.assertEqual(node.description, role.description)
        self.assertEqual(node.usage_context, role.usage_context)
        self.assertEqual(node.is_system_managed, role.is_system_managed)
        self.assertEqual(node.is_configurable, role.is_configurable)
        self.assertNotEqual(node.usage_impact, "No known usage")

    def test_system_managed_record_cannot_be_deactivated(self):
        call_command("seed_lean_reference_values")
        locked = ReferenceValue.objects.get(category__code="status", code="locked")
        result = ManufacturingMutation().deactivate_reference_item(str(locked.id))
        self.assertEqual(result.errors[0].code, "SYSTEM_MANAGED")
        locked.refresh_from_db()
        self.assertTrue(locked.is_active)
