import json
import typing
import strawberry
from datetime import datetime

from administration.models import (
    AdministrativeDepartment, UserProfile, Role,
    Permission, RolePermission, UserRoleAssignment,
)


def _iso(dt: datetime | None) -> str:
    return dt.isoformat() if dt else ""


@strawberry.type(name="AdminMutationError")
class MutationError:
    field: typing.Optional[str]
    code: str
    message: str
    details: typing.Optional[str] = None


# ── AdministrativeDepartment ──

@strawberry.type
class AdministrativeDepartmentNode:
    id: strawberry.ID
    company_id: strawberry.ID = strawberry.field(name="companyId")
    company_name: str = strawberry.field(name="companyName")
    plant_id: typing.Optional[strawberry.ID] = strawberry.field(name="plantId", default=None)
    plant_name: typing.Optional[str] = strawberry.field(name="plantName", default=None)
    code: str
    name: str
    description: str
    manager_id: typing.Optional[str] = strawberry.field(name="managerId", default=None)
    manager_name: typing.Optional[str] = strawberry.field(name="managerName", default=None)
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: AdministrativeDepartment) -> "AdministrativeDepartmentNode":
        company_name = ""
        if obj.company_id:
            try:
                company_name = obj.company.name
            except Exception:
                company_name = ""
        return cls(
            id=strawberry.ID(str(obj.id)),
            company_id=strawberry.ID(str(obj.company_id)),
            company_name=company_name,
            plant_id=strawberry.ID(str(obj.plant_id)) if obj.plant_id else None,
            plant_name=obj.plant.name if obj.plant_id else None,
            code=obj.code,
            name=obj.name,
            description=obj.description,
            manager_id=str(obj.manager_id) if obj.manager_id else None,
            manager_name=obj.manager.get_full_name() or obj.manager.username if obj.manager_id else None,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.input
class CreateAdministrativeDepartmentInput:
    company_id: str = strawberry.field(name="companyId")
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    code: str
    name: str
    description: typing.Optional[str] = ""
    manager_id: typing.Optional[str] = strawberry.field(name="managerId", default=None)


@strawberry.input
class UpdateAdministrativeDepartmentInput:
    company_id: typing.Optional[str] = strawberry.field(name="companyId", default=None)
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    code: typing.Optional[str] = None
    name: typing.Optional[str] = None
    description: typing.Optional[str] = None
    manager_id: typing.Optional[str] = strawberry.field(name="managerId", default=None)
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=None)


@strawberry.type
class AdministrativeDepartmentPayload:
    administrative_department: typing.Optional[AdministrativeDepartmentNode] = strawberry.field(name="administrativeDepartment", default=None)
    errors: typing.Optional[list[MutationError]] = None


# ── UserProfile ──

@strawberry.type
class UserProfileNode:
    id: strawberry.ID
    user_id: strawberry.ID = strawberry.field(name="userId")
    username: str
    email: str
    full_name: str = strawberry.field(name="fullName")
    company_id: typing.Optional[str] = strawberry.field(name="companyId", default=None)
    company_name: typing.Optional[str] = strawberry.field(name="companyName", default=None)
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    plant_name: typing.Optional[str] = strawberry.field(name="plantName", default=None)
    administrative_department_id: typing.Optional[str] = strawberry.field(name="administrativeDepartmentId", default=None)
    administrative_department_name: typing.Optional[str] = strawberry.field(name="administrativeDepartmentName", default=None)
    job_title: str = strawberry.field(name="jobTitle")
    phone: str
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: UserProfile) -> "UserProfileNode":
        dept_name = ""
        if obj.administrative_department_id:
            try:
                dept_name = obj.administrative_department.name
            except Exception:
                dept_name = ""
        return cls(
            id=strawberry.ID(str(obj.id)),
            user_id=strawberry.ID(str(obj.user_id)),
            username=obj.user.username,
            email=obj.user.email,
            full_name=obj.user.get_full_name() or obj.user.username,
            company_id=str(obj.company_id) if obj.company_id else None,
            company_name=obj.company.name if obj.company_id else None,
            plant_id=str(obj.plant_id) if obj.plant_id else None,
            plant_name=obj.plant.name if obj.plant_id else None,
            administrative_department_id=str(obj.administrative_department_id) if obj.administrative_department_id else None,
            administrative_department_name=dept_name,
            job_title=obj.job_title or "",
            phone=obj.phone or "",
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.input
class CreateUserProfileInput:
    user_id: str = strawberry.field(name="userId")
    company_id: typing.Optional[str] = strawberry.field(name="companyId", default=None)
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    administrative_department_id: typing.Optional[str] = strawberry.field(name="administrativeDepartmentId", default=None)
    job_title: typing.Optional[str] = strawberry.field(name="jobTitle", default="")
    phone: typing.Optional[str] = ""


@strawberry.input
class UpdateUserProfileInput:
    company_id: typing.Optional[str] = strawberry.field(name="companyId", default=None)
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    administrative_department_id: typing.Optional[str] = strawberry.field(name="administrativeDepartmentId", default=None)
    job_title: typing.Optional[str] = strawberry.field(name="jobTitle", default=None)
    phone: typing.Optional[str] = None


@strawberry.type
class UserProfilePayload:
    user_profile: typing.Optional[UserProfileNode] = strawberry.field(name="userProfile", default=None)
    errors: typing.Optional[list[MutationError]] = None


# ── Role ──

@strawberry.type
class PermissionNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    module: str
    action: str
    is_active: bool = strawberry.field(name="isActive")

    @classmethod
    def from_db(cls, obj: Permission) -> "PermissionNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            code=obj.code,
            name=obj.name,
            description=obj.description,
            module=obj.module,
            action=obj.action,
            is_active=obj.is_active,
        )


