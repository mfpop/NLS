"""
Unit tests for ReferenceTableRecordService domain service.

Tests all CRUD methods (create, update, deactivate) and validate_input
directly on the service class — not through GraphQL resolvers. Follows
the same conventions as test_material_bin_service.py and matches the
@transaction.atomic pattern used by DepartmentService.

Invariants tested:
- validate_input returns correct validation errors for all code paths
- create creates ReferenceValue records and rejects unknown table types
- update modifies fields and rejects system-managed / not-found records
- deactivate sets is_active=False and rejects system-managed / not-found
- Module-level helpers (table_type_to_category, constants) are correct
"""

from django.test import TestCase

from manufacturing.domain.reference_table_service import (
    ReferenceTableRecordService,
    ReferenceTableServiceError,
    ReferenceValidationError,
    TABLE_TYPE_TO_CATEGORY,
    table_type_to_category,
    WORKFLOW_MANAGED_REFERENCE_TABLES,
)
from manufacturing.models import ReferenceCategory, ReferenceValue


# ── Helpers ──

def _create_category(code: str, name: str | None = None) -> ReferenceCategory:
    return ReferenceCategory.objects.create(
        code=code,
        name=name or code.replace("_", " ").title(),
        description=f"{code} category",
    )


def _create_value(category: ReferenceCategory, code: str, **kwargs) -> ReferenceValue:
    defaults = {
        "name": code.replace("_", " ").title(),
        "description": f"Description for {code}",
        "usage_context": f"Context for {code}",
        "sort_order": 0,
        "is_active": True,
    }
    defaults.update(kwargs)
    return ReferenceValue.objects.create(category=category, code=code, **defaults)


# ════════════════════════════════════════════════════════════
#  validate_input Tests
# ════════════════════════════════════════════════════════════

