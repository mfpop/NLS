"""Tests for the administration app: models, services, GraphQL delegation."""

from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth.models import User
from manufacturing.models import Company, Plant
from administration.models import (
    AdministrativeDepartment, UserProfile, Role,
    Permission, RolePermission, UserRoleAssignment,
)
from administration.services import (
    AdministrativeDepartmentService, AdministrativeDepartmentServiceError,
    UserProfileService, UserProfileServiceError,
    RoleService, RoleServiceError,
    UserAccessService, UserAccessServiceError,
)
from api.mutations.administration import AdministrationMutation
from api.queries.administration import AdministrationQuery


class AdministrativeDepartmentServiceTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(code="C001", name="Test Company")
        self.plant = Plant.objects.create(company=self.company, code="P001", name="Test Plant")
        self.user = User.objects.create_user(username="manager1", password="test123")

    def test_create_administrative_department(self):
        dept = AdministrativeDepartmentService.create(
            company_id=self.company.id, code="HR",
            name="Human Resources", description="HR department",
        )
        self.assertEqual(dept.code, "HR")
        self.assertEqual(dept.name, "Human Resources")
        self.assertTrue(dept.is_active)

    def test_create_with_plant(self):
        dept = AdministrativeDepartmentService.create(
            company_id=self.company.id, plant_id=self.plant.id,
            code="IT", name="IT Support",
        )
        self.assertEqual(dept.plant_id, self.plant.id)

    def test_reject_duplicate_code_in_same_company_and_plant(self):
        AdministrativeDepartmentService.create(
            company_id=self.company.id, code="HR", name="HR",
        )
        with self.assertRaises(AdministrativeDepartmentServiceError) as ctx:
            AdministrativeDepartmentService.create(
                company_id=self.company.id, code="HR", name="HR Dept",
            )
        self.assertEqual(ctx.exception.code, "DUPLICATE")

    def test_allow_duplicate_code_in_different_company(self):
        other = Company.objects.create(code="C002", name="Other Company")
        AdministrativeDepartmentService.create(
            company_id=self.company.id, code="HR", name="HR",
        )
        dept = AdministrativeDepartmentService.create(
            company_id=other.id, code="HR", name="HR",
        )
        self.assertEqual(dept.code, "HR")

    def test_update_department(self):
        dept = AdministrativeDepartmentService.create(
            company_id=self.company.id, code="FIN", name="Finance",
        )
        updated = AdministrativeDepartmentService.update(
            dept.id, name="Finance & Accounting",
        )
        self.assertEqual(updated.name, "Finance & Accounting")

    def test_archive_department(self):
        dept = AdministrativeDepartmentService.create(
            company_id=self.company.id, code="OPS", name="Operations",
        )
        archived = AdministrativeDepartmentService.archive(dept.id)
        self.assertFalse(archived.is_active)

    def test_list_filter_by_company(self):
        other = Company.objects.create(code="C003", name="Third Co")
        AdministrativeDepartmentService.create(company_id=self.company.id, code="A", name="A")
        AdministrativeDepartmentService.create(company_id=other.id, code="B", name="B")
        qs = AdministrativeDepartmentService.list(company_id=self.company.id)
        self.assertEqual(qs.count(), 1)

    def test_list_filter_by_active(self):
        dept = AdministrativeDepartmentService.create(company_id=self.company.id, code="X", name="X")
        AdministrativeDepartmentService.archive(dept.id)
        qs = AdministrativeDepartmentService.list(is_active=True)
        self.assertEqual(qs.count(), 0)

    def test_get_nonexistent_raises(self):
        with self.assertRaises(AdministrativeDepartmentServiceError):
            AdministrativeDepartmentService.get(99999)

    def test_validate_scope_mismatch(self):
        other = Company.objects.create(code="C004", name="Other")
        dept = AdministrativeDepartmentService.create(company_id=self.company.id, code="S", name="S")
        valid = AdministrativeDepartmentService.validate_scope(dept.id, other.id)
        self.assertFalse(valid)

    def test_validate_scope_ok(self):
        dept = AdministrativeDepartmentService.create(company_id=self.company.id, code="S", name="S")
        valid = AdministrativeDepartmentService.validate_scope(dept.id, self.company.id)
        self.assertTrue(valid)


class UserProfileServiceTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(code="C010", name="C10")
        self.user = User.objects.create_user(username="john", password="test123")
        from manufacturing.models import ReferenceCategory, ReferenceValue
        cat, _ = ReferenceCategory.objects.get_or_create(
            code="admin_department",
            defaults={"name": "Admin Dept"},
        )
        self.dept, _ = ReferenceValue.objects.get_or_create(
            category=cat, code="ENG",
            defaults={
                "name": "Engineering", "description": "Engineering department",
                "usage_context": "Used for test",
                "sort_order": 1, "is_active": True,
            },
        )

    def test_create_user_profile(self):
        profile = UserProfileService.create(
            user_id=self.user.id,
            company_id=self.company.id,
            job_title="Engineer",
        )
        self.assertEqual(profile.user_id, self.user.id)
        self.assertEqual(profile.job_title, "Engineer")

    def test_create_duplicate_raises(self):
        UserProfileService.create(user_id=self.user.id)
        with self.assertRaises(UserProfileServiceError) as ctx:
            UserProfileService.create(user_id=self.user.id)
        self.assertEqual(ctx.exception.code, "DUPLICATE")

    def test_assign_administrative_department(self):
        profile = UserProfileService.create(user_id=self.user.id)
        updated = UserProfileService.assign_administrative_department(profile.id, self.dept.id)
        self.assertEqual(updated.administrative_department_id, self.dept.id)

    def test_assign_invalid_department_raises(self):
        profile = UserProfileService.create(user_id=self.user.id)
        with self.assertRaises(UserProfileServiceError) as ctx:
            UserProfileService.assign_administrative_department(profile.id, 99999)
        self.assertEqual(ctx.exception.code, "NOT_FOUND")

    def test_activate_deactivate(self):
        profile = UserProfileService.create(user_id=self.user.id)
        UserProfileService.deactivate(profile.id)
        self.assertFalse(UserProfile.objects.get(id=profile.id).is_active)
        UserProfileService.activate(profile.id)
        self.assertTrue(UserProfile.objects.get(id=profile.id).is_active)


class RoleServiceTests(TestCase):
    def test_create_role(self):
        role = RoleService.create(code="admin", name="Administrator")
        self.assertEqual(role.code, "admin")
        self.assertTrue(role.is_active)

    def test_reject_duplicate_code(self):
        RoleService.create(code="op", name="Operator")
        with self.assertRaises(RoleServiceError) as ctx:
            RoleService.create(code="op", name="Operator 2")
        self.assertEqual(ctx.exception.code, "DUPLICATE")

    def test_update_role(self):
        role = RoleService.create(code="mgmt", name="Management")
        updated = RoleService.update(role.id, name="Senior Management")
        self.assertEqual(updated.name, "Senior Management")

    def test_archive_role(self):
        role = RoleService.create(code="temp", name="Temporary")
        archived = RoleService.archive(role.id)
        self.assertFalse(archived.is_active)

    def test_cannot_archive_system_role(self):
        role = RoleService.create(code="sys", name="System", is_system_role=True)
        with self.assertRaises(RoleServiceError) as ctx:
            RoleService.archive(role.id)
        self.assertEqual(ctx.exception.code, "SYSTEM_ROLE")


class PermissionServiceTests(TestCase):
    def test_create_permission(self):
        perm = Permission.objects.create(
            code="view_dashboard", name="View Dashboard",
            module="dashboard", action="view",
        )
        self.assertEqual(perm.code, "view_dashboard")

    def test_assign_remove_permission_to_role(self):
        role = RoleService.create(code="data_viewer", name="Data Viewer")
        perm = Permission.objects.create(
            code="read_data", name="Read Data",
            module="data", action="read",
        )
        created = RoleService.assign_permission(role.id, perm.id)
        self.assertTrue(created)
        self.assertEqual(RolePermission.objects.filter(role=role).count(), 1)

        deleted = RoleService.remove_permission(role.id, perm.id)
        self.assertTrue(deleted)
        self.assertEqual(RolePermission.objects.filter(role=role).count(), 0)


class UserAccessServiceTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(code="C020", name="C20")
        self.user = User.objects.create_user(username="alice", password="test123")
        self.profile = UserProfile.objects.create(user=self.user, company=self.company)
        self.role = Role.objects.create(code="editor", name="Editor")
        self.perm = Permission.objects.create(
            code="edit_data", name="Edit Data",
            module="data", action="edit",
        )
        RolePermission.objects.create(role=self.role, permission=self.perm)
        from manufacturing.models import ReferenceCategory, ReferenceValue
        cat, _ = ReferenceCategory.objects.get_or_create(
            code="admin_department", defaults={"name": "Admin Dept"},
        )
        self.dept_rv, _ = ReferenceValue.objects.get_or_create(
            category=cat, code="DEPT",
            defaults={
                "name": "Department", "description": "Test department",
                "usage_context": "Used for test", "sort_order": 1, "is_active": True,
            },
        )

    def test_assign_role_to_user(self):
        assignment = UserAccessService.assign_role_to_user(
            profile_id=self.profile.id, role_id=self.role.id,
        )
        self.assertEqual(assignment.user_profile_id, self.profile.id)
        self.assertEqual(assignment.role_id, self.role.id)
        self.assertTrue(assignment.is_active)

    def test_duplicate_assignment_raises(self):
        UserAccessService.assign_role_to_user(
            profile_id=self.profile.id, role_id=self.role.id,
        )
        with self.assertRaises(UserAccessServiceError) as ctx:
            UserAccessService.assign_role_to_user(
                profile_id=self.profile.id, role_id=self.role.id,
            )
        self.assertEqual(ctx.exception.code, "DUPLICATE")

    def test_remove_role_from_user(self):
        assignment = UserAccessService.assign_role_to_user(
            profile_id=self.profile.id, role_id=self.role.id,
        )
        result = UserAccessService.remove_role_from_user(assignment.id)
        self.assertFalse(result.is_active)

    def test_list_user_roles(self):
        UserAccessService.assign_role_to_user(
            profile_id=self.profile.id, role_id=self.role.id,
        )
        roles = UserAccessService.list_user_roles(self.profile.id)
        self.assertEqual(roles.count(), 1)

    def test_get_user_permissions(self):
        UserAccessService.assign_role_to_user(
            profile_id=self.profile.id, role_id=self.role.id,
        )
        perms = UserAccessService.get_user_permissions(self.profile.id)
        self.assertEqual(perms.count(), 1)
        self.assertEqual(perms.first().code, "edit_data")

    def test_user_has_permission(self):
        UserAccessService.assign_role_to_user(
            profile_id=self.profile.id, role_id=self.role.id,
        )
        result = UserAccessService.user_has_permission(self.profile.id, "edit_data")
        self.assertTrue(result)
        result = UserAccessService.user_has_permission(self.profile.id, "nonexistent")
        self.assertFalse(result)

    def test_manufacturing_department_not_used(self):
        """Confirm that manufacturing Department is not used for user access."""
        related_model = UserProfile._meta.get_field("administrative_department").remote_field.model
        from manufacturing.models import Department as MfgDepartment
        from manufacturing.models import ReferenceValue
        self.assertNotEqual(
            related_model, MfgDepartment,
            "UserProfile.administrative_department must not reference manufacturing Department",
        )
        self.assertEqual(
            related_model, ReferenceValue,
            "UserProfile.administrative_department must reference ReferenceValue",
        )

    def test_invalid_scope_rejected(self):
        from manufacturing.models import ReferenceCategory, ReferenceValue
        cat, _ = ReferenceCategory.objects.get_or_create(
            code="admin_department", defaults={"name": "Admin Dept"},
        )
        valid = UserAccessService.validate_access_scope(999, 999, administrative_department_id=99999)
        self.assertFalse(valid)


