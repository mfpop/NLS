from django.db import models, transaction
from django.contrib.auth.models import User
from .models import (
    AdministrativeDepartment, UserProfile, Role,
    Permission, RolePermission, UserRoleAssignment,
)


def _assign_default_viewer_role(profile: UserProfile) -> None:
    """Assign the default viewer role to a newly created user profile."""
    try:
        role = Role.objects.get(code="viewer", is_active=True)
        if not UserRoleAssignment.objects.filter(
            user_profile=profile, role=role, company_id=profile.company_id, is_active=True,
        ).exists():
            UserRoleAssignment.objects.create(
                user_profile=profile, role=role,
                company_id=profile.company_id,
                plant_id=profile.plant_id,
                administrative_department_id=profile.administrative_department_id,
            )
    except Role.DoesNotExist:
        pass


class AdministrativeDepartmentServiceError(Exception):
    def __init__(self, field, code, message):
        self.field = field
        self.code = code
        self.message = message
        super().__init__(message)


class UserProfileServiceError(Exception):
    def __init__(self, field, code, message):
        self.field = field
        self.code = code
        self.message = message
        super().__init__(message)


class RoleServiceError(Exception):
    def __init__(self, field, code, message):
        self.field = field
        self.code = code
        self.message = message
        super().__init__(message)


class UserAccessServiceError(Exception):
    def __init__(self, field, code, message):
        self.field = field
        self.code = code
        self.message = message
        super().__init__(message)


class AdministrativeDepartmentService:

    @staticmethod
    @transaction.atomic
    def create(company_id, code, name, description="", plant_id=None, manager_id=None, user=None):
        if user and user.is_authenticated:
            UserAccessService.enforce_company_access(user, company_id)
        if AdministrativeDepartment.objects.filter(
            company_id=company_id,
            plant_id=plant_id,
            code__iexact=code,
        ).exists():
            raise AdministrativeDepartmentServiceError(
                "code", "DUPLICATE",
                "Administrative Department with this code already exists in this company and plant.",
            )
        if manager_id:
            try:
                User.objects.get(id=manager_id)
            except User.DoesNotExist:
                raise AdministrativeDepartmentServiceError(
                    "managerId", "NOT_FOUND", "Manager user not found.",
                )
        return AdministrativeDepartment.objects.create(
            company_id=company_id,
            plant_id=plant_id,
            code=code,
            name=name,
            description=description,
            manager_id=manager_id,
        )

    @staticmethod
    @transaction.atomic
    def update(dept_id, user=None, **kwargs):
        try:
            dept = AdministrativeDepartment.objects.get(id=dept_id)
        except AdministrativeDepartment.DoesNotExist:
            raise AdministrativeDepartmentServiceError(
                "id", "NOT_FOUND", "Administrative Department not found.",
            )
        if user and user.is_authenticated:
            UserAccessService.enforce_company_access(user, dept.company_id)
        code = kwargs.get("code", dept.code)
        company_id = kwargs.get("company_id", dept.company_id)
        plant_id = kwargs.get("plant_id", dept.plant_id)
        if code != dept.code or company_id != dept.company_id or plant_id != dept.plant_id:
            if AdministrativeDepartment.objects.filter(
                company_id=company_id, plant_id=plant_id,
                code__iexact=code,
            ).exclude(id=dept_id).exists():
                raise AdministrativeDepartmentServiceError(
                    "code", "DUPLICATE",
                    "Another Administrative Department with this code already exists.",
                )
        if "manager_id" in kwargs and kwargs["manager_id"]:
            try:
                User.objects.get(id=kwargs["manager_id"])
            except User.DoesNotExist:
                raise AdministrativeDepartmentServiceError(
                    "managerId", "NOT_FOUND", "Manager user not found.",
                )
        for field in ("company_id", "plant_id", "code", "name", "description", "manager_id", "is_active"):
            if field in kwargs:
                setattr(dept, field, kwargs[field])
        dept.save()
        return dept

    @staticmethod
    @transaction.atomic
    def archive(dept_id, user=None):
        try:
            dept = AdministrativeDepartment.objects.get(id=dept_id)
        except AdministrativeDepartment.DoesNotExist:
            raise AdministrativeDepartmentServiceError(
                "id", "NOT_FOUND", "Administrative Department not found.",
            )
        if user and user.is_authenticated:
            UserAccessService.enforce_company_access(user, dept.company_id)
        dept.is_active = False
        dept.save()
        return dept

    @staticmethod
    def list(company_id=None, plant_id=None, is_active=None, user=None):
        qs = AdministrativeDepartment.objects.select_related("company", "plant", "manager").all()
        if company_id:
            qs = qs.filter(company_id=company_id)
        if plant_id:
            qs = qs.filter(plant_id=plant_id)
        if is_active is not None:
            qs = qs.filter(is_active=is_active)
        if user and user.is_authenticated:
            permitted = UserAccessService.get_permitted_company_ids(user)
            if None not in permitted:
                qs = qs.filter(company_id__in=permitted)
        return qs

    @staticmethod
    def get(dept_id, user=None):
        try:
            dept = AdministrativeDepartment.objects.select_related(
                "company", "plant", "manager",
            ).get(id=dept_id)
            if user and user.is_authenticated:
                UserAccessService.enforce_company_access(user, dept.company_id)
            return dept
        except AdministrativeDepartment.DoesNotExist:
            raise AdministrativeDepartmentServiceError(
                "id", "NOT_FOUND", "Administrative Department not found.",
            )

    @staticmethod
    def validate_scope(dept_id, company_id, plant_id=None):
        try:
            dept = AdministrativeDepartment.objects.get(id=dept_id)
        except AdministrativeDepartment.DoesNotExist:
            return False
        if dept.company_id != company_id:
            return False
        if plant_id and dept.plant_id and dept.plant_id != plant_id:
            return False
        return True