class ValidateInputTests(TestCase):
    """Tests for ReferenceTableRecordService.validate_input"""

    def setUp(self):
        self.cat = _create_category("role", "Role")

    # ── Required field validation (standard tables) ──

    def test_valid_input_returns_empty_list(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="engineer", name="Engineer",
            description="Engineering role", usage_context="Staff assignment",
        )
        self.assertEqual(errors, [])

    def test_empty_code_returns_required_error(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="", name="Engineer",
            description="Engineering role", usage_context="Staff assignment",
        )
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0].field, "code")
        self.assertEqual(errors[0].code, "REQUIRED")

    def test_empty_code_with_whitespace_returns_required_error(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="   ", name="Engineer",
            description="Engineering role", usage_context="Staff assignment",
        )
        self.assertEqual(errors[0].field, "code")

    def test_empty_name_returns_required_error(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="engineer", name="",
            description="Engineering role", usage_context="Staff assignment",
        )
        self.assertEqual(errors[0].field, "name")
        self.assertEqual(errors[0].code, "REQUIRED")

    def test_empty_description_returns_required_error(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="engineer", name="Engineer",
            description="", usage_context="Staff assignment",
        )
        self.assertEqual(errors[0].field, "description")
        self.assertEqual(errors[0].code, "REQUIRED")

    def test_empty_usage_context_returns_required_error(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="engineer", name="Engineer",
            description="Engineering role", usage_context="",
        )
        self.assertEqual(errors[0].field, "usageContext")
        self.assertEqual(errors[0].code, "REQUIRED")

    def test_all_empty_returns_multiple_errors(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="", name="",
            description="", usage_context="",
        )
        self.assertEqual(len(errors), 4)
        fields = {e.field for e in errors}
        self.assertIn("code", fields)
        self.assertIn("name", fields)
        self.assertIn("description", fields)
        self.assertIn("usageContext", fields)

    # ── Duplicate code validation ──

    def test_duplicate_code_detected_case_insensitive(self):
        _create_value(self.cat, "operator")
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="OPERATOR", name="Operator",
            description="Operator role", usage_context="Staff assignment",
        )
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0].field, "code")
        self.assertEqual(errors[0].code, "DUPLICATE")

    def test_same_code_allowed_in_different_table(self):
        other_cat = _create_category("skill_type", "Skill Type")
        _create_value(self.cat, "operator")
        errors = ReferenceTableRecordService.validate_input(
            table_type="skill_type", code="operator", name="Operator",
            description="Operator skill", usage_context="Resource capability",
        )
        self.assertEqual(errors, [])

    def test_same_code_allowed_when_updating_same_record(self):
        rv = _create_value(self.cat, "operator")
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="operator", name="Operator Updated",
            description="Test", usage_context="Test",
            current_id=str(rv.id),
        )
        self.assertEqual(errors, [])

    def test_duplicate_code_detected_when_updating_other_record(self):
        _create_value(self.cat, "operator")
        other = _create_value(self.cat, "supervisor")
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="operator", name="Operator",
            description="Test", usage_context="Test",
            current_id=str(other.id),
        )
        self.assertEqual(errors[0].code, "DUPLICATE")

    # ── Staff user / assignment validation ──

    def test_staff_user_validates_name_only(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="staff_user", code="", name="John Doe",
            description="", usage_context="",
        )
        self.assertEqual(errors, [])

    def test_staff_user_rejects_empty_name(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="staff_user", code="", name="",
            description="", usage_context="",
        )
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0].field, "name")
        self.assertEqual(errors[0].code, "REQUIRED")

    def test_staff_assignment_validates_name_and_usage_context(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="staff_assignment", code="", name="John Doe",
            description="", usage_context="Manager role",
        )
        self.assertEqual(errors, [])

    def test_staff_assignment_rejects_missing_usage_context(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="staff_assignment", code="", name="John Doe",
            description="", usage_context="",
        )
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0].field, "usageContext")

    def test_staff_assignment_rejects_empty_name(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="staff_assignment", code="", name="",
            description="", usage_context="Manager role",
        )
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0].field, "name")

    def test_staff_assignment_rejects_both_empty(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="staff_assignment", code="", name="",
            description="", usage_context="",
        )
        self.assertEqual(len(errors), 2)
        fields = {e.field for e in errors}
        self.assertIn("name", fields)
        self.assertIn("usageContext", fields)

    # ── Unknown table type mapping (falls through to use table_type as category) ──

    def test_unknown_table_type_uses_type_as_category(self):
        # No category exists for this type, so validation still runs
        # Duplicate check queries empty set so no duplicate error
        errors = ReferenceTableRecordService.validate_input(
            table_type="nonexistent_table", code="test", name="Test",
            description="Test description", usage_context="Test context",
        )
        self.assertEqual(errors, [])

    # ── Return type ──

    def test_returns_list_of_reference_validation_error(self):
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="", name="",
            description="", usage_context="",
        )
        for err in errors:
            self.assertIsInstance(err, ReferenceValidationError)

    def test_no_side_effects_on_database(self):
        """validate_input should not create any DB records."""
        before_count = ReferenceValue.objects.count()
        ReferenceTableRecordService.validate_input(
            table_type="role", code="engineer", name="Engineer",
            description="Engineering role", usage_context="Staff assignment",
        )
        after_count = ReferenceValue.objects.count()
        self.assertEqual(before_count, after_count)


# ════════════════════════════════════════════════════════════
#  create Tests
# ════════════════════════════════════════════════════════════

class CreateTests(TestCase):
    """Tests for ReferenceTableRecordService.create"""

    def setUp(self):
        self.cat = _create_category("role", "Role")

    def test_creates_reference_value_with_all_fields(self):
        rv = ReferenceTableRecordService.create(
            table_type="role",
            code="engineer",
            name="Engineer",
            description="Engineering role",
            usage_context="Staff assignment",
            sort_order=10,
            is_active=True,
        )
        self.assertIsInstance(rv, ReferenceValue)
        self.assertEqual(rv.category, self.cat)
        self.assertEqual(rv.code, "engineer")
        self.assertEqual(rv.name, "Engineer")
        self.assertEqual(rv.description, "Engineering role")
        self.assertEqual(rv.usage_context, "Staff assignment")
        self.assertEqual(rv.sort_order, 10)
        self.assertTrue(rv.is_active)
        self.assertIsNotNone(rv.id)

    def test_creates_with_defaults(self):
        rv = ReferenceTableRecordService.create(
            table_type="role",
            code="operator",
            name="Operator",
            description="Operator role",
            usage_context="Staff assignment",
        )
        self.assertEqual(rv.code, "operator")
        self.assertEqual(rv.name, "Operator")
        self.assertEqual(rv.sort_order, 0)
        self.assertTrue(rv.is_active)

    def test_strips_whitespace_from_fields(self):
        rv = ReferenceTableRecordService.create(
            table_type="role",
            code="  engineer  ",
            name="  Engineer  ",
            description="  Engineering role  ",
            usage_context="  Staff assignment  ",
        )
        self.assertEqual(rv.code, "engineer")
        self.assertEqual(rv.name, "Engineer")
        self.assertEqual(rv.description, "Engineering role")
        self.assertEqual(rv.usage_context, "Staff assignment")

    def test_creates_with_is_active_false(self):
        rv = ReferenceTableRecordService.create(
            table_type="role",
            code="inactive_role",
            name="Inactive Role",
            description="Inactive role",
            usage_context="Staff assignment",
            is_active=False,
        )
        self.assertFalse(rv.is_active)

    def test_persists_to_database(self):
        rv = ReferenceTableRecordService.create(
            table_type="role",
            code="persisted",
            name="Persisted",
            description="Persisted role",
            usage_context="Staff assignment",
        )
        from_db = ReferenceValue.objects.get(id=rv.id)
        self.assertEqual(from_db.code, "persisted")

    def test_raises_error_for_unknown_table_type(self):
        with self.assertRaises(ReferenceTableServiceError) as ctx:
            ReferenceTableRecordService.create(
                table_type="nonexistent",
                code="test",
                name="Test",
            )
        self.assertEqual(ctx.exception.field, "tableType")
        self.assertEqual(ctx.exception.code, "INVALID")
        self.assertIn("nonexistent", ctx.exception.message)

    def test_unknown_table_type_does_not_create_record(self):
        with self.assertRaises(ReferenceTableServiceError):
            ReferenceTableRecordService.create(
                table_type="nonexistent",
                code="test",
                name="Test",
            )
        self.assertEqual(ReferenceValue.objects.count(), 0)

    def test_maps_table_type_to_category_code(self):
        """Different table types mapping to same category code work."""
        cal_cat = _create_category("calendar", "Calendar")
        rv = ReferenceTableRecordService.create(
            table_type="production_calendar",  # maps to "calendar" category
            code="standard_40h",
            name="Standard 40h",
            description="Standard 40h calendar",
            usage_context="Schedule",
        )
        self.assertEqual(rv.category, cal_cat)

    # Note: ReferenceTableServiceError type-checking is covered by
    # ServiceErrorTests.test_is_exception_subclass and
    # ServiceErrorTests.test_can_be_raised_and_caught below.


# ════════════════════════════════════════════════════════════
#  update Tests
# ════════════════════════════════════════════════════════════