@strawberry.type
class RoleNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    is_system_role: bool = strawberry.field(name="isSystemRole")
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")
    permissions: typing.Optional[list[PermissionNode]] = strawberry.field(default_factory=list)

    @classmethod
    def from_db(cls, obj: Role) -> "RoleNode":
        perms = []
        if obj.pk:
            rps = obj.role_permissions.select_related("permission").all() if hasattr(obj, "role_permissions") else []
            perms = [PermissionNode.from_db(rp.permission) for rp in rps if rp.permission.is_active]
        return cls(
            id=strawberry.ID(str(obj.id)),
            code=obj.code,
            name=obj.name,
            description=obj.description,
            is_system_role=obj.is_system_role,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
            permissions=perms,
        )


@strawberry.input
class CreateRoleInput:
    code: str
    name: str
    description: typing.Optional[str] = ""
    is_system_role: typing.Optional[bool] = strawberry.field(name="isSystemRole", default=False)


@strawberry.input
class UpdateRoleInput:
    code: typing.Optional[str] = None
    name: typing.Optional[str] = None
    description: typing.Optional[str] = None
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=None)


@strawberry.type
class RolePayload:
    role: typing.Optional[RoleNode] = None
    errors: typing.Optional[list[MutationError]] = None


# ── Permission ──

@strawberry.input
class CreatePermissionInput:
    code: str
    name: str
    description: typing.Optional[str] = ""
    module: str
    action: str


@strawberry.type
class PermissionPayload:
    permission: typing.Optional[PermissionNode] = None
    errors: typing.Optional[list[MutationError]] = None


# ── User Role Assignment ──

@strawberry.type
class UserRoleAssignmentNode:
    id: strawberry.ID
    user_profile_id: strawberry.ID = strawberry.field(name="userProfileId")
    username: str
    full_name: str = strawberry.field(name="fullName")
    role_id: strawberry.ID = strawberry.field(name="roleId")
    role_code: str = strawberry.field(name="roleCode")
    role_name: str = strawberry.field(name="roleName")
    company_id: typing.Optional[str] = strawberry.field(name="companyId", default=None)
    company_name: typing.Optional[str] = strawberry.field(name="companyName", default=None)
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    plant_name: typing.Optional[str] = strawberry.field(name="plantName", default=None)
    administrative_department_id: typing.Optional[str] = strawberry.field(name="administrativeDepartmentId", default=None)
    administrative_department_name: typing.Optional[str] = strawberry.field(name="administrativeDepartmentName", default=None)
    is_active: bool = strawberry.field(name="isActive")
    assigned_at: str = strawberry.field(name="assignedAt")
    access_level: str = strawberry.field(name="accessLevel")

    @classmethod
    def from_db(cls, obj: UserRoleAssignment) -> "UserRoleAssignmentNode":
        profile = obj.user_profile
        user = profile.user
        dept_name = ""
        if obj.administrative_department_id:
            try:
                dept_name = obj.administrative_department.name
            except Exception:
                dept_name = ""
        # Compute access level from role properties
        if obj.role.is_system_role:
            access_level = "Admin"
        else:
            access_level = "Staff"
        return cls(
            id=strawberry.ID(str(obj.id)),
            user_profile_id=strawberry.ID(str(obj.user_profile_id)),
            username=user.username,
            full_name=user.get_full_name() or user.username,
            role_id=strawberry.ID(str(obj.role_id)),
            role_code=obj.role.code,
            role_name=obj.role.name,
            company_id=str(obj.company_id) if obj.company_id else None,
            company_name=obj.company.name if obj.company_id else None,
            plant_id=str(obj.plant_id) if obj.plant_id else None,
            plant_name=obj.plant.name if obj.plant_id else None,
            administrative_department_id=str(obj.administrative_department_id) if obj.administrative_department_id else None,
            administrative_department_name=dept_name,
            is_active=obj.is_active,
            assigned_at=_iso(obj.assigned_at),
            access_level=access_level,
        )


