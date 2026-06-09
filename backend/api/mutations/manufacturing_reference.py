import strawberry
from typing import Optional
from strawberry.types import Info
from django.contrib.auth.models import User
from django.db import transaction
from django.core.exceptions import ValidationError
from api.permissions import ensure_access
from api.types.manufacturing import MutationError
from manufacturing.models import ReferenceValue, ReferenceCategory, UserRole


# ── Legacy reference item mutation types ──

@strawberry.input
class ReferenceItemInput:
    table_type: str = strawberry.field(name="tableType")
    code: str
    name: str
    description: Optional[str] = ""
    usage_context: Optional[str] = strawberry.field(name="usageContext", default="")
    is_active: Optional[bool] = strawberry.field(name="isActive", default=True)
    sort_order: Optional[int] = strawberry.field(name="sortOrder", default=0)
    role: Optional[str] = None
    department: Optional[str] = None
    plant: Optional[str] = None
    email: Optional[str] = None


@strawberry.type
class ReferenceItemPayload:
    item: Optional["LegacyReferenceItemResult"] = None
    errors: Optional[list[MutationError]] = strawberry.field(default_factory=list)


@strawberry.type
class LegacyReferenceItemResult:
    id: strawberry.ID
    table_type: str = strawberry.field(name="tableType")
    code: str
    name: str
    description: str
    usage_context: str = strawberry.field(name="usageContext")
    is_active: bool = strawberry.field(name="isActive")
    sort_order: int = strawberry.field(name="sortOrder")
    category_name: str = strawberry.field(name="categoryName", default="")
    data_type: str = strawberry.field(name="dataType", default="Configurable")
    usage_impact: str = strawberry.field(name="usageImpact", default="")
    updated_at: str = strawberry.field(name="updatedAt", default="")
    is_system_managed: bool = strawberry.field(name="isSystemManaged", default=False)
    is_configurable: bool = strawberry.field(name="isConfigurable", default=True)
    username: str = ""
    role: str = ""
    department: str = ""
    plant: str = ""
    email: str = ""

    @classmethod
    def from_ref_value(cls, rv, table_type: str) -> "LegacyReferenceItemResult":
        return cls(
            id=strawberry.ID(str(rv.id)),
            table_type=table_type,
            code=rv.code,
            name=rv.name,
            description=rv.description,
            usage_context=rv.usage_context,
            is_active=rv.is_active,
            sort_order=rv.sort_order,
            category_name=rv.category.name,
            data_type="System-managed" if rv.is_system_managed else "Configurable",
            usage_impact="Available for new production structure records",
            updated_at=rv.updated_at.isoformat() if rv.updated_at else "",
            is_system_managed=rv.is_system_managed,
            is_configurable=rv.is_configurable,
        )

    @classmethod
    def from_user(cls, user) -> "LegacyReferenceItemResult":
        try:
            role_profile = user.role_profile
            role = role_profile.get_role_display()
            department = role_profile.department
            plant = role_profile.plant
        except UserRole.DoesNotExist:
            role = "Guest"
            department = ""
            plant = ""
        details = [value for value in (role, department, plant, user.email) if value]
        return cls(
            id=strawberry.ID(f"user:{user.id}"),
            table_type="staff_user",
            code=user.username,
            name=user.get_full_name() or user.username,
            description=" - ".join(details),
            usage_context="Managed by staff/user workflow",
            is_active=user.is_active,
            sort_order=user.id,
            category_name="People",
            data_type="Managed by workflow",
            usage_impact="Used by manager and supervisor assignments",
            updated_at=user.last_login.isoformat() if user.last_login else user.date_joined.isoformat(),
            is_system_managed=True,
            is_configurable=True,
            username=user.username,
            role=role,
            department=department,
            plant=plant,
            email=user.email,
        )

    @classmethod
    def from_user_role(cls, role) -> "LegacyReferenceItemResult":
        user = role.user
        department = role.department or "Unassigned department"
        plant = role.plant or "Unassigned plant"
        return cls(
            id=strawberry.ID(f"user_role:{role.id}"),
            table_type="staff_assignment",
            code=user.username,
            name=user.get_full_name() or user.username,
            description=f"{role.get_role_display()} - {department} - {plant}",
            usage_context="Managed by staff assignment workflow",
            is_active=user.is_active,
            sort_order=role.id,
            category_name="People",
            data_type="Managed by workflow",
            usage_impact=f"Feeds ownership, staffing and employee counts for {department} / {plant}",
            updated_at=user.last_login.isoformat() if user.last_login else user.date_joined.isoformat(),
            is_system_managed=True,
            is_configurable=True,
            username=user.username,
            role=role.get_role_display(),
            department=department,
            plant=plant,
            email=user.email,
        )


