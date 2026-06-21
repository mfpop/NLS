import strawberry
from typing import Optional
from strawberry.types import Info

from administration.models import Permission
from administration.services import (
    AdministrativeDepartmentService, AdministrativeDepartmentServiceError,
    UserProfileService, UserProfileServiceError,
    RoleService, RoleServiceError,
    UserAccessService, UserAccessServiceError,
)
from administration.services import (
    AdministrativeDepartmentService, AdministrativeDepartmentServiceError,
    UserProfileService, UserProfileServiceError,
    RoleService, RoleServiceError,
    UserAccessService, UserAccessServiceError,
    ProfileSkillService, ProfileSkillServiceError,
)
from api.types.administration import (
    AdministrativeDepartmentNode,
    AdministrativeDepartmentPayload,
    CreateAdministrativeDepartmentInput,
    UpdateAdministrativeDepartmentInput,
    UserProfileNode,
    UserProfilePayload,
    CreateUserProfileInput,
    UpdateUserProfileInput,
    RoleNode,
    RolePayload,
    CreateRoleInput,
    UpdateRoleInput,
    PermissionNode,
    PermissionPayload,
    CreatePermissionInput,
    AssignRoleToUserInput,
    AssignRolePayload,
    UserRoleAssignmentNode,
    ProfileSkillNode,
    ProfileSkillPayload,
    CreateProfileSkillInput,
    UpdateProfileSkillInput,
    MutationError,
)


def _user(info: Info):
    if info is None:
        return None
    return info.context.user