# ── ProfileSkill ──

@strawberry.type
class ProfileSkillNode:
    id: strawberry.ID
    user_profile_id: strawberry.ID = strawberry.field(name="userProfileId")
    name: str
    category: str
    level: str = ""
    issuer: str = ""
    issued_date: typing.Optional[str] = strawberry.field(name="issuedDate", default=None)
    expires_date: typing.Optional[str] = strawberry.field(name="expiresDate", default=None)
    notes: str = ""
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "ProfileSkillNode":
        from administration.models import ProfileSkill
        return cls(
            id=strawberry.ID(str(obj.id)),
            user_profile_id=strawberry.ID(str(obj.user_profile_id)),
            name=obj.name,
            category=obj.category,
            level=obj.level or "",
            issuer=obj.issuer or "",
            issued_date=obj.issued_date.isoformat() if obj.issued_date else None,
            expires_date=obj.expires_date.isoformat() if obj.expires_date else None,
            notes=obj.notes or "",
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.input
class CreateProfileSkillInput:
    user_profile_id: str = strawberry.field(name="userProfileId")
    name: str
    category: typing.Optional[str] = "SKILL"
    level: typing.Optional[str] = ""
    issuer: typing.Optional[str] = ""
    issued_date: typing.Optional[str] = strawberry.field(name="issuedDate", default=None)
    expires_date: typing.Optional[str] = strawberry.field(name="expiresDate", default=None)
    notes: typing.Optional[str] = ""


@strawberry.input
class UpdateProfileSkillInput:
    name: typing.Optional[str] = None
    category: typing.Optional[str] = None
    level: typing.Optional[str] = None
    issuer: typing.Optional[str] = None
    issued_date: typing.Optional[str] = strawberry.field(name="issuedDate", default=None)
    expires_date: typing.Optional[str] = strawberry.field(name="expiresDate", default=None)
    notes: typing.Optional[str] = None
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=None)


@strawberry.type
class ProfileSkillPayload:
    skill: typing.Optional[ProfileSkillNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class ProfileSkillCapabilitiesNode:
    can_add_skill: bool = strawberry.field(name="canAddSkill")
    can_edit_skill: bool = strawberry.field(name="canEditSkill")
    can_delete_skill: bool = strawberry.field(name="canDeleteSkill")


@strawberry.type
class SystemAuditLogNode:
    id: strawberry.ID
    event_type: str = strawberry.field(name="eventType")
    user_id: typing.Optional[strawberry.ID] = strawberry.field(name="userId", default=None)
    username: str
    action: str
    description: str
    entity_type: str = strawberry.field(name="entityType", default="")
    entity_id: str = strawberry.field(name="entityId", default="")
    ip_address: typing.Optional[str] = strawberry.field(name="ipAddress", default=None)
    details: str
    created_at: str = strawberry.field(name="createdAt")

    @classmethod
    def from_db(cls, obj) -> "SystemAuditLogNode":
        from administration.models import SystemAuditLog
        return cls(
            id=strawberry.ID(str(obj.id)),
            event_type=obj.event_type,
            user_id=strawberry.ID(str(obj.user_id)) if obj.user_id else None,
            username=obj.username or "",
            action=obj.action,
            description=obj.description or "",
            entity_type=obj.entity_type or "",
            entity_id=obj.entity_id or "",
            ip_address=str(obj.ip_address) if obj.ip_address else None,
            details=json.dumps(obj.details) if obj.details else "{}",
            created_at=_iso(obj.created_at),
        )


@strawberry.type
class PaginatedAuditLogsResponse:
    items: list[SystemAuditLogNode] = strawberry.field(default_factory=list)
    total: int = 0
    has_more: bool = strawberry.field(name="hasMore", default=False)


@strawberry.input
class AssignRoleToUserInput:
    user_profile_id: str = strawberry.field(name="userProfileId")
    role_id: str = strawberry.field(name="roleId")
    company_id: typing.Optional[str] = strawberry.field(name="companyId", default=None)
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    administrative_department_id: typing.Optional[str] = strawberry.field(name="administrativeDepartmentId", default=None)


@strawberry.type
class AssignRolePayload:
    assignment: typing.Optional[UserRoleAssignmentNode] = None
    errors: typing.Optional[list[MutationError]] = None