class UpdateTests(TestCase):
    """Tests for ReferenceTableRecordService.update"""

    def setUp(self):
        self.cat = _create_category("role", "Role")
        self.rv = _create_value(self.cat, "operator")

    def test_updates_all_fields(self):
        updated = ReferenceTableRecordService.update(
            id=str(self.rv.id),
            code="senior_operator",
            name="Senior Operator",
            description="Senior operator role",
            usage_context="Advanced staff assignment",
            sort_order=5,
            is_active=True,
        )
        self.assertEqual(updated.code, "senior_operator")
        self.assertEqual(updated.name, "Senior Operator")
        self.assertEqual(updated.description, "Senior operator role")
        self.assertEqual(updated.usage_context, "Advanced staff assignment")
        self.assertEqual(updated.sort_order, 5)
        self.assertTrue(updated.is_active)

    def test_updates_persist_to_database(self):
        ReferenceTableRecordService.update(
            id=str(self.rv.id),
            code="senior_operator",
            name="Senior Operator",
            description="Updated",
            usage_context="Updated",
        )
        self.rv.refresh_from_db()
        self.assertEqual(self.rv.code, "senior_operator")
        self.assertEqual(self.rv.name, "Senior Operator")

    def test_is_active_none_does_not_change_active_status(self):
        self.rv.is_active = True
        self.rv.save()
        updated = ReferenceTableRecordService.update(
            id=str(self.rv.id),
            code="operator",
            name="Operator",
            description="Operator role",
            usage_context="Staff assignment",
            is_active=None,
        )
        self.assertTrue(updated.is_active)

    def test_is_active_false_deactivates(self):
        updated = ReferenceTableRecordService.update(
            id=str(self.rv.id),
            code="operator",
            name="Operator",
            description="Operator role",
            usage_context="Staff assignment",
            is_active=False,
        )
        self.assertFalse(updated.is_active)

    def test_strips_whitespace_from_fields(self):
        updated = ReferenceTableRecordService.update(
            id=str(self.rv.id),
            code="  engineer  ",
            name="  Engineer  ",
            description="  Engineering role  ",
            usage_context="  Staff  ",
        )
        self.assertEqual(updated.code, "engineer")
        self.assertEqual(updated.name, "Engineer")

    def test_raises_not_found_for_nonexistent_id(self):
        with self.assertRaises(ReferenceTableServiceError) as ctx:
            ReferenceTableRecordService.update(
                id="999999",
                code="test",
                name="Test",
            )
        self.assertEqual(ctx.exception.field, "id")
        self.assertEqual(ctx.exception.code, "NOT_FOUND")

    def test_raises_system_managed_for_system_managed_record(self):
        self.rv.is_system_managed = True
        self.rv.save()
        with self.assertRaises(ReferenceTableServiceError) as ctx:
            ReferenceTableRecordService.update(
                id=str(self.rv.id),
                code="changed",
                name="Changed",
            )
        self.assertEqual(ctx.exception.field, "id")
        self.assertEqual(ctx.exception.code, "SYSTEM_MANAGED")

    def test_raises_system_managed_for_non_configurable_record(self):
        self.rv.is_configurable = False
        self.rv.save()
        with self.assertRaises(ReferenceTableServiceError) as ctx:
            ReferenceTableRecordService.update(
                id=str(self.rv.id),
                code="changed",
                name="Changed",
            )
        self.assertEqual(ctx.exception.code, "SYSTEM_MANAGED")

    def test_system_managed_record_not_modified(self):
        original_code = self.rv.code
        self.rv.is_system_managed = True
        self.rv.save()
        with self.assertRaises(ReferenceTableServiceError):
            ReferenceTableRecordService.update(
                id=str(self.rv.id),
                code="changed",
                name="Changed",
            )
        self.rv.refresh_from_db()
        self.assertEqual(self.rv.code, original_code)

    def test_preserves_category_unchanged(self):
        """Category should not change on update."""
        updated = ReferenceTableRecordService.update(
            id=str(self.rv.id),
            code="operator",
            name="Operator Updated",
            description="Operator role",
            usage_context="Staff assignment",
        )
        self.assertEqual(updated.category, self.cat)

    def test_preserves_created_at(self):
        original_created = self.rv.created_at
        ReferenceTableRecordService.update(
            id=str(self.rv.id),
            code="operator",
            name="Operator Updated",
            description="Operator role",
            usage_context="Staff assignment",
        )
        self.rv.refresh_from_db()
        self.assertEqual(self.rv.created_at, original_created)


# ════════════════════════════════════════════════════════════
#  deactivate Tests
# ════════════════════════════════════════════════════════════