@strawberry.type
class AdministrationMutation:

    # ── AdministrativeDepartment ──

    @strawberry.mutation
    def create_administrative_department(
        self, info: Info, input: CreateAdministrativeDepartmentInput,
    ) -> AdministrativeDepartmentPayload:
        try:
            dept = AdministrativeDepartmentService.create(
                company_id=input.company_id,
                code=input.code,
                name=input.name,
                description=input.description or "",
                plant_id=input.plant_id,
                manager_id=input.manager_id,
                user=_user(info),
            )
            return AdministrativeDepartmentPayload(
                administrative_department=AdministrativeDepartmentNode.from_db(dept),
            )
        except AdministrativeDepartmentServiceError as exc:
            return AdministrativeDepartmentPayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def update_administrative_department(
        self, info: Info, id: str, input: UpdateAdministrativeDepartmentInput,
    ) -> AdministrativeDepartmentPayload:
        try:
            kwargs = {}
            for field in ("company_id", "plant_id", "code", "name", "description", "manager_id", "is_active"):
                v = getattr(input, field, None)
                if v is not None:
                    kwargs[field] = v
            dept = AdministrativeDepartmentService.update(id, user=_user(info), **kwargs)
            return AdministrativeDepartmentPayload(
                administrative_department=AdministrativeDepartmentNode.from_db(dept),
            )
        except AdministrativeDepartmentServiceError as exc:
            return AdministrativeDepartmentPayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def archive_administrative_department(self, info: Info, id: str) -> AdministrativeDepartmentPayload:
        try:
            dept = AdministrativeDepartmentService.archive(id, user=_user(info))
            return AdministrativeDepartmentPayload(
                administrative_department=AdministrativeDepartmentNode.from_db(dept),
            )
        except AdministrativeDepartmentServiceError as exc:
            return AdministrativeDepartmentPayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    # ── UserProfile ──

    @strawberry.mutation
    def create_user_profile(
        self, info: Info, input: CreateUserProfileInput,
    ) -> UserProfilePayload:
        try:
            profile = UserProfileService.create(
                user_id=input.user_id,
                company_id=input.company_id,
                plant_id=input.plant_id,
                administrative_department_id=input.administrative_department_id,
                job_title=input.job_title,
                phone=input.phone,
            )
            return UserProfilePayload(
                user_profile=UserProfileNode.from_db(profile),
            )
        except UserProfileServiceError as exc:
            return UserProfilePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def update_user_profile(
        self, info: Info, id: str, input: UpdateUserProfileInput,
    ) -> UserProfilePayload:
        try:
            kwargs = {}
            for field in ("company_id", "plant_id", "administrative_department_id", "job_title", "phone"):
                v = getattr(input, field, None)
                if v is not None:
                    kwargs[field] = v
            profile = UserProfileService.update(id, **kwargs)
            return UserProfilePayload(
                user_profile=UserProfileNode.from_db(profile),
            )
        except UserProfileServiceError as exc:
            return UserProfilePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def assign_user_administrative_department(
        self, info: Info, user_profile_id: str, administrative_department_id: str,
    ) -> UserProfilePayload:
        try:
            profile = UserProfileService.assign_administrative_department(
                user_profile_id, administrative_department_id,
            )
            return UserProfilePayload(
                user_profile=UserProfileNode.from_db(profile),
            )
        except UserProfileServiceError as exc:
            return UserProfilePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def activate_user_profile(self, info: Info, id: str) -> UserProfilePayload:
        try:
            profile = UserProfileService.activate(id)
            return UserProfilePayload(
                user_profile=UserProfileNode.from_db(profile),
            )
        except UserProfileServiceError as exc:
            return UserProfilePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def deactivate_user_profile(self, info: Info, id: str) -> UserProfilePayload:
        try:
            profile = UserProfileService.deactivate(id)
            return UserProfilePayload(
                user_profile=UserProfileNode.from_db(profile),
            )
        except UserProfileServiceError as exc:
            return UserProfilePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    # ── Role ──

    @strawberry.mutation
    def create_role(self, info: Info, input: CreateRoleInput) -> RolePayload:
        try:
            role = RoleService.create(
                code=input.code,
                name=input.name,
                description=input.description or "",
                is_system_role=input.is_system_role or False,
            )
            return RolePayload(role=RoleNode.from_db(role))
        except RoleServiceError as exc:
            return RolePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def update_role(self, info: Info, id: str, input: UpdateRoleInput) -> RolePayload:
        try:
            kwargs = {}
            for field in ("code", "name", "description", "is_active"):
                v = getattr(input, field, None)
                if v is not None:
                    kwargs[field] = v
            role = RoleService.update(id, **kwargs)
            return RolePayload(role=RoleNode.from_db(role))
        except RoleServiceError as exc:
            return RolePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def archive_role(self, info: Info, id: str) -> RolePayload:
        try:
            role = RoleService.archive(id)
            return RolePayload(role=RoleNode.from_db(role))
        except RoleServiceError as exc:
            return RolePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def assign_permission_to_role(
        self, info: Info, role_id: str, permission_id: str,
    ) -> RolePayload:
        try:
            RoleService.assign_permission(role_id, permission_id)
            role = RoleService.get(role_id)
            return RolePayload(role=RoleNode.from_db(role))
        except RoleServiceError as exc:
            return RolePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def remove_permission_from_role(
        self, info: Info, role_id: str, permission_id: str,
    ) -> RolePayload:
        try:
            RoleService.remove_permission(role_id, permission_id)
            role = RoleService.get(role_id)
            return RolePayload(role=RoleNode.from_db(role))
        except RoleServiceError as exc:
            return RolePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    # ── Permission ──

    @strawberry.mutation
    def create_permission(self, info: Info, input: CreatePermissionInput) -> PermissionPayload:
        if Permission.objects.filter(code=input.code).exists():
            return PermissionPayload(
                errors=[MutationError(field="code", code="DUPLICATE", message="Permission with this code already exists.")],
            )
        perm = Permission.objects.create(
            code=input.code,
            name=input.name,
            description=input.description or "",
            module=input.module,
            action=input.action,
        )
        return PermissionPayload(permission=PermissionNode.from_db(perm))

    # ── ProfileSkill ──

    @strawberry.mutation
    def create_profile_skill(
        self, info: Info, input: CreateProfileSkillInput,
    ) -> ProfileSkillPayload:
        try:
            skill = ProfileSkillService.create(
                user_profile_id=input.user_profile_id,
                name=input.name,
                category=input.category or "SKILL",
                level=input.level or "",
                issuer=input.issuer or "",
                issued_date=input.issued_date,
                expires_date=input.expires_date,
                notes=input.notes or "",
            )
            return ProfileSkillPayload(
                skill=ProfileSkillNode.from_db(skill),
            )
        except ProfileSkillServiceError as exc:
            return ProfileSkillPayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def update_profile_skill(
        self, info: Info, id: str, input: UpdateProfileSkillInput,
    ) -> ProfileSkillPayload:
        try:
            kwargs = {}
            for field in ("name", "category", "level", "issuer", "issued_date", "expires_date", "notes", "is_active"):
                v = getattr(input, field, None)
                if v is not None:
                    kwargs[field] = v
            skill = ProfileSkillService.update(id, **kwargs)
            return ProfileSkillPayload(
                skill=ProfileSkillNode.from_db(skill),
            )
        except ProfileSkillServiceError as exc:
            return ProfileSkillPayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def archive_profile_skill(self, info: Info, id: str) -> ProfileSkillPayload:
        try:
            skill = ProfileSkillService.archive(id)
            return ProfileSkillPayload(
                skill=ProfileSkillNode.from_db(skill),
            )
        except ProfileSkillServiceError as exc:
            return ProfileSkillPayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    # ── User Role Assignment ──

    @strawberry.mutation
    def assign_role_to_user(
        self, info: Info, input: AssignRoleToUserInput,
    ) -> AssignRolePayload:
        assigned_by_id = None
        if _user(info) and _user(info).is_authenticated:
            assigned_by_id = _user(info).id
        try:
            assignment = UserAccessService.assign_role_to_user(
                profile_id=input.user_profile_id,
                role_id=input.role_id,
                company_id=input.company_id,
                plant_id=input.plant_id,
                administrative_department_id=input.administrative_department_id,
                assigned_by_id=assigned_by_id,
            )
            return AssignRolePayload(
                assignment=UserRoleAssignmentNode.from_db(assignment),
            )
        except UserAccessServiceError as exc:
            return AssignRolePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def remove_role_from_user(
        self, info: Info, assignment_id: str,
    ) -> AssignRolePayload:
        try:
            assignment = UserAccessService.remove_role_from_user(assignment_id)
            return AssignRolePayload(
                assignment=UserRoleAssignmentNode.from_db(assignment),
            )
        except UserAccessServiceError as exc:
            return AssignRolePayload(
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )
