"""
Tests for reference table GraphQL resolvers (queries & mutations).

These tests verify:
- Query resolvers return correct data shapes, pagination, and record counts
- Mutation resolvers correctly create, update, and deactivate reference items
- Permissions, validation, and edge cases are handled properly

Invariants tested:
- reference_table_catalog returns all groups with correct table lists and counts
- reference_tables and reference_tables_list return category/value data
- reference_categories / reference_values paginate correctly
- create_reference_item enforces required fields, duplicate codes, and staff_user/staff_assignment restrictions
- update_reference_item rejects system-managed records
- deactivate_reference_item rejects system-managed records
"""

from unittest.mock import MagicMock

from django.contrib.auth.models import User
from django.test import TestCase

from api.mutations.manufacturing import (
    ManufacturingMutation,
    ReferenceItemInput,
    _validate_reference_item_input,
)
from manufacturing.models import UserRole
from api.queries.manufacturing import (
    ManufacturingQuery,
    LegacyReferenceItemNode,
    REFERENCE_TABLE_GROUPS,
    REFERENCE_TABLE_LABELS,
    REFERENCE_TABLE_LABELS_SINGULAR,
    REFERENCE_TABLE_DESCRIPTIONS,
    REFERENCE_TABLE_SCOPE,
    REFERENCE_USAGE_CONTEXT,
    TABLE_TYPE_TO_CATEGORY,
)
from api.types.manufacturing import (
    MutationError,
    ReferenceTableCatalogEntryNode,
    ReferenceTableCatalogGroupNode,
    ReferenceTableNode,
    ReferenceCategoryNode,
    ReferenceValueNode,
)
from manufacturing.models import ReferenceCategory, ReferenceValue


# ── Helpers ──

def _create_category(code: str, name: str | None = None) -> ReferenceCategory:
    return ReferenceCategory.objects.create(
        code=code,
        name=name or code.replace("_", " ").title(),
        description=f"{name or code} category",
    )


def _create_value(category: ReferenceCategory, code: str, **kwargs) -> ReferenceValue:
    defaults = {
        "name": code.replace("_", " ").title(),
        "description": f"Description for {code}",
        "usage_context": f"Context for {code}",
    }
    defaults.update(kwargs)
    return ReferenceValue.objects.create(category=category, code=code, **defaults)


# ════════════════════════════════════════════════════════
#  Query Tests
# ════════════════════════════════════════════════════════