class DeactivateTests(TestCase):
    """Tests for ReferenceTableRecordService.deactivate"""

    def setUp(self):
        self.cat = _create_category("role", "Role")
        self.rv = _create_value(self.cat, "operator")

    def test_deactivates_reference_value(self):
        self.assertTrue(self.rv.is_active)
        result = ReferenceTableRecordService.deactivate(id=str(self.rv.id))
        self.assertFalse(result.is_active)

    def test_deactivation_persists_to_database(self):
        ReferenceTableRecordService.deactivate(id=str(self.rv.id))
        self.rv.refresh_from_db()
        self.assertFalse(self.rv.is_active)

    def test_preserves_other_fields_on_deactivation(self):
        original_code = self.rv.code
        original_name = self.rv.name
        ReferenceTableRecordService.deactivate(id=str(self.rv.id))
        self.rv.refresh_from_db()
        self.assertEqual(self.rv.code, original_code)
        self.assertEqual(self.rv.name, original_name)

    def test_raises_not_found_for_nonexistent_id(self):
        with self.assertRaises(ReferenceTableServiceError) as ctx:
            ReferenceTableRecordService.deactivate(id="999999")
        self.assertEqual(ctx.exception.field, "id")
        self.assertEqual(ctx.exception.code, "NOT_FOUND")

    def test_raises_system_managed_for_system_managed_record(self):
        self.rv.is_system_managed = True
        self.rv.save()
        with self.assertRaises(ReferenceTableServiceError) as ctx:
            ReferenceTableRecordService.deactivate(id=str(self.rv.id))
        self.assertEqual(ctx.exception.field, "id")
        self.assertEqual(ctx.exception.code, "SYSTEM_MANAGED")

    def test_raises_system_managed_for_non_configurable_record(self):
        self.rv.is_configurable = False
        self.rv.save()
        with self.assertRaises(ReferenceTableServiceError) as ctx:
            ReferenceTableRecordService.deactivate(id=str(self.rv.id))
        self.assertEqual(ctx.exception.code, "SYSTEM_MANAGED")

    def test_system_managed_record_not_deactivated(self):
        self.rv.is_system_managed = True
        self.rv.save()
        with self.assertRaises(ReferenceTableServiceError):
            ReferenceTableRecordService.deactivate(id=str(self.rv.id))
        self.rv.refresh_from_db()
        self.assertTrue(self.rv.is_active)

    def test_returns_reference_value_type(self):
        result = ReferenceTableRecordService.deactivate(id=str(self.rv.id))
        self.assertIsInstance(result, ReferenceValue)

    def test_raises_error_with_correct_type(self):
        with self.assertRaises(ReferenceTableServiceError):
            ReferenceTableRecordService.deactivate(id="999999")


# ════════════════════════════════════════════════════════════
#  Module-level Helpers
# ════════════════════════════════════════════════════════════

class TableTypeToCategoryTests(TestCase):
    """Tests for table_type_to_category helper."""

    def test_known_mapping_returns_category_code(self):
        self.assertEqual(table_type_to_category("production_calendar"), "calendar")
        self.assertEqual(table_type_to_category("shift_pattern"), "shift_model")
        self.assertEqual(table_type_to_category("role"), "role")
        self.assertEqual(table_type_to_category("skill_type"), "skill_type")
        self.assertEqual(table_type_to_category("staff_user"), "__staff_user__")
        self.assertEqual(table_type_to_category("staff_assignment"), "__staff_assignment__")

    def test_unknown_type_returns_itself(self):
        self.assertEqual(table_type_to_category("unknown"), "unknown")
        self.assertEqual(table_type_to_category(""), "")
        self.assertEqual(table_type_to_category("custom_table"), "custom_table")