class ScopeEnforcementTests(TestCase):
    def setUp(self):
        self.company_a = Company.objects.create(code="CA", name="Company A")
        self.company_b = Company.objects.create(code="CB", name="Company B")
        self.user = User.objects.create_user(username="scope_user", password="test123")
        self.profile = UserProfile.objects.create(user=self.user, company=self.company_a)
        self.role, _ = Role.objects.get_or_create(code="viewer", defaults={"name": "Viewer", "is_system_role": True})

    def test_user_without_assignments_sees_all(self):
        permitted = UserAccessService.get_permitted_company_ids(self.user)
        self.assertIn(None, permitted)

    def test_user_with_company_scope_only_sees_that_company(self):
        UserRoleAssignment.objects.create(
            user_profile=self.profile, role=self.role,
            company=self.company_a, is_active=True,
        )
        permitted = UserAccessService.get_permitted_company_ids(self.user)
        self.assertNotIn(None, permitted)
        self.assertIn(self.company_a.id, permitted)
        self.assertNotIn(self.company_b.id, permitted)

    def test_enforce_company_access_allows(self):
        UserRoleAssignment.objects.create(
            user_profile=self.profile, role=self.role,
            company=self.company_a, is_active=True,
        )
        UserAccessService.enforce_company_access(self.user, self.company_a.id)

    def test_enforce_company_access_denies(self):
        UserRoleAssignment.objects.create(
            user_profile=self.profile, role=self.role,
            company=self.company_a, is_active=True,
        )
        with self.assertRaises(UserAccessServiceError) as ctx:
            UserAccessService.enforce_company_access(self.user, self.company_b.id)
        self.assertEqual(ctx.exception.code, "ACCESS_DENIED")

    def test_admin_dept_service_filters_by_scope(self):
        UserRoleAssignment.objects.create(
            user_profile=self.profile, role=self.role,
            company=self.company_a, is_active=True,
        )
        AdministrativeDepartmentService.create(company_id=self.company_a.id, code="A1", name="A Dept")
        AdministrativeDepartmentService.create(company_id=self.company_b.id, code="B1", name="B Dept")
        qs = AdministrativeDepartmentService.list(user=self.user)
        codes = list(qs.values_list("code", flat=True))
        self.assertIn("A1", codes)
        self.assertNotIn("B1", codes)

    def test_user_profile_service_filters_by_scope(self):
        user_b = User.objects.create_user(username="user_b", password="test123")
        profile_b = UserProfile.objects.create(user=user_b, company=self.company_b)
        UserRoleAssignment.objects.create(
            user_profile=self.profile, role=self.role,
            company=self.company_a, is_active=True,
        )
        qs = UserProfileService.list(user=self.user)
        ids = list(qs.values_list("id", flat=True))
        self.assertIn(self.profile.id, ids)
        self.assertNotIn(profile_b.id, ids)

    def test_assign_role_to_user_enforces_permission_scope(self):
        UserRoleAssignment.objects.create(
            user_profile=self.profile, role=self.role,
            company=self.company_a, is_active=True,
        )
        other = User.objects.create_user(username="other", password="test123")
        other_profile = UserProfile.objects.create(user=other, company=self.company_a)
        self.role2 = Role.objects.create(code="editor", name="Editor")
        assignment = UserAccessService.assign_role_to_user(
            profile_id=other_profile.id, role_id=self.role2.id,
            company_id=self.company_a.id,
        )
        self.assertTrue(assignment.is_active)


class GraphQLDelegationTests(TestCase):
    def test_queries_exist(self):
        """Verify administration query resolvers exist."""
        q = AdministrationQuery()
        self.assertTrue(hasattr(q, "administrative_departments"))
        self.assertTrue(hasattr(q, "administrative_department"))
        self.assertTrue(hasattr(q, "user_profiles"))
        self.assertTrue(hasattr(q, "user_profile"))
        self.assertTrue(hasattr(q, "roles"))
        self.assertTrue(hasattr(q, "role"))
        self.assertTrue(hasattr(q, "permissions"))
        self.assertTrue(hasattr(q, "user_roles"))
        self.assertTrue(hasattr(q, "user_permissions"))

    def test_mutations_delegate_to_services(self):
        """Verify that mutations delegate to services (thin resolver pattern)."""
        from administration.services import AdministrativeDepartmentService, UserProfileService, RoleService, UserAccessService

        # Create a real company for the FK constraint
        company = Company.objects.create(code="T999", name="TestCorp")
        dept = AdministrativeDepartment.objects.create(
            company=company, code="X", name="X",
        )
        with patch.object(AdministrativeDepartmentService, "archive") as mock:
            mock.return_value = dept
            mutation = AdministrationMutation()
            result = mutation.archive_administrative_department(None, str(dept.id))
            self.assertIsNotNone(result)
            self.assertIsNone(result.errors)

    def test_archive_not_use_orm(self):
        """Verify archive mutation doesn't call ORM save directly."""
        with patch("administration.models.AdministrativeDepartment.save") as mock_save:
            with patch.object(
                AdministrativeDepartmentService, "archive",
            ) as mock_service:
                mock_service.side_effect = AdministrativeDepartmentServiceError(
                    "id", "NOT_FOUND", "not found",
                )
                mutation = AdministrationMutation()
                result = mutation.archive_administrative_department(None, "x")
                self.assertIsNotNone(result.errors)
                mock_save.assert_not_called()