class ReferenceTableCatalogQueryTests(TestCase):
    """Tests for the referenceTableCatalog resolver (Issue #1)."""

    def setUp(self):
        self.query = ManufacturingQuery()
        # Create categories and values matching a few groups
        self.cal_cat = _create_category("calendar", "Calendar")
        self.shift_cat = _create_category("shift_model", "Shift Model")
        self.lang_cat = _create_category("language", "Language")
        self.role_cat = _create_category("role", "Role")
        # Create some values
        _create_value(self.cal_cat, "standard_40h")
        _create_value(self.cal_cat, "flexible")
        _create_value(self.shift_cat, "morning")
        _create_value(self.shift_cat, "afternoon")
        _create_value(self.shift_cat, "night")
        _create_value(self.lang_cat, "en")
        _create_value(self.role_cat, "operator")
        _create_value(self.role_cat, "supervisor")

    def test_returns_all_groups(self):
        result = self.query.reference_table_catalog()
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), len(REFERENCE_TABLE_GROUPS))
        for i, group in enumerate(result):
            expected_code, expected_label, expected_tables = REFERENCE_TABLE_GROUPS[i]
            self.assertEqual(group.code, expected_code)
            self.assertEqual(group.label, expected_label)
            self.assertEqual(len(group.tables), len(expected_tables))

    def test_each_group_has_correct_table_types(self):
        result = self.query.reference_table_catalog()
        for i, group in enumerate(result):
            expected_tables = REFERENCE_TABLE_GROUPS[i][2]
            returned_codes = [t.code for t in group.tables]
            self.assertEqual(returned_codes, expected_tables)

    def test_entry_has_all_expected_fields(self):
        result = self.query.reference_table_catalog()
        # Check the first table entry of the first group
        group = result[0]
        entry = group.tables[0]
        self.assertIsInstance(entry, ReferenceTableCatalogEntryNode)
        self.assertTrue(entry.code)
        self.assertTrue(entry.label)
        self.assertTrue(entry.label_singular)
        self.assertIn(entry.code, REFERENCE_TABLE_LABELS)
        self.assertIn(entry.code, REFERENCE_TABLE_LABELS_SINGULAR)
        self.assertIn(entry.code, REFERENCE_TABLE_SCOPE)
        self.assertEqual(entry.label, REFERENCE_TABLE_LABELS[entry.code])
        self.assertEqual(entry.label_singular, REFERENCE_TABLE_LABELS_SINGULAR[entry.code])
        self.assertEqual(entry.scope, REFERENCE_TABLE_SCOPE[entry.code])

    def test_entry_has_description_and_usage_context(self):
        result = self.query.reference_table_catalog()
        entry = result[0].tables[0]
        self.assertIn(entry.code, REFERENCE_TABLE_DESCRIPTIONS)
        self.assertIn(entry.code, REFERENCE_USAGE_CONTEXT)
        self.assertEqual(entry.description, REFERENCE_TABLE_DESCRIPTIONS[entry.code])
        self.assertEqual(entry.usage_context, REFERENCE_USAGE_CONTEXT[entry.code])

    def test_record_count_reflects_active_values(self):
        result = self.query.reference_table_catalog()
        # Calendar group is first, entries[0] = production_calendar -> calendar category
        calendar_entry = result[0].tables[0]  # production_calendar
        self.assertEqual(calendar_entry.code, "production_calendar")
        self.assertEqual(calendar_entry.record_count, 2)  # standard_40h, flexible

        # Language group often in a different position; find it by code
        all_entries = [e for g in result for e in g.tables]
        lang_entry = next(e for e in all_entries if e.code == "language")
        self.assertEqual(lang_entry.record_count, 1)  # en

    def test_record_count_excludes_inactive_values(self):
        # Deactivate one calendar value
        rv = ReferenceValue.objects.get(category__code="calendar", code="flexible")
        rv.is_active = False
        rv.save()

        result = self.query.reference_table_catalog()
        all_entries = [e for g in result for e in g.tables]
        cal_entry = next(e for e in all_entries if e.code == "production_calendar")
        self.assertEqual(cal_entry.record_count, 1)  # only standard_40h

    def test_staff_user_counts_active_users(self):
        User.objects.create_user(username="user1", password="pass12345", is_active=True)
        User.objects.create_user(username="user2", password="pass12345", is_active=True)
        User.objects.create_user(username="inactive_user", password="pass12345", is_active=False)

        result = self.query.reference_table_catalog()
        all_entries = [e for g in result for e in g.tables]
        staff_entry = next(e for e in all_entries if e.code == "staff_user")
        self.assertEqual(staff_entry.record_count, 2)  # only active

    def test_is_configurable(self):
        result = self.query.reference_table_catalog()
        all_entries = [e for g in result for e in g.tables]
        for entry in all_entries:
            if entry.code in ("staff_user", "staff_assignment"):
                self.assertFalse(entry.is_configurable)
            else:
                self.assertTrue(entry.is_configurable)

    def test_each_entry_has_category_code(self):
        result = self.query.reference_table_catalog()
        for group in result:
            for entry in group.tables:
                if entry.code in ("staff_user", "staff_assignment"):
                    continue  # no category in DB
                cat_code = TABLE_TYPE_TO_CATEGORY.get(entry.code, entry.code)
                self.assertEqual(entry.category_code, cat_code)


class ReferenceTablesQueryTests(TestCase):
    """Tests for reference_tables and reference_tables_list resolvers."""

    def setUp(self):
        self.query = ManufacturingQuery()
        self.cat = _create_category("role", "Role")
        _create_value(self.cat, "operator")
        _create_value(self.cat, "supervisor")
        _create_value(self.cat, "manager")

    def test_reference_tables_by_category_returns_values(self):
        result = self.query.reference_tables(category="role")
        self.assertIsInstance(result, ReferenceTableNode)
        self.assertEqual(result.category_code, "role")
        self.assertEqual(result.category_name, "Role")
        self.assertEqual(len(result.values), 3)

    def test_reference_tables_unknown_category_returns_none(self):
        result = self.query.reference_tables(category="nonexistent")
        self.assertIsNone(result)

    def test_reference_tables_list_returns_all_categories(self):
        _create_category("language", "Language")
        result = self.query.reference_tables_list()
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 2)  # role + language
        codes = {r.category_code for r in result}
        self.assertIn("role", codes)
        self.assertIn("language", codes)

    def test_reference_tables_list_includes_active_only(self):
        # Create an inactive value
        _create_value(self.cat, "intern", is_active=False)
        result = self.query.reference_tables_list()
        role_table = next(r for r in result if r.category_code == "role")
        role_codes = [f.code for f in role_table.values]
        self.assertIn("operator", role_codes)
        self.assertNotIn("intern", role_codes)


