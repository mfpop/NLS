import typing
import strawberry
from typing import Optional
from strawberry.types import Info as GraphQLInfo

from manufacturing.models import Company
from administration.models import (
    AdministrativeDepartment, UserProfile, Role, Permission,
)
from administration.services import (
    AdministrativeDepartmentService, AdministrativeDepartmentServiceError,
    UserProfileService, UserProfileServiceError,
    RoleService, RoleServiceError,
    UserAccessService,
)
from api.types.administration import (
    AdministrativeDepartmentNode,
    UserProfileNode,
    RoleNode,
    PermissionNode,
    UserRoleAssignmentNode,
    ProfileSkillNode,
    ProfileSkillCapabilitiesNode,
    SystemAuditLogNode,
    PaginatedAuditLogsResponse,
)


@strawberry.type
class CompanyOptionNode:
    id: strawberry.ID
    code: str
    name: str

    @classmethod
    def from_db(cls, obj: Company) -> "CompanyOptionNode":
        return cls(id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name)


@strawberry.type
class UserOptionNode:
    id: strawberry.ID
    username: str
    full_name: str = strawberry.field(name="fullName")

    @classmethod
    def from_user(cls, user) -> "UserOptionNode":
        return cls(
            id=strawberry.ID(str(user.id)),
            username=user.username,
            full_name=user.get_full_name() or user.username,
        )


def _user(info: GraphQLInfo):
    if info is None:
        return None
    return info.context.user


@strawberry.type
class AdministrationQuery:
    @strawberry.field
    def administrative_departments(
        self,
        info: GraphQLInfo,
        company_id: Optional[str] = None,
        plant_id: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> list[AdministrativeDepartmentNode]:
        qs = AdministrativeDepartmentService.list(
            company_id=company_id,
            plant_id=plant_id,
            is_active=is_active,
            user=_user(info),
        )
        return [AdministrativeDepartmentNode.from_db(d) for d in qs]

    @strawberry.field
    def administrative_department(self, info: GraphQLInfo, id: str) -> Optional[AdministrativeDepartmentNode]:
        try:
            dept = AdministrativeDepartmentService.get(id, user=_user(info))
            return AdministrativeDepartmentNode.from_db(dept)
        except AdministrativeDepartmentServiceError:
            return None

    @strawberry.field
    def companies(self) -> list[CompanyOptionNode]:
        qs = Company.objects.filter(status="ACTIVE").order_by("name")
        return [CompanyOptionNode.from_db(c) for c in qs]

    @strawberry.field
    def users_list(self) -> list["UserOptionNode"]:
        from django.contrib.auth.models import User
        qs = User.objects.filter(is_active=True).order_by("username")
        return [UserOptionNode.from_user(u) for u in qs[:200]]

    @strawberry.field
    def user_profiles(
        self,
        info: GraphQLInfo,
        company_id: Optional[str] = None,
        plant_id: Optional[str] = None,
        administrative_department_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> list[UserProfileNode]:
        qs = UserProfileService.list(
            company_id=company_id,
            plant_id=plant_id,
            administrative_department_id=administrative_department_id,
            is_active=is_active,
            search=search,
            user_id=user_id,
            user=_user(info),
        )
        return [UserProfileNode.from_db(p) for p in qs]

    @strawberry.field
    def user_profile(self, info: GraphQLInfo, id: str) -> Optional[UserProfileNode]:
        try:
            profile = UserProfileService.get(id, user=_user(info))
            return UserProfileNode.from_db(profile)
        except UserProfileServiceError:
            return None

    @strawberry.field
    def roles(self, is_active: Optional[bool] = None) -> list[RoleNode]:
        qs = RoleService.list(is_active=is_active)
        return [RoleNode.from_db(r) for r in qs]

    @strawberry.field
    def role(self, id: str) -> Optional[RoleNode]:
        try:
            r = RoleService.get(id)
            return RoleNode.from_db(r)
        except RoleServiceError:
            return None

    @strawberry.field
    def permissions(self) -> list[PermissionNode]:
        qs = Permission.objects.filter(is_active=True).order_by("module", "action")
        return [PermissionNode.from_db(p) for p in qs]

    @strawberry.field
    def user_roles(self, user_profile_id: Optional[str] = None) -> list[UserRoleAssignmentNode]:
        assignments = UserAccessService.list_user_roles(user_profile_id)
        return [UserRoleAssignmentNode.from_db(a) for a in assignments]

    @strawberry.field
    def user_permissions(self, user_profile_id: str) -> list[PermissionNode]:
        perms = UserAccessService.get_user_permissions(user_profile_id)
        return [PermissionNode.from_db(p) for p in perms]

    @strawberry.field
    def profile_skills(self, info: GraphQLInfo, user_profile_id: str) -> list[ProfileSkillNode]:
        from administration.services import ProfileSkillService
        qs = ProfileSkillService.list(user_profile_id=user_profile_id)
        return [ProfileSkillNode.from_db(s) for s in qs]

    @strawberry.field
    def profile_skill_capabilities(self, info: GraphQLInfo, user_profile_id: str) -> "ProfileSkillCapabilitiesNode":
        from administration.services import ProfileSkillService
        can_add, can_edit, can_delete = ProfileSkillService.check_can_manage(
            user_profile_id, user=_user(info),
        )
        return ProfileSkillCapabilitiesNode(
            can_add=can_add, can_edit=can_edit, can_delete=can_delete,
        )

    # ── Audit Logs ──

    @strawberry.field(name="auditLogs")
    def resolve_audit_logs(
        self,
        info: GraphQLInfo,
        event_type: typing.Optional[str] = None,
        search: typing.Optional[str] = None,
        action: typing.Optional[str] = None,
        username: typing.Optional[str] = None,
        entity_type: typing.Optional[str] = None,
        date_from: typing.Optional[str] = None,
        date_to: typing.Optional[str] = None,
        limit: typing.Optional[int] = 50,
        offset: typing.Optional[int] = 0,
    ) -> "PaginatedAuditLogsResponse":
        from administration.models import SystemAuditLog
        from django.db.models import Q

        qs = SystemAuditLog.objects.all()

        if event_type:
            qs = qs.filter(event_type=event_type)
        if action:
            qs = qs.filter(action__icontains=action)
        if username:
            qs = qs.filter(username__icontains=username)
        if entity_type:
            qs = qs.filter(entity_type__icontains=entity_type)
        if search:
            qs = qs.filter(
                Q(action__icontains=search) |
                Q(description__icontains=search) |
                Q(username__icontains=search) |
                Q(entity_type__icontains=search)
            )
        if date_from:
            from datetime import datetime as dt
            qs = qs.filter(created_at__gte=dt.fromisoformat(date_from))
        if date_to:
            from datetime import datetime as dt
            qs = qs.filter(created_at__lte=dt.fromisoformat(date_to))

        total = qs.count()
        items = qs.order_by("-created_at")[offset:offset + limit]

        return PaginatedAuditLogsResponse(
            items=[SystemAuditLogNode.from_db(obj) for obj in items],
            total=total,
            has_more=(offset + limit) < total,
        )