class UserProfileService:

    @staticmethod
    @transaction.atomic
    def create(user_id, **kwargs):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise UserProfileServiceError(
                "userId", "NOT_FOUND", "User not found.",
            )
        if UserProfile.objects.filter(user=user).exists():
            raise UserProfileServiceError(
                "userId", "DUPLICATE", "User profile already exists for this user.",
            )
        if "administrative_department_id" in kwargs and kwargs["administrative_department_id"]:
            from manufacturing.models import ReferenceValue, ReferenceCategory
            try:
                cat = ReferenceCategory.objects.get(code="admin_department")
                if not ReferenceValue.objects.filter(id=kwargs["administrative_department_id"], category=cat).exists():
                    raise UserProfileServiceError(
                        "administrativeDepartmentId", "NOT_FOUND",
                        "Administrative Department not found.",
                    )
            except ReferenceCategory.DoesNotExist:
                raise UserProfileServiceError(
                    "administrativeDepartmentId", "NOT_FOUND",
                    "Administrative Department reference table not found.",
                )
        profile = UserProfile.objects.create(
            user=user,
            company_id=kwargs.get("company_id"),
            plant_id=kwargs.get("plant_id"),
            administrative_department_id=kwargs.get("administrative_department_id"),
            job_title=kwargs.get("job_title", ""),
            phone=kwargs.get("phone", ""),
        )
        _assign_default_viewer_role(profile)
        return profile

    @staticmethod
    @transaction.atomic
    def update(profile_id, **kwargs):
        try:
            profile = UserProfile.objects.get(id=profile_id)
        except UserProfile.DoesNotExist:
            raise UserProfileServiceError(
                "id", "NOT_FOUND", "User Profile not found.",
            )
        if "administrative_department_id" in kwargs and kwargs["administrative_department_id"]:
            from manufacturing.models import ReferenceValue, ReferenceCategory
            try:
                cat = ReferenceCategory.objects.get(code="admin_department")
                if not ReferenceValue.objects.filter(id=kwargs["administrative_department_id"], category=cat).exists():
                    raise UserProfileServiceError(
                        "administrativeDepartmentId", "NOT_FOUND",
                        "Administrative Department not found.",
                    )
            except ReferenceCategory.DoesNotExist:
                raise UserProfileServiceError(
                    "administrativeDepartmentId", "NOT_FOUND",
                    "Administrative Department reference table not found.",
                )
        for field in ("company_id", "plant_id", "administrative_department_id", "job_title", "phone", "is_active"):
            if field in kwargs:
                setattr(profile, field, kwargs[field])
        profile.save()
        return profile

    @staticmethod
    @transaction.atomic
    def assign_administrative_department(profile_id, dept_id):
        try:
            profile = UserProfile.objects.get(id=profile_id)
        except UserProfile.DoesNotExist:
            raise UserProfileServiceError(
                "id", "NOT_FOUND", "User Profile not found.",
            )
        from manufacturing.models import ReferenceValue, ReferenceCategory
        try:
            cat = ReferenceCategory.objects.get(code="admin_department")
            dept = ReferenceValue.objects.get(id=dept_id, category=cat)
        except (ReferenceCategory.DoesNotExist, ReferenceValue.DoesNotExist):
            raise UserProfileServiceError(
                "administrativeDepartmentId", "NOT_FOUND",
                "Administrative Department not found.",
            )
        profile.administrative_department = dept
        profile.save()
        return profile

    @staticmethod
    @transaction.atomic
    def activate(profile_id):
        try:
            profile = UserProfile.objects.get(id=profile_id)
        except UserProfile.DoesNotExist:
            raise UserProfileServiceError(
                "id", "NOT_FOUND", "User Profile not found.",
            )
        profile.is_active = True
        profile.save()
        return profile

    @staticmethod
    @transaction.atomic
    def deactivate(profile_id):
        try:
            profile = UserProfile.objects.get(id=profile_id)
        except UserProfile.DoesNotExist:
            raise UserProfileServiceError(
                "id", "NOT_FOUND", "User Profile not found.",
            )
        profile.is_active = False
        profile.save()
        return profile

    @staticmethod
    def list(company_id=None, plant_id=None, administrative_department_id=None, is_active=None, search=None, user=None):
        qs = UserProfile.objects.select_related(
            "user", "company", "plant", "administrative_department",
        ).all()
        if company_id:
            qs = qs.filter(company_id=company_id)
        if plant_id:
            qs = qs.filter(plant_id=plant_id)
        if administrative_department_id:
            qs = qs.filter(administrative_department_id=administrative_department_id)
        if is_active is not None:
            qs = qs.filter(is_active=is_active)
        if search:
            qs = qs.filter(
                models.Q(user__username__icontains=search) |
                models.Q(user__first_name__icontains=search) |
                models.Q(user__last_name__icontains=search) |
                models.Q(job_title__icontains=search)
            )
        if user and user.is_authenticated:
            permitted = UserAccessService.get_permitted_company_ids(user)
            if None not in permitted:
                qs = qs.filter(company_id__in=permitted)
        return qs

    @staticmethod
    def get(profile_id, user=None):
        try:
            profile = UserProfile.objects.select_related(
                "user", "company", "plant", "administrative_department",
            ).get(id=profile_id)
            if user and user.is_authenticated and profile.company_id:
                UserAccessService.enforce_company_access(user, profile.company_id)
            return profile
        except UserProfile.DoesNotExist:
            raise UserProfileServiceError(
                "id", "NOT_FOUND", "User Profile not found.",
            )


class RoleService:

    @staticmethod
    @transaction.atomic
    def create(code, name, description="", is_system_role=False):
        if Role.objects.filter(code__iexact=code).exists():
            raise RoleServiceError(
                "code", "DUPLICATE", "Role with this code already exists.",
            )
        return Role.objects.create(
            code=code, name=name,
            description=description,
            is_system_role=is_system_role,
        )

    @staticmethod
    @transaction.atomic
    def update(role_id, **kwargs):
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            raise RoleServiceError(
                "id", "NOT_FOUND", "Role not found.",
            )
        code = kwargs.get("code", role.code)
        if code != role.code:
            if Role.objects.filter(code__iexact=code).exclude(id=role_id).exists():
                raise RoleServiceError(
                    "code", "DUPLICATE", "Another role with this code already exists.",
                )
        for field in ("code", "name", "description", "is_active"):
            if field in kwargs:
                setattr(role, field, kwargs[field])
        role.save()
        return role

    @staticmethod
    @transaction.atomic
    def archive(role_id):
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            raise RoleServiceError(
                "id", "NOT_FOUND", "Role not found.",
            )
        if role.is_system_role:
            raise RoleServiceError(
                "id", "SYSTEM_ROLE", "System roles cannot be archived.",
            )
        role.is_active = False
        role.save()
        return role

    @staticmethod
    @transaction.atomic
    def assign_permission(role_id, permission_id):
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            raise RoleServiceError(
                "roleId", "NOT_FOUND", "Role not found.",
            )
        try:
            permission = Permission.objects.get(id=permission_id)
        except Permission.DoesNotExist:
            raise RoleServiceError(
                "permissionId", "NOT_FOUND", "Permission not found.",
            )
        _, created = RolePermission.objects.get_or_create(
            role=role, permission=permission,
        )
        return created

    @staticmethod
    @transaction.atomic
    def remove_permission(role_id, permission_id):
        deleted, _ = RolePermission.objects.filter(
            role_id=role_id, permission_id=permission_id,
        ).delete()
        return deleted > 0

    @staticmethod
    def list(is_active=None):
        qs = Role.objects.all()
        if is_active is not None:
            qs = qs.filter(is_active=is_active)
        return qs

    @staticmethod
    def get(role_id):
        try:
            return Role.objects.prefetch_related(
                "role_permissions__permission",
            ).get(id=role_id)
        except Role.DoesNotExist:
            raise RoleServiceError(
                "id", "NOT_FOUND", "Role not found.",
            )