class ReferenceCategoriesQueryTests(TestCase):
    """Tests for reference_categories resolver."""

    def setUp(self):
        self.query = ManufacturingQuery()
        _create_category("role", "Role")
        _create_category("language", "Language")
        _create_category("timezone", "Timezone")

    def test_returns_all_categories(self):
        result = self.query.reference_categories()
        self.assertEqual(result.total, 3)
        self.assertEqual(len(result.items), 3)

    def test_paginates_with_limit(self):
        result = self.query.reference_categories(limit=2)
        self.assertEqual(len(result.items), 2)
        self.assertEqual(result.total, 3)
        self.assertTrue(result.has_more)

    def test_paginates_with_offset(self):
        result = self.query.reference_categories(limit=2, offset=2)
        self.assertEqual(len(result.items), 1)
        self.assertFalse(result.has_more)

    def test_returns_reference_category_node_fields(self):
        result = self.query.reference_categories(limit=1)
        item = result.items[0]
        self.assertIsInstance(item, ReferenceCategoryNode)
        self.assertTrue(item.code)
        self.assertTrue(item.name)

    def test_empty_result_when_no_categories(self):
        ReferenceCategory.objects.all().delete()
        result = self.query.reference_categories()
        self.assertEqual(result.total, 0)
        self.assertEqual(len(result.items), 0)
        self.assertFalse(result.has_more)


class ReferenceValuesQueryTests(TestCase):
    """Tests for reference_values resolver."""

    def setUp(self):
        self.query = ManufacturingQuery()
        self.cat = _create_category("role", "Role")
        _create_value(self.cat, "operator")
        _create_value(self.cat, "supervisor")
        _create_value(self.cat, "manager")
        _create_value(self.cat, "director")

    def test_returns_all_values(self):
        result = self.query.reference_values()
        self.assertEqual(result.total, 4)
        self.assertEqual(len(result.items), 4)

    def test_filters_by_category_id(self):
        result = self.query.reference_values(category_id=str(self.cat.id))
        self.assertEqual(result.total, 4)

    def test_paginates_correctly(self):
        result = self.query.reference_values(limit=2)
        self.assertEqual(len(result.items), 2)
        self.assertTrue(result.has_more)

    def test_paginates_with_offset(self):
        result = self.query.reference_values(limit=2, offset=2)
        self.assertEqual(len(result.items), 2)
        self.assertFalse(result.has_more)

    def test_returns_reference_value_node_fields(self):
        result = self.query.reference_values(limit=1)
        item = result.items[0]
        self.assertIsInstance(item, ReferenceValueNode)
        self.assertTrue(item.code)
        self.assertTrue(item.name)
        self.assertTrue(item.description)
        self.assertIsNotNone(item.is_active)
        self.assertIsNotNone(item.sort_order)

    def test_category_id_no_match_returns_empty(self):
        result = self.query.reference_values(category_id="999999")
        self.assertEqual(result.total, 0)
        self.assertEqual(len(result.items), 0)

    def test_empty_result_when_no_values(self):
        ReferenceValue.objects.all().delete()
        result = self.query.reference_values()
        self.assertEqual(result.total, 0)


# ── Mock info helper ──

def _make_info(user: User) -> MagicMock:
    """Create a mock GraphQL info object with an authenticated user."""
    info = MagicMock()
    info.context.user = user
    return info


def _create_manager_user() -> User:
    """Create a user with dept_manager role for mutation tests."""
    user = User.objects.create_user(
        username="manager", password="pass12345", is_active=True,
    )
    UserRole.objects.create(
        user=user, role=UserRole.RoleType.DEPT_MANAGER,
    )
    return user


# ════════════════════════════════════════════════════════
#  Mutation Tests
# ════════════════════════════════════════════════════════