TABLE_TYPE_TO_CATEGORY = {
    "production_calendar": "calendar",
    "shift_pattern": "shift_model",
    "language": "language",
    "timezone": "timezone",
    "manufacturing_type": "plant_type",
    "work_center_type": "department_type",
    "machine_type": "resource_type",
    "operation_code": "resource_capability",
    "routing_type": "product_line",
    "material_category": "manufacturing_focus",
    "inventory_type": "resource_group_type",
    "kanban_type": "lean_methodology",
    "industry_type": "industry_type",
    "container_type": "industry_type",
    "unit_type": "schedule",
    "downtime_code": "downtime_reason",
    "defect_code": "defect_type",
    "scrap_reason": "scrap_reason",
    "kaizen_category": "lean_value",
    "priority": "priority",
    "label_badge": "label_badge",
    "maintenance_type": "maintenance_type",
    "material_flow_type": "material_flow_type",
    "process_type": "process_type",
    "skill_type": "skill_type",
    "role": "role",
    "shift_team": "shift_team",
    "product_model": "product_model",
    "production_family": "production_family",
}


def _table_type_to_category(table_type: str) -> str:
    return TABLE_TYPE_TO_CATEGORY.get(table_type, table_type)


WORKFLOW_MANAGED_REFERENCE_TABLES = set()


def _validate_reference_item_input(input, current_id=None):
    errors = []
    if input.table_type in WORKFLOW_MANAGED_REFERENCE_TABLES:
        errors.append(MutationError(field="tableType", code="WORKFLOW_MANAGED", message="This table is managed by the staff workflow. Direct edits are not allowed."))
        return errors
    if input.table_type in {"staff_user", "staff_assignment"}:
        if not input.name.strip():
            errors.append(MutationError(field="name", code="REQUIRED", message="Name is required"))
        if input.table_type == "staff_assignment" and not (input.role or "").strip():
            errors.append(MutationError(field="role", code="REQUIRED", message="Role is required"))
        return errors
    if not input.code.strip():
        errors.append(MutationError(field="code", code="REQUIRED", message="Code is required"))
    if not input.name.strip():
        errors.append(MutationError(field="name", code="REQUIRED", message="Name is required"))
    if not (input.description or "").strip():
        errors.append(MutationError(field="description", code="REQUIRED", message="Description is required"))
    if not (input.usage_context or "").strip():
        errors.append(MutationError(field="usageContext", code="REQUIRED", message="Usage context is required"))
    cat_code = _table_type_to_category(input.table_type)
    duplicate = ReferenceValue.objects.filter(category__code=cat_code, code__iexact=input.code.strip())
    if current_id:
        duplicate = duplicate.exclude(id=current_id)
    if input.code.strip() and duplicate.exists():
        errors.append(MutationError(field="code", code="DUPLICATE", message="Code must be unique inside this table"))
    return errors


def _split_full_name(name):
    parts = name.strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _normalize_role(value):
    raw = (value or "").strip()
    if not raw:
        return UserRole.RoleType.GUEST
    choices = dict(UserRole.RoleType.choices)
    if raw in choices:
        return raw
    normalized = raw.lower().replace(" ", "_")
    if normalized in choices:
        return normalized
    for role_value, label in choices.items():
        if label.lower() == raw.lower():
            return role_value
    return UserRole.RoleType.GUEST


def _update_staff_user(item_id, input):
    try:
        user_id = item_id.split(":", 1)[1] if item_id.startswith("user:") else item_id
        user = User.objects.get(id=user_id)
    except (IndexError, User.DoesNotExist):
        return ReferenceItemPayload(errors=[MutationError(field="id", code="NOT_FOUND", message="Staff user not found")])
    if input.name is not None:
        user.first_name, user.last_name = _split_full_name(input.name)
    if input.email is not None:
        user.email = input.email.strip()
    if input.is_active is not None:
        user.is_active = input.is_active
    user.save()
    return ReferenceItemPayload(item=LegacyReferenceItemResult.from_user(user))


def _update_staff_assignment(item_id, input):
    try:
        role_id = item_id.split(":", 1)[1] if item_id.startswith("user_role:") else item_id
        role_profile = UserRole.objects.select_related("user").get(id=role_id)
    except (IndexError, UserRole.DoesNotExist):
        return ReferenceItemPayload(errors=[MutationError(field="id", code="NOT_FOUND", message="Staff assignment not found")])
    if input.name is not None:
        role_profile.user.first_name, role_profile.user.last_name = _split_full_name(input.name)
    if input.email is not None:
        role_profile.user.email = input.email.strip()
    if input.is_active is not None:
        role_profile.user.is_active = input.is_active
    role_profile.user.save()
    role_profile.role = _normalize_role(input.role)
    role_profile.department = (input.department or "").strip()
    role_profile.plant = (input.plant or "").strip()
    role_profile.save()
    return ReferenceItemPayload(item=LegacyReferenceItemResult.from_user_role(role_profile))