class UserAccessService:

    @staticmethod
    @transaction.atomic
    def assign_role_to_user(profile_id, role_id, company_id=None, plant_id=None,
                            administrative_department_id=None, assigned_by_id=None):
        try:
            profile = UserProfile.objects.get(id=profile_id)
        except UserProfile.DoesNotExist:
            raise UserAccessServiceError(
                "userProfileId", "NOT_FOUND", "User Profile not found.",
            )
        try:
            role = Role.objects.get(id=role_id, is_active=True)
        except Role.DoesNotExist:
            raise UserAccessServiceError(
                "roleId", "NOT_FOUND", "Role not found or inactive.",
            )
        active_exists = UserRoleAssignment.objects.filter(
            user_profile=profile, role=role,
            company_id=company_id, plant_id=plant_id,
            administrative_department_id=administrative_department_id,
            is_active=True,
        ).exists()
        if active_exists:
            raise UserAccessServiceError(
                "_form", "DUPLICATE",
                "This role is already assigned to the user in this scope.",
            )
        return UserRoleAssignment.objects.create(
            user_profile=profile, role=role,
            company_id=company_id, plant_id=plant_id,
            administrative_department_id=administrative_department_id,
            assigned_by_id=assigned_by_id,
        )

    @staticmethod
    @transaction.atomic
    def remove_role_from_user(assignment_id):
        try:
            assignment = UserRoleAssignment.objects.get(id=assignment_id)
        except UserRoleAssignment.DoesNotExist:
            raise UserAccessServiceError(
                "id", "NOT_FOUND", "Assignment not found.",
            )
        assignment.is_active = False
        assignment.save()
        return assignment

    @staticmethod
    def list_user_roles(profile_id=None):
        qs = UserRoleAssignment.objects.select_related(
            "role", "company", "plant", "administrative_department",
        ).filter(is_active=True)
        if profile_id:
            qs = qs.filter(user_profile_id=profile_id)
        return qs

    @staticmethod
    def get_user_permissions(profile_id):
        assignments = UserRoleAssignment.objects.select_related(
            "role",
        ).filter(
            user_profile_id=profile_id, is_active=True,
        )
        role_ids = assignments.values_list("role_id", flat=True).distinct()
        perms = Permission.objects.filter(
            role_permissions__role_id__in=role_ids,
            is_active=True,
        ).distinct()
        return perms

    @staticmethod
    def user_has_permission(profile_id, permission_code):
        return Permission.objects.filter(
            code=permission_code,
            is_active=True,
            role_permissions__role__user_assignments__user_profile_id=profile_id,
            role_permissions__role__user_assignments__is_active=True,
        ).exists()

    @staticmethod
    def validate_access_scope(profile_id, company_id, plant_id=None,
                              administrative_department_id=None):
        if administrative_department_id:
            from manufacturing.models import ReferenceValue, ReferenceCategory
            try:
                cat = ReferenceCategory.objects.get(code="admin_department")
                dept = ReferenceValue.objects.get(id=administrative_department_id, category=cat)
            except (ReferenceCategory.DoesNotExist, ReferenceValue.DoesNotExist):
                return False
        return True

    # ── Scope Enforcement ────────────────────────────────────────────

    @staticmethod
    def get_profile_for_user(user: User) -> UserProfile | None:
        """Get the UserProfile for a Django user, if one exists."""
        try:
            return user.administration_profile
        except UserProfile.DoesNotExist:
            return None

    @staticmethod
    def get_permitted_company_ids(user: User) -> set[int | None]:
        """Return set of company IDs the user can access.
        If None is in the set, the user has global (unrestricted) access.
        """
        profile = UserAccessService.get_profile_for_user(user)
        if not profile:
            return {None}
        assignments = UserRoleAssignment.objects.filter(
            user_profile=profile, is_active=True,
        ).values_list("company_id", flat=True).distinct()
        ids = set(assignments)
        if not ids or None in ids:
            return {None}
        return ids

    @staticmethod
    def get_permitted_plant_ids(user: User) -> set[int | None]:
        profile = UserAccessService.get_profile_for_user(user)
        if not profile:
            return {None}
        assignments = UserRoleAssignment.objects.filter(
            user_profile=profile, is_active=True,
        ).values_list("plant_id", flat=True).distinct()
        ids = set(assignments)
        if not ids or None in ids:
            return {None}
        return ids

    @staticmethod
    def get_permitted_admin_dept_ids(user: User) -> set[int | None]:
        profile = UserAccessService.get_profile_for_user(user)
        if not profile:
            return {None}
        assignments = UserRoleAssignment.objects.filter(
            user_profile=profile, is_active=True,
        ).values_list("administrative_department_id", flat=True).distinct()
        ids = set(assignments)
        if not ids or None in ids:
            return {None}
        return ids

    @staticmethod
    def user_can_access_company(user: User, company_id: int) -> bool:
        permitted = UserAccessService.get_permitted_company_ids(user)
        return None in permitted or company_id in permitted

    @staticmethod
    def user_can_access_plant(user: User, plant_id: int) -> bool:
        permitted = UserAccessService.get_permitted_plant_ids(user)
        return None in permitted or plant_id in permitted

    @staticmethod
    def enforce_company_access(user: User, company_id: int | None) -> None:
        if company_id is None:
            return
        if not UserAccessService.user_can_access_company(user, company_id):
            raise UserAccessServiceError(
                "companyId", "ACCESS_DENIED",
                "You do not have access to this company.",
            )

    @staticmethod
    def enforce_plant_access(user: User, plant_id: int | None) -> None:
        if plant_id is None:
            return
        if not UserAccessService.user_can_access_plant(user, plant_id):
            raise UserAccessServiceError(
                "plantId", "ACCESS_DENIED",
                "You do not have access to this plant.",
            )

    @staticmethod
    def user_has_permission_by_user(user: User, permission_code: str) -> bool:
        profile = UserAccessService.get_profile_for_user(user)
        if not profile:
            return False
        return UserAccessService.user_has_permission(profile.id, permission_code)

    @staticmethod
    def enforce_permission(user: User, permission_code: str) -> None:
        if not UserAccessService.user_has_permission_by_user(user, permission_code):
            raise UserAccessServiceError(
                "_form", "ACCESS_DENIED",
                f"You do not have the '{permission_code}' permission.",
            )