class CreateReferenceItemMutationTests(TestCase):
    """Tests for create_reference_item mutation."""

    def setUp(self):
        self.mutation = ManufacturingMutation()
        self.user = _create_manager_user()
        self.info = _make_info(self.user)
        self.cat = _create_category("role", "Role")

    def _create(self, **kwargs):
        """Helper to call create_reference_item."""
        defaults = dict(description="", usage_context="")
        defaults.update(kwargs)
        return self.mutation.create_reference_item(
            self.info, ReferenceItemInput(**defaults)
        )

    def test_creates_reference_value(self):
        result = self._create(
            table_type="role", code="engineer", name="Engineer",
            description="Engineering role", usage_context="Staff assignment",
        )
        self.assertIsNotNone(result.item)
        self.assertEqual(result.item.code, "engineer")
        self.assertEqual(result.item.name, "Engineer")
        self.assertTrue(ReferenceValue.objects.filter(code="engineer").exists())

    def test_rejects_empty_code(self):
        result = self._create(
            table_type="role", code="", name="Engineer",
            description="Engineering role", usage_context="Staff assignment",
        )
        self.assertIsNone(result.item)
        self.assertIn("REQUIRED", {e.code for e in result.errors})
        self.assertIn("code", {e.field for e in result.errors})

    def test_rejects_empty_name(self):
        result = self._create(
            table_type="role", code="engineer", name="",
            description="Engineering role", usage_context="Staff assignment",
        )
        self.assertIsNone(result.item)
        self.assertIn("REQUIRED", {e.code for e in result.errors})
        self.assertIn("name", {e.field for e in result.errors})

    def test_rejects_duplicate_code_case_insensitive(self):
        _create_value(self.cat, "operator")
        result = self._create(
            table_type="role", code="OPERATOR", name="Operator",
            description="Operator role", usage_context="Staff assignment",
        )
        self.assertIsNone(result.item)
        self.assertIn("DUPLICATE", {e.code for e in result.errors})

    def test_allows_duplicate_code_in_different_table(self):
        _create_category("skill_type", "Skill Type")
        _create_value(self.cat, "operator")
        result = self._create(
            table_type="skill_type", code="operator", name="Operator",
            description="Operator skill", usage_context="Resource capability",
        )
        self.assertIsNotNone(result.item)
        self.assertEqual(result.item.code, "operator")

    def test_rejects_staff_user_creation(self):
        result = self._create(
            table_type="staff_user", code="newuser", name="New User",
            description="A staff user", usage_context="Staff workflow",
        )
        self.assertIsNone(result.item)
        self.assertIn("UNSUPPORTED", {e.code for e in result.errors})

    def test_rejects_staff_assignment_creation(self):
        result = self._create(
            table_type="staff_assignment", code="newassign", name="New Assign",
            description="A staff assignment", usage_context="Staff workflow",
        )
        self.assertIsNone(result.item)
        self.assertIn("UNSUPPORTED", {e.code for e in result.errors})

    def test_rejects_unknown_table_type(self):
        result = self._create(
            table_type="nonexistent_table", code="test", name="Test",
            description="Test entry", usage_context="Test context",
        )
        self.assertIsNone(result.item)
        self.assertIn("INVALID", {e.code for e in result.errors})


class UpdateReferenceItemMutationTests(TestCase):
    """Tests for update_reference_item mutation."""

    def setUp(self):
        self.mutation = ManufacturingMutation()
        self.user = _create_manager_user()
        self.info = _make_info(self.user)
        self.cat = _create_category("role", "Role")
        self.rv = _create_value(self.cat, "operator")

    def _update(self, id, **kwargs):
        """Helper to call update_reference_item."""
        defaults = dict(description="", usage_context="")
        defaults.update(kwargs)
        return self.mutation.update_reference_item(
            self.info, id, ReferenceItemInput(**defaults)
        )

    def test_updates_reference_value_fields(self):
        result = self._update(
            str(self.rv.id),
            table_type="role", code="senior_operator", name="Senior Operator",
            description="Senior operator role", usage_context="Staff assignment",
        )
        self.assertIsNotNone(result.item)
        self.assertEqual(result.item.code, "senior_operator")
        self.assertEqual(result.item.name, "Senior Operator")
        self.rv.refresh_from_db()
        self.assertEqual(self.rv.code, "senior_operator")

    def test_rejects_system_managed_record_update(self):
        self.rv.is_system_managed = True
        self.rv.is_configurable = False
        self.rv.save()
        result = self._update(
            str(self.rv.id),
            table_type="role", code="changed", name="Changed",
            description="Changed description", usage_context="Changed context",
        )
        self.assertIsNone(result.item)
        self.assertIn("SYSTEM_MANAGED", {e.code for e in result.errors})

    def test_returns_not_found_for_nonexistent_id(self):
        result = self._update(
            "999999",
            table_type="role", code="test", name="Test",
            description="Test description", usage_context="Test context",
        )
        self.assertIsNone(result.item)
        self.assertIn("NOT_FOUND", {e.code for e in result.errors})

    def test_rejects_duplicate_code_on_update(self):
        _create_value(self.cat, "supervisor")
        result = self._update(
            str(self.rv.id),
            table_type="role", code="SUPERVISOR", name="Supervisor renamed",
            description="Supervisor role", usage_context="Staff assignment",
        )
        self.assertIsNone(result.item)
        self.assertIn("DUPLICATE", {e.code for e in result.errors})

    def test_allows_same_code_on_self_update(self):
        """Updating a record to its own code should not trigger duplicate."""
        result = self._update(
            str(self.rv.id),
            table_type="role", code="operator", name="Operator Updated",
            description="Updated operator role", usage_context="Staff assignment",
        )
        self.assertIsNotNone(result.item)
        self.assertEqual(result.item.name, "Operator Updated")