class TableTypeToCategoryConstantTests(TestCase):
    """Tests for the TABLE_TYPE_TO_CATEGORY constant."""

    def test_contains_all_major_types(self):
        """Verify completeness: all major table types have entries."""
        expected_types = [
            "production_calendar", "shift_pattern", "language", "timezone",
            "industry_type", "manufacturing_type", "work_center_type",
            "machine_type", "operation_code", "routing_type",
            "material_category", "inventory_type", "kanban_type",
            "container_type", "unit_type", "downtime_code", "defect_code",
            "scrap_reason", "kaizen_category", "priority", "label_badge",
            "maintenance_type", "material_flow_type", "process_type",
            "skill_type", "role", "shift_team",
            "staff_user", "staff_assignment",
            "product_model", "production_family",
        ]
        for t in expected_types:
            self.assertIn(t, TABLE_TYPE_TO_CATEGORY,
                          f"{t} is missing from TABLE_TYPE_TO_CATEGORY")

    def test_all_values_are_non_empty(self):
        for key, value in TABLE_TYPE_TO_CATEGORY.items():
            self.assertTrue(value, f"Value for {key} is empty")

    def test_no_duplicate_values(self):
        """Verify no two table types map to the same category code,
        except intentionally shared ones (should not happen in practice)."""
        from collections import Counter
        duplicates = {v: k for k, v in Counter(TABLE_TYPE_TO_CATEGORY.values()).items() if v > 1}
        # Allow known special cases: __staff_user__ and __staff_assignment__
        duplicates.pop("__staff_user__", None)
        duplicates.pop("__staff_assignment__", None)
        self.assertEqual(len(duplicates), 0,
                         f"Found duplicate category codes: {duplicates}")


class WorkflowManagedReferenceTablesTests(TestCase):
    """Tests for the WORKFLOW_MANAGED_REFERENCE_TABLES constant."""

    def test_is_empty_set(self):
        self.assertIsInstance(WORKFLOW_MANAGED_REFERENCE_TABLES, set)
        self.assertEqual(len(WORKFLOW_MANAGED_REFERENCE_TABLES), 0)

    def test_validate_input_does_not_block_standard_tables(self):
        """With WORKFLOW_MANAGED empty, no tables are blocked."""
        errors = ReferenceTableRecordService.validate_input(
            table_type="role", code="test", name="Test",
            description="Test desc", usage_context="Test context",
        )
        workflow_errors = [e for e in errors if e.code == "WORKFLOW_MANAGED"]
        self.assertEqual(len(workflow_errors), 0)

    def test_workflow_managed_flag_returns_early_error(self):
        """If a table type were added to WORKFLOW_MANAGED, it should block."""
        from manufacturing.domain.reference_table_service import WORKFLOW_MANAGED_REFERENCE_TABLES
        # Temporarily add a type to the set
        original = set(WORKFLOW_MANAGED_REFERENCE_TABLES)
        try:
            WORKFLOW_MANAGED_REFERENCE_TABLES.add("role")
            errors = ReferenceTableRecordService.validate_input(
                table_type="role", code="test", name="Test",
                description="Test", usage_context="Test",
            )
            self.assertEqual(len(errors), 1)
            self.assertEqual(errors[0].code, "WORKFLOW_MANAGED")
        finally:
            WORKFLOW_MANAGED_REFERENCE_TABLES.clear()
            WORKFLOW_MANAGED_REFERENCE_TABLES.update(original)


# ════════════════════════════════════════════════════════════
#  Service Error Type Tests
# ════════════════════════════════════════════════════════════

class ServiceErrorTests(TestCase):
    """Tests for ReferenceTableServiceError dataclass."""

    def test_is_exception_subclass(self):
        self.assertTrue(issubclass(ReferenceTableServiceError, Exception))

    def test_stores_field_code_and_message(self):
        err = ReferenceTableServiceError("testField", "TEST_CODE", "Test message")
        self.assertEqual(err.field, "testField")
        self.assertEqual(err.code, "TEST_CODE")
        self.assertEqual(err.message, "Test message")

    def test_can_be_raised_and_caught(self):
        with self.assertRaises(ReferenceTableServiceError) as ctx:
            raise ReferenceTableServiceError("id", "NOT_FOUND", "Not found")
        self.assertEqual(ctx.exception.code, "NOT_FOUND")


class ReferenceValidationErrorTests(TestCase):
    """Tests for ReferenceValidationError dataclass."""

    def test_stores_field_code_and_message(self):
        err = ReferenceValidationError("code", "REQUIRED", "Code is required")
        self.assertEqual(err.field, "code")
        self.assertEqual(err.code, "REQUIRED")
        self.assertEqual(err.message, "Code is required")
