"""
Integration tests for reference item GraphQL mutations using the Django test client.

Verifies that HTTP GraphQL requests flow correctly through the resolver to the
service layer and persist data to the database. Uses real HTTP requests against
the /graphql/ endpoint with JWT authentication.

Covers all three reference item mutations:
- createReferenceItem  →  ReferenceTableRecordService.create
- updateReferenceItem  →  ReferenceTableRecordService.update
- deactivateReferenceItem  →  ReferenceTableRecordService.deactivate
"""

import json

from django.contrib.auth.models import User
from django.test import Client, TestCase

from api.auth_utils import encode_jwt
from manufacturing.domain.reference_table_service import ReferenceTableRecordService
from manufacturing.models import ReferenceCategory, ReferenceValue, UserRole


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


def _graphql_post(client: Client, query: str, variables: dict | None = None) -> dict:
    """Helper: POST a GraphQL query/mutation and return the parsed JSON response."""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    response = client.post(
        "/graphql/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    return response.json()


# ── GraphQL mutation strings (reuse across tests) ──

CREATE_MUTATION = """
mutation CreateItem($input: ReferenceItemInput!) {
    createReferenceItem(input: $input) {
        item {
            id
            tableType
            code
            name
            description
            usageContext
            isActive
            sortOrder
            isSystemManaged
            isConfigurable
        }
        errors { field code message }
    }
}
"""

UPDATE_MUTATION = """
mutation UpdateItem($id: String!, $input: ReferenceItemInput!) {
    updateReferenceItem(id: $id, input: $input) {
        item {
            id
            tableType
            code
            name
            description
            usageContext
            isActive
            sortOrder
        }
        errors { field code message }
    }
}
"""

DEACTIVATE_MUTATION = """
mutation DeactivateItem($id: String!) {
    deactivateReferenceItem(id: $id) {
        item {
            id
            isActive
        }
        errors { field code message }
    }
}
"""


# ════════════════════════════════════════════════════════════
#  Auth Helpers
# ════════════════════════════════════════════════════════════

def _auth_client(role: str = "dept_manager") -> tuple[Client, User]:
    """Create an authenticated Django test client with a user of the given role.

    Returns (client, user) tuple.
    """
    user = User.objects.create_user(
        username=f"test_{role}",
        password="testpass",
        is_active=True,
    )
    UserRole.objects.create(user=user, role=role)
    token = encode_jwt(user.id, role)
    client = Client(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client, user


# ════════════════════════════════════════════════════════════
#  createReferenceItem Integration Tests
# ════════════════════════════════════════════════════════════

class CreateReferenceItemIntegrationTests(TestCase):
    """Integration tests for createReferenceItem GraphQL mutation."""

    def setUp(self):
        self.cat = _create_category("role", "Role")
        self.client, self.user = _auth_client()

    # ── Happy path ──

    def test_creates_reference_item_successfully(self):
        result = _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "role",
                "code": "engineer",
                "name": "Engineer",
                "description": "Engineering role",
                "usageContext": "Staff assignment",
            },
        })
        item = result["data"]["createReferenceItem"]["item"]
        self.assertEqual(item["code"], "engineer")
        self.assertEqual(item["name"], "Engineer")
        self.assertEqual(item["tableType"], "role")
        self.assertTrue(item["isActive"])
        self.assertIsNotNone(item["id"])

    def test_creates_persists_to_database(self):
        result = _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "role",
                "code": "engineer",
                "name": "Engineer",
                "description": "Engineering role",
                "usageContext": "Staff assignment",
            },
        })
        item_id = result["data"]["createReferenceItem"]["item"]["id"]
        self.assertTrue(ReferenceValue.objects.filter(id=item_id).exists())

    def test_creates_with_optional_fields(self):
        result = _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "role",
                "code": "senior_engineer",
                "name": "Senior Engineer",
                "description": "Senior engineering role",
                "usageContext": "Advanced staff assignment",
                "isActive": False,
                "sortOrder": 5,
            },
        })
        item = result["data"]["createReferenceItem"]["item"]
        self.assertEqual(item["code"], "senior_engineer")
        self.assertFalse(item["isActive"])
        self.assertEqual(item["sortOrder"], 5)

    # ── Validation error paths ──

    def test_validation_error_empty_code(self):
        result = _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "role",
                "code": "",
                "name": "Engineer",
                "description": "Engineering role",
                "usageContext": "Staff assignment",
            },
        })
        errors = result["data"]["createReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["field"], "code")
        self.assertEqual(errors[0]["code"], "REQUIRED")

    def test_validation_error_duplicate_code(self):
        _create_value(self.cat, "engineer")
        result = _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "role",
                "code": "engineer",
                "name": "Engineer",
                "description": "Engineering role",
                "usageContext": "Staff assignment",
            },
        })
        errors = result["data"]["createReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "DUPLICATE")

    def test_validation_error_unknown_table_type(self):
        result = _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "nonexistent_table_xyz",
                "code": "test",
                "name": "Test",
                "description": "Test",
                "usageContext": "Test",
            },
        })
        errors = result["data"]["createReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "INVALID")

    def test_no_records_created_on_validation_error(self):
        before_count = ReferenceValue.objects.count()
        _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "role",
                "code": "",
                "name": "Engineer",
                "description": "Test",
                "usageContext": "Test",
            },
        })
        self.assertEqual(ReferenceValue.objects.count(), before_count)

    # ── Auth error paths ──

    def test_unauthenticated_request_returns_error(self):
        anon_client = Client()
        result = _graphql_post(anon_client, CREATE_MUTATION, {
            "input": {
                "tableType": "role",
                "code": "engineer",
                "name": "Engineer",
                "description": "Engineering role",
                "usageContext": "Staff assignment",
            },
        })
        # Unauthenticated → should return GraphQL error (not data)
        self.assertIsNotNone(result.get("errors"))

    def test_unauthorized_role_returns_error(self):
        guest_client, _ = _auth_client("guest")
        result = _graphql_post(guest_client, CREATE_MUTATION, {
            "input": {
                "tableType": "role",
                "code": "engineer",
                "name": "Engineer",
                "description": "Engineering role",
                "usageContext": "Staff assignment",
            },
        })
        # Guest does not have manage_reference_values permission
        self.assertIsNotNone(result.get("errors"))

    def test_staff_user_table_type_rejected(self):
        result = _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "staff_user",
                "code": "",
                "name": "Test User",
                "description": "",
                "usageContext": "",
            },
        })
        errors = result["data"]["createReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "UNSUPPORTED")

    def test_staff_assignment_table_type_rejected(self):
        result = _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "staff_assignment",
                "code": "",
                "name": "Test Assignment",
                "description": "",
                "usageContext": "Manager role",
            },
        })
        errors = result["data"]["createReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "UNSUPPORTED")


# ════════════════════════════════════════════════════════════
#  updateReferenceItem Integration Tests
# ════════════════════════════════════════════════════════════

class UpdateReferenceItemIntegrationTests(TestCase):
    """Integration tests for updateReferenceItem GraphQL mutation."""

    def setUp(self):
        self.cat = _create_category("role", "Role")
        self.rv = _create_value(self.cat, "operator")
        self.client, self.user = _auth_client()

    # ── Happy path ──

    def test_updates_reference_item_successfully(self):
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "senior_operator",
                "name": "Senior Operator",
                "description": "Senior operator role",
                "usageContext": "Advanced staff assignment",
            },
        })
        item = result["data"]["updateReferenceItem"]["item"]
        self.assertEqual(item["code"], "senior_operator")
        self.assertEqual(item["name"], "Senior Operator")

    def test_updates_persist_to_database(self):
        _graphql_post(self.client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "senior_operator",
                "name": "Senior Operator",
                "description": "Updated description",
                "usageContext": "Updated context",
            },
        })
        self.rv.refresh_from_db()
        self.assertEqual(self.rv.code, "senior_operator")
        self.assertEqual(self.rv.name, "Senior Operator")

    def test_update_preserves_other_records(self):
        other_rv = _create_value(self.cat, "supervisor")
        _graphql_post(self.client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "senior_operator",
                "name": "Senior Operator",
                "description": "Updated",
                "usageContext": "Updated",
            },
        })
        other_rv.refresh_from_db()
        self.assertEqual(other_rv.code, "supervisor")
        self.assertTrue(other_rv.is_active)

    def test_update_deactivates_with_is_active_false(self):
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "operator",
                "name": "Operator",
                "description": "Test",
                "usageContext": "Test",
                "isActive": False,
            },
        })
        item = result["data"]["updateReferenceItem"]["item"]
        self.assertFalse(item["isActive"])

    # ── Validation error paths ──

    def test_update_validation_error_duplicate_code(self):
        other = _create_value(self.cat, "supervisor")
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": str(other.id),
            "input": {
                "tableType": "role",
                "code": "operator",  # same as self.rv.code
                "name": "Supervisor",
                "description": "Test",
                "usageContext": "Test",
            },
        })
        errors = result["data"]["updateReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "DUPLICATE")

    def test_update_validation_error_empty_code(self):
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "",
                "name": "Operator",
                "description": "Test",
                "usageContext": "Test",
            },
        })
        errors = result["data"]["updateReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "REQUIRED")

    # ── Not-found error ──

    def test_update_nonexistent_id_returns_not_found(self):
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": "999999",
            "input": {
                "tableType": "role",
                "code": "test",
                "name": "Test",
                "description": "Test",
                "usageContext": "Test",
            },
        })
        errors = result["data"]["updateReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "NOT_FOUND")

    # ── System-managed rejection ──

    def test_update_system_managed_returns_error(self):
        self.rv.is_system_managed = True
        self.rv.save()
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "changed",
                "name": "Changed",
                "description": "Changed",
                "usageContext": "Changed",
            },
        })
        errors = result["data"]["updateReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "SYSTEM_MANAGED")

    def test_update_system_managed_does_not_modify(self):
        original_code = self.rv.code
        self.rv.is_system_managed = True
        self.rv.save()
        _graphql_post(self.client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "changed",
                "name": "Changed",
                "description": "Changed",
                "usageContext": "Changed",
            },
        })
        self.rv.refresh_from_db()
        self.assertEqual(self.rv.code, original_code)

    # ── Auth error paths ──

    def test_update_unauthenticated_returns_error(self):
        anon_client = Client()
        result = _graphql_post(anon_client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "changed",
                "name": "Changed",
                "description": "Test",
                "usageContext": "Test",
            },
        })
        self.assertIsNotNone(result.get("errors"))

    def test_update_unauthorized_role_returns_error(self):
        guest_client, _ = _auth_client("guest")
        result = _graphql_post(guest_client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "changed",
                "name": "Changed",
                "description": "Test",
                "usageContext": "Test",
            },
        })
        self.assertIsNotNone(result.get("errors"))