class DeactivateReferenceItemMutationTests(TestCase):
    """Tests for deactivate_reference_item mutation."""

    def setUp(self):
        self.mutation = ManufacturingMutation()
        self.user = _create_manager_user()
        self.info = _make_info(self.user)
        self.cat = _create_category("role", "Role")
        self.rv = _create_value(self.cat, "operator")

    def _deactivate(self, id):
        """Helper to call deactivate_reference_item."""
        return self.mutation.deactivate_reference_item(self.info, id)

    def test_deactivates_reference_value(self):
        self.assertTrue(self.rv.is_active)
        result = self._deactivate(str(self.rv.id))
        self.assertIsNotNone(result.item)
        self.rv.refresh_from_db()
        self.assertFalse(self.rv.is_active)

    def test_rejects_system_managed_record_deactivation(self):
        self.rv.is_system_managed = True
        self.rv.is_configurable = False
        self.rv.save()
        result = self._deactivate(str(self.rv.id))
        self.assertIn("SYSTEM_MANAGED", {e.code for e in result.errors})
        self.rv.refresh_from_db()
        self.assertTrue(self.rv.is_active)

    def test_returns_not_found_for_nonexistent_id(self):
        result = self._deactivate("999999")
        self.assertIn("NOT_FOUND", {e.code for e in result.errors})

    def test_handles_staff_user_deactivation(self):
        user = User.objects.create_user(
            username="testuser", password="pass12345", is_active=True,
        )
        result = self._deactivate(f"user:{user.id}")
        self.assertIsNotNone(result.item)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_staff_user_not_found_returns_error(self):
        result = self._deactivate("user:999999")
        self.assertIn("NOT_FOUND", {e.code for e in result.errors})


# ════════════════════════════════════════════════════════
#  Validation Unit Tests
# ════════════════════════════════════════════════════════

class ReferenceItemValidationTests(TestCase):
    """Tests for _validate_reference_item_input helper."""

    def setUp(self):
        self.cat = _create_category("role", "Role")

    def test_requires_code_for_standard_tables(self):
        errors = _validate_reference_item_input(ReferenceItemInput(
            table_type="role", code="", name="Test", description="Test", usage_context="Test",
        ))
        self.assertIn("REQUIRED", {e.code for e in errors})
        self.assertIn("code", {e.field for e in errors})

    def test_does_not_require_code_for_staff_user(self):
        errors = _validate_reference_item_input(ReferenceItemInput(
            table_type="staff_user", code="", name="Test", description="Test", usage_context="Test",
        ))
        codes = {e.code for e in errors}
        self.assertNotIn("REQUIRED", codes)  # staff_user validation is different

    def test_valid_return_empty_for_good_input(self):
        errors = _validate_reference_item_input(ReferenceItemInput(
            table_type="role",
            code="engineer",
            name="Engineer",
            description="Engineering role",
            usage_context="Staff assignment",
        ))
        self.assertEqual(errors, [])

    def test_detects_duplicate_case_insensitive(self):
        _create_value(self.cat, "operator")
        errors = _validate_reference_item_input(ReferenceItemInput(
            table_type="role", code="OPERATOR", name="Operator", description="Test", usage_context="Test",
        ))
        self.assertIn("DUPLICATE", {e.code for e in errors})

    def test_skips_duplicate_check_when_updating_same_record(self):
        rv = _create_value(self.cat, "operator")
        errors = _validate_reference_item_input(ReferenceItemInput(
            table_type="role", code="operator", name="Operator Updated",
            description="Test", usage_context="Test",
        ), current_id=str(rv.id))
        self.assertEqual(errors, [])