def _user(info):
    return info.context.user


@strawberry.type
class ManufacturingReferenceMutation:
    @strawberry.mutation
    def create_reference_item(self, info: Info, input: ReferenceItemInput) -> ReferenceItemPayload:
        ensure_access(user=_user(info), action="manage_reference_values")
        if input.table_type in {"staff_user", "staff_assignment"}:
            return ReferenceItemPayload(errors=[MutationError(field="tableType", code="UNSUPPORTED", message="Create staff users/assignments from the staff workflow; existing records can be edited here during development.")])
        validation_errors = _validate_reference_item_input(input)
        if validation_errors:
            return ReferenceItemPayload(errors=validation_errors)
        cat_code = _table_type_to_category(input.table_type)
        try:
            cat = ReferenceCategory.objects.get(code=cat_code)
        except ReferenceCategory.DoesNotExist:
            return ReferenceItemPayload(errors=[MutationError(field="tableType", code="INVALID", message=f"Unknown table type: {input.table_type}")])
        rv = ReferenceValue.objects.create(
            category=cat,
            code=input.code.strip(),
            name=input.name.strip(),
            description=input.description.strip(),
            usage_context=input.usage_context.strip(),
            sort_order=input.sort_order or 0,
            is_active=input.is_active if input.is_active is not None else True,
        )
        return ReferenceItemPayload(item=LegacyReferenceItemResult.from_ref_value(rv, input.table_type))


    @strawberry.mutation
    def update_reference_item(self, info: Info, id: str, input: ReferenceItemInput) -> ReferenceItemPayload:
        ensure_access(user=_user(info), action="manage_reference_values")
        validation_errors = _validate_reference_item_input(input, id)
        if validation_errors:
            return ReferenceItemPayload(errors=validation_errors)
        if input.table_type == "staff_user":
            return _update_staff_user(id, input)
        if input.table_type == "staff_assignment":
            return _update_staff_assignment(id, input)
        try:
            rv = ReferenceValue.objects.get(id=id)
        except ReferenceValue.DoesNotExist:
            return ReferenceItemPayload(errors=[MutationError(field="id", code="NOT_FOUND", message="Reference item not found")])
        if rv.is_system_managed or not rv.is_configurable:
            return ReferenceItemPayload(errors=[MutationError(field="id", code="SYSTEM_MANAGED", message="System-managed records cannot be edited here")])
        rv.code = input.code.strip()
        rv.name = input.name.strip()
        rv.description = input.description.strip()
        rv.usage_context = input.usage_context.strip()
        rv.sort_order = input.sort_order or 0
        if input.is_active is not None:
            rv.is_active = input.is_active
        rv.save()
        return ReferenceItemPayload(item=LegacyReferenceItemResult.from_ref_value(rv, input.table_type))


    @strawberry.mutation
    def deactivate_reference_item(self, info: Info, id: str) -> ReferenceItemPayload:
        ensure_access(user=_user(info), action="manage_reference_values")
        if id.startswith("user:"):
            try:
                user = User.objects.get(id=id.split(":", 1)[1])
            except (IndexError, User.DoesNotExist):
                return ReferenceItemPayload(errors=[MutationError(field="id", code="NOT_FOUND", message="Staff user not found")])
            user.is_active = False
            user.save(update_fields=["is_active"])
            return ReferenceItemPayload(item=LegacyReferenceItemResult.from_user(user))
        if id.startswith("user_role:"):
            try:
                role_profile = UserRole.objects.select_related("user").get(id=id.split(":", 1)[1])
            except (IndexError, UserRole.DoesNotExist):
                return ReferenceItemPayload(errors=[MutationError(field="id", code="NOT_FOUND", message="Staff assignment not found")])
            role_profile.user.is_active = False
            role_profile.user.save(update_fields=["is_active"])
            return ReferenceItemPayload(item=LegacyReferenceItemResult.from_user_role(role_profile))
        try:
            rv = ReferenceValue.objects.get(id=id)
        except ReferenceValue.DoesNotExist:
            return ReferenceItemPayload(errors=[MutationError(field="id", code="NOT_FOUND", message="Reference item not found")])
        if rv.is_system_managed or not rv.is_configurable:
            return ReferenceItemPayload(errors=[MutationError(field="id", code="SYSTEM_MANAGED", message="System-managed records cannot be deactivated here")])
        rv.is_active = False
        rv.save()
        return ReferenceItemPayload(item=LegacyReferenceItemResult.from_ref_value(rv, ""))

    # ── Routing ──