# ════════════════════════════════════════════════════════════
#  deactivateReferenceItem Integration Tests
# ════════════════════════════════════════════════════════════

class DeactivateReferenceItemIntegrationTests(TestCase):
    """Integration tests for deactivateReferenceItem GraphQL mutation."""

    def setUp(self):
        self.cat = _create_category("role", "Role")
        self.rv = _create_value(self.cat, "operator")
        self.client, self.user = _auth_client()

    # ── Happy path ──

    def test_deactivates_reference_item_successfully(self):
        result = _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": str(self.rv.id),
        })
        item = result["data"]["deactivateReferenceItem"]["item"]
        self.assertFalse(item["isActive"])

    def test_deactivation_persists_to_database(self):
        _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": str(self.rv.id),
        })
        self.rv.refresh_from_db()
        self.assertFalse(self.rv.is_active)

    def test_deactivation_does_not_delete_record(self):
        before_count = ReferenceValue.objects.count()
        _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": str(self.rv.id),
        })
        self.assertEqual(ReferenceValue.objects.count(), before_count)

    # ── Not-found error ──

    def test_deactivate_nonexistent_id_returns_not_found(self):
        result = _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": "999999",
        })
        errors = result["data"]["deactivateReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "NOT_FOUND")

    def test_no_records_deactivated_on_not_found_error(self):
        active_count = ReferenceValue.objects.filter(is_active=True).count()
        _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": "999999",
        })
        self.assertEqual(
            ReferenceValue.objects.filter(is_active=True).count(),
            active_count,
        )

    # ── System-managed rejection ──

    def test_deactivate_system_managed_returns_error(self):
        self.rv.is_system_managed = True
        self.rv.save()
        result = _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": str(self.rv.id),
        })
        errors = result["data"]["deactivateReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "SYSTEM_MANAGED")

    def test_deactivate_system_managed_does_not_deactivate(self):
        self.rv.is_system_managed = True
        self.rv.save()
        _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": str(self.rv.id),
        })
        self.rv.refresh_from_db()
        self.assertTrue(self.rv.is_active)

    def test_deactivate_non_configurable_returns_error(self):
        self.rv.is_configurable = False
        self.rv.save()
        result = _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": str(self.rv.id),
        })
        errors = result["data"]["deactivateReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "SYSTEM_MANAGED")

    # ── Auth error paths ──

    def test_deactivate_unauthenticated_returns_error(self):
        anon_client = Client()
        result = _graphql_post(anon_client, DEACTIVATE_MUTATION, {
            "id": str(self.rv.id),
        })
        self.assertIsNotNone(result.get("errors"))

    def test_deactivate_unauthorized_role_returns_error(self):
        guest_client, _ = _auth_client("guest")
        result = _graphql_post(guest_client, DEACTIVATE_MUTATION, {
            "id": str(self.rv.id),
        })
        self.assertIsNotNone(result.get("errors"))


# ════════════════════════════════════════════════════════════
#  Staff user / assignment integration tests
# ════════════════════════════════════════════════════════════

class StaffUserUpdateIntegrationTests(TestCase):
    """Integration tests for staff user update via updateReferenceItem."""

    def setUp(self):
        self.client, self.user = _auth_client()

    def test_updates_staff_user_name(self):
        staff_user = User.objects.create_user(
            username="staff1", password="testpass",
            first_name="Original", is_active=True,
            email="staff@plant.com",
        )
        UserRole.objects.create(user=staff_user, role="supervisor")
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": f"user:{staff_user.id}",
            "input": {
                "tableType": "staff_user",
                "code": "staff1",
                "name": "Updated Staff",
                "description": "Test",
                "usageContext": "Test",
            },
        })
        item = result["data"]["updateReferenceItem"]["item"]
        self.assertIsNotNone(item)
        staff_user.refresh_from_db()
        self.assertIn("Updated", staff_user.get_full_name())

    def test_updates_staff_user_email(self):
        staff_user = User.objects.create_user(
            username="staff2", password="testpass",
            is_active=True, email="old@plant.com",
        )
        UserRole.objects.create(user=staff_user, role="supervisor")
        _graphql_post(self.client, UPDATE_MUTATION, {
            "id": f"user:{staff_user.id}",
            "input": {
                "tableType": "staff_user",
                "code": "staff2",
                "name": "Staff Two",
                "description": "Test",
                "usageContext": "Test",
                "email": "new@plant.com",
            },
        })
        staff_user.refresh_from_db()
        self.assertEqual(staff_user.email, "new@plant.com")

    def test_deactivates_staff_user(self):
        staff_user = User.objects.create_user(
            username="staff3", password="testpass",
            is_active=True,
        )
        UserRole.objects.create(user=staff_user, role="supervisor")
        result = _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": f"user:{staff_user.id}",
        })
        item = result["data"]["deactivateReferenceItem"]["item"]
        self.assertFalse(item["isActive"])
        staff_user.refresh_from_db()
        self.assertFalse(staff_user.is_active)

    def test_staff_user_not_found_returns_error(self):
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": "user:999999",
            "input": {
                "tableType": "staff_user",
                "code": "test",
                "name": "Test",
                "description": "Test",
                "usageContext": "Test",
            },
        })
        errors = result["data"]["updateReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "NOT_FOUND")


class StaffAssignmentUpdateIntegrationTests(TestCase):
    """Integration tests for staff assignment update via updateReferenceItem."""

    def setUp(self):
        self.client, self.user = _auth_client()

    def test_updates_staff_assignment_role(self):
        staff_user = User.objects.create_user(
            username="assign1", password="testpass",
            first_name="Assign", is_active=True,
        )
        role = UserRole.objects.create(
            user=staff_user, role="supervisor",
            department="Assembly", plant="Main Plant",
        )
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": f"user_role:{role.id}",
            "input": {
                "tableType": "staff_assignment",
                "code": "assign1",
                "name": "Assign Updated",
                "description": "Test",
                "usageContext": "Test assignment",
                "role": "dept_manager",
                "department": "Quality",
                "plant": "Secondary Plant",
            },
        })
        item = result["data"]["updateReferenceItem"]["item"]
        self.assertIsNotNone(item)
        role.refresh_from_db()
        self.assertEqual(role.role, "dept_manager")
        self.assertEqual(role.department, "Quality")
        self.assertEqual(role.plant, "Secondary Plant")

    def test_deactivates_staff_assignment(self):
        staff_user = User.objects.create_user(
            username="assign2", password="testpass",
            first_name="Assign Two", is_active=True,
        )
        role = UserRole.objects.create(user=staff_user, role="supervisor")
        result = _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": f"user_role:{role.id}",
        })
        item = result["data"]["deactivateReferenceItem"]["item"]
        self.assertFalse(item["isActive"])
        staff_user.refresh_from_db()
        self.assertFalse(staff_user.is_active)

    def test_staff_assignment_not_found_returns_error(self):
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": "user_role:999999",
            "input": {
                "tableType": "staff_assignment",
                "code": "test",
                "name": "Test",
                "description": "Test",
                "usageContext": "Test assignment",
            },
        })
        errors = result["data"]["updateReferenceItem"]["errors"]
        self.assertIsNotNone(errors)
        self.assertEqual(errors[0]["code"], "NOT_FOUND")


# ════════════════════════════════════════════════════════════
#  Service delegation verification (mutation → service)
# ════════════════════════════════════════════════════════════

class ServiceDelegationIntegrationTests(TestCase):
    """Verify that mutations delegate to ReferenceTableRecordService methods
    rather than calling ORM directly."""

    def setUp(self):
        self.cat = _create_category("role", "Role")
        self.rv = _create_value(self.cat, "operator")
        self.client, self.user = _auth_client()

    def test_create_mutation_creates_db_record_through_service(self):
        """Creation goes through ReferenceTableRecordService.create → DB."""
        before = ReferenceValue.objects.filter(category=self.cat).count()
        _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "role",
                "code": "engineer",
                "name": "Engineer",
                "description": "Engineering role",
                "usageContext": "Staff assignment",
            },
        })
        after = ReferenceValue.objects.filter(category=self.cat).count()
        self.assertEqual(after, before + 1)

    def test_update_mutation_modifies_db_through_service(self):
        """Update goes through ReferenceTableRecordService.update → DB."""
        _graphql_post(self.client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "senior_operator",
                "name": "Senior Operator",
                "description": "Updated",
                "usageContext": "Updated",
            },
        })
        self.rv.refresh_from_db()
        self.assertEqual(self.rv.code, "senior_operator")

    def test_deactivate_mutation_modifies_db_through_service(self):
        """Deactivate goes through ReferenceTableRecordService.deactivate → DB."""
        _graphql_post(self.client, DEACTIVATE_MUTATION, {
            "id": str(self.rv.id),
        })
        self.rv.refresh_from_db()
        self.assertFalse(self.rv.is_active)

    def test_create_returns_item_with_expected_fields(self):
        result = _graphql_post(self.client, CREATE_MUTATION, {
            "input": {
                "tableType": "role",
                "code": "engineer",
                "name": "Engineer",
                "description": "Engineering role",
                "usageContext": "Staff assignment",
            },
        })
        item = result["data"]["createReferenceItem"]["item"]
        self.assertIn("id", item)
        self.assertIn("code", item)
        self.assertIn("name", item)
        self.assertIn("isActive", item)
        self.assertIn("isSystemManaged", item)
        self.assertIn("isConfigurable", item)
        self.assertFalse(item["isSystemManaged"])
        self.assertTrue(item["isConfigurable"])

    def test_update_returns_errors_no_item_on_not_found(self):
        result = _graphql_post(self.client, UPDATE_MUTATION, {
            "id": "999999",
            "input": {
                "tableType": "role",
                "code": "test",
                "name": "Test",
                "description": "Test",
                "usageContext": "Test",
            },
        })
        data = result["data"]["updateReferenceItem"]
        self.assertIsNone(data["item"])
        self.assertIsNotNone(data["errors"])

    def test_data_not_modified_when_mutation_returns_error(self):
        original_code = self.rv.code
        self.rv.is_system_managed = True
        self.rv.save()
        _graphql_post(self.client, UPDATE_MUTATION, {
            "id": str(self.rv.id),
            "input": {
                "tableType": "role",
                "code": "changed",
                "name": "Changed",
                "description": "Changed",
                "usageContext": "Changed",
            },
        })
        self.rv.refresh_from_db()
        self.assertEqual(self.rv.code, original_code)
        self.assertTrue(self.rv.is_active)
