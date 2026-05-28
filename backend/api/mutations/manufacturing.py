import json
import strawberry
import typing
from typing import Optional
from strawberry.types import Info
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.core.exceptions import ValidationError
from api.permissions import ensure_access
from api.types.manufacturing import (
    CompanyNode, CompanyPayload, CompanyInput,
    PlantNode, PlantPayload, PlantInput,
    ProductionLineNode, ProductionLinePayload, ProductionLineInput,
    DepartmentNode, DepartmentPayload, DepartmentInput,
    ResourceGroupNode, ResourceGroupPayload, ResourceGroupInput,
    ResourceNode, ResourcePayload, ResourceInput,
    MaterialBinNode, MaterialBinPayload, MaterialBinInput,
    ProductionLineDepartmentAssignmentNode, AssignmentPayload, AssignDepartmentInput, AssignDepartmentToLinesInput,
    ScheduleNode, SchedulePayload, ScheduleInput,
    ScheduleAssignmentNode, ScheduleAssignmentPayload, ScheduleAssignmentInput,
    ProfileNode, ProfilePayload, ProfileInput, WorkHistoryEntry, EducationEntry,
    MutationError, DeletePayload,
    WarehouseNode, WarehouseInput, WarehousePayload,
    RoutingNode, RoutingPayload, RoutingInput,
    RoutingStepNode, RoutingStepPayload, RoutingStepInput,
    ReorderStepsInput, SaveRoutingInput,
    ProductFamilyAssignmentNode, ProductModelAssignmentNode,
    ProductFamilyAssignmentPayload, ProductModelAssignmentPayload,
    ProductFamilyInput, ProductFamilyNode, ProductFamilyPayload,
    ProductModelInput, ProductModelNode, ProductModelPayload,
    ProductVariantInput, ProductVariantNode, ProductVariantPayload,
    PartNumberInput, PartNumberNode, PartNumberPayload,
    BomInput, BOMNode, BomPayload,
    CapacityPlanNode, CapacityPlanPayload, CapacityPlanCreateInput, CapacityPlanInputUpdateInput,
    CapacityScenarioNode, CapacityScenarioPayload, CapacityScenarioInput,
    WorkScheduleNode, WorkSchedulePayload, WorkScheduleInput, WorkScheduleUpdateInput,
    WorkShiftInput,     WorkShiftNode, WorkShiftPayload, WorkShiftInput, WorkShiftUpdateInput,
    CapacityProfileNode, CapacityProfilePayload, CapacityProfileInput, CapacityProfileUpdateInput,
    CapacityRecalculationJobNode, CapacityRecalculationPayload, CapacityRecalculationInput,
    CapacitySnapshotNode, LaborRequirementInput, LaborRequirementNode, LaborRequirementPayload,
    LaborRequirementUpdateInput, OperatorAssignmentInput, OperatorAssignmentNode,
    OperatorAssignmentPayload, OperatorAssignmentUpdateInput,
)
from api.types.auth import LoginInput, AuthPayload, UserNode
from api.auth_utils import encode_jwt
from manufacturing.domain.department_service import DepartmentService, DepartmentServiceError
from manufacturing.domain.structure_service import StructureService, StructureServiceError
from manufacturing.domain.material_bin_service import MaterialBinService, MaterialBinServiceError
from manufacturing.models import (
    Company, Plant, Department, ProductionLine, ResourceGroup, Resource,
    ProductionLineDepartmentAssignment, ProductionLineProductFamily, ProductionLineProductModel,
    Schedule, ScheduleAssignment,
    ReferenceValue, ReferenceCategory, ProductModel, UserRole,
    Routing, RoutingStep, LaborRequirement, OperatorAssignment,
)
from manufacturing.domain.plant_structure_rules import validate_plant_input
from manufacturing.domain.routing_service import RoutingService, RoutingValidationError
from manufacturing.domain.product_identity_service import ProductIdentityError, ProductIdentityService
from manufacturing.domain.capacity_service import (
    CapacityPlanService, CapacityValidationError, ScenarioSimulationService,
)


def _resolve_ref(model, ref_id: Optional[str]):
    if not ref_id:
        return None


def _parse_dt(value: Optional[str]):
    if not value:
        return None
    from datetime import datetime
    return datetime.fromisoformat(value)


def _validation_payload(payload_cls, exc: Exception):
    if isinstance(exc, ValidationError):
        return payload_cls(ok=False, errors=[MutationError(field="_form", code="VALIDATION", message="; ".join(exc.messages))])
    return payload_cls(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])


def _product_identity_error(payload_cls, exc: ProductIdentityError):
    return payload_cls(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])
    try:
        return model.objects.get(id=ref_id)
    except model.DoesNotExist:
        return None


def _set_refs(plant, input: PlantInput):
    if input.status_id is not None:
        ref = _resolve_ref(ReferenceValue, input.status_id)
        plant.status_id = ref
        if ref:
            plant.status = ref.code
    if input.country_id is not None:
        ref = _resolve_ref(ReferenceValue, input.country_id)
        plant.country_id = ref
    if input.timezone_id is not None:
        ref = _resolve_ref(ReferenceValue, input.timezone_id)
        plant.timezone_id = ref
    if input.plant_type_id is not None:
        ref = _resolve_ref(ReferenceValue, input.plant_type_id)
        plant.plant_type_id = ref
    if input.default_calendar_id is not None:
        ref = _resolve_ref(ReferenceValue, input.default_calendar_id)
        plant.default_calendar_id = ref
    if input.default_shift_model_id is not None:
        ref = _resolve_ref(ReferenceValue, input.default_shift_model_id)
        plant.default_shift_model_id = ref
    if input.week_start_day_id is not None:
        ref = _resolve_ref(ReferenceValue, input.week_start_day_id)
        plant.week_start_day_id = ref
    if input.default_schedule_id is not None:
        ref = _resolve_ref(ReferenceValue, input.default_schedule_id)
        plant.default_schedule_id = ref
    if input.manufacturing_focus_ids is not None:
        refs = ReferenceValue.objects.filter(id__in=input.manufacturing_focus_ids)
        plant.manufacturing_focus_refs.set(refs)


def _structure_error_payload(exc: StructureServiceError):
    return [MutationError(field=exc.field, code=exc.code, message=exc.message)]


def _set_line_refs(line: ProductionLine, input: ProductionLineInput):
    ref_fields = (
        ("status_id", "status_id"),
        ("line_type_id", "line_type_id"),
        ("shift_pattern_id", "shift_pattern_id"),
        ("default_calendar_id", "default_calendar_id"),
        ("week_start_day_id", "week_start_day_id"),
        ("timezone_id", "timezone_id"),
        ("capacity_uom_id", "capacity_uom_id"),
    )
    for input_field, model_field in ref_fields:
        if getattr(input, input_field) is not None:
            value = getattr(input, input_field)
            setattr(line, model_field, _resolve_ref(ReferenceValue, value) if value else None)

    if input.bottleneck_resource_group_id is not None:
        line.bottleneck_resource_group = _resolve_ref(ResourceGroup, input.bottleneck_resource_group_id) if input.bottleneck_resource_group_id else None


def _sync_line_product_scope(line: ProductionLine, input: ProductionLineInput):
    if not input.product_family_id:
        raise ValueError("Product family is required")

    family = ReferenceValue.objects.filter(id=input.product_family_id, category__code="production_family").first()
    if not family:
        raise ValueError("Product family is invalid")

    model_ids = input.product_model_ids or []
    if (input.status or line.status or "").upper() == "ACTIVE" and not model_ids:
        raise ValueError("At least one product model is required before activation")
    if input.primary_product_model_id and input.primary_product_model_id not in model_ids:
        raise ValueError("Primary model must be one of the selected models")

    models = list(ReferenceValue.objects.filter(id__in=model_ids, category__code="product_model"))
    if len(models) != len(set(model_ids)):
        raise ValueError("One or more product models are invalid")

    invalid_models = [
        model for model in models
        if (model.metadata or {}).get("family") != family.code
        and str((model.metadata or {}).get("familyId") or "") != str(family.id)
    ]
    if invalid_models:
        raise ValueError("Selected product models must belong to the selected product family")

    ProductionLineProductFamily.objects.filter(production_line=line).exclude(product_family=family).delete()
    family_assignment, _ = ProductionLineProductFamily.objects.update_or_create(
        production_line=line,
        product_family=family,
        defaults={"is_primary": True, "status": "ACTIVE"},
    )
    ProductionLineProductFamily.objects.filter(production_line=line).exclude(id=family_assignment.id).update(is_primary=False)

    ProductionLineProductModel.objects.filter(production_line=line).exclude(product_model_id__in=model_ids).delete()
    for model in models:
        ProductionLineProductModel.objects.update_or_create(
            production_line=line,
            product_model=model,
            defaults={
                "product_family": family,
                "is_primary": str(model.id) == str(input.primary_product_model_id),
                "status": "ACTIVE",
            },
        )
    if input.primary_product_model_id:
        ProductionLineProductModel.objects.filter(production_line=line).exclude(product_model_id=input.primary_product_model_id).update(is_primary=False)
    else:
        ProductionLineProductModel.objects.filter(production_line=line).update(is_primary=False)


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
    def from_ref_value(cls, rv: ReferenceValue, table_type: str) -> "LegacyReferenceItemResult":
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
    def from_user(cls, user: User) -> "LegacyReferenceItemResult":
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
    def from_user_role(cls, role: UserRole) -> "LegacyReferenceItemResult":
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


TABLE_TYPE_TO_CATEGORY: dict[str, str] = {
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


WORKFLOW_MANAGED_REFERENCE_TABLES: set[str] = set()


def _validate_reference_item_input(input: ReferenceItemInput, current_id: Optional[str] = None) -> list[MutationError]:
    errors: list[MutationError] = []
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


def _split_full_name(name: str) -> tuple[str, str]:
    parts = name.strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _normalize_role(value: str | None) -> str:
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


def _update_staff_user(item_id: str, input: ReferenceItemInput) -> ReferenceItemPayload:
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


def _update_staff_assignment(item_id: str, input: ReferenceItemInput) -> ReferenceItemPayload:
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


_REF_TEXT_MAP: dict[str, str] = {
    "status_id": "status",
    "industry_type_id": "industry_type",
    "default_timezone_id": "default_timezone",
    "default_language_id": "default_language",
    "default_shift_model_id": "default_shift_model",
    "country_id": "country",
    "default_calendar_id": "default_calendar",
    "week_start_day_id": "week_start_day",
}

def _set_company_refs(company, input: CompanyInput):
    for ref_field, text_field in _REF_TEXT_MAP.items():
        v = getattr(input, ref_field, None)
        if v is not None:
            ref = _resolve_ref(ReferenceValue, v)
            setattr(company, ref_field, ref)
            if ref and text_field:
                setattr(company, text_field, ref.name)
    if input.product_line_ids is not None:
        refs = ReferenceValue.objects.filter(id__in=input.product_line_ids)
        company.product_line_refs.set(refs)
    if input.lean_methodology_ids is not None:
        refs = ReferenceValue.objects.filter(id__in=input.lean_methodology_ids)
        company.lean_methodology_refs.set(refs)

def _user(info):
    return info.context.user


@strawberry.type
class ManufacturingMutation:
    @strawberry.mutation
    def update_profile(self, info: Info, input: ProfileInput) -> ProfilePayload:
        ensure_access(user=_user(info), action="update_profile")
        from manufacturing.models.profile import Profile as ProfileModel
        obj = ProfileModel.objects.first()
        if not obj:
            return ProfilePayload(errors=[MutationError(field=None, code="NOT_FOUND", message="No profile found")])
        for f in ("name", "role", "email", "phone", "location", "plant", "department", "language", "about"):
            v = getattr(input, f)
            if v is not None:
                setattr(obj, f, v)
        if input.reports_to is not None:
            obj.reports_to = input.reports_to
        if input.work_history is not None:
            obj.work_history = [{"id": w.id, "role": w.role, "company": w.company, "period": w.period, "description": w.description} for w in input.work_history]
        if input.education is not None:
            obj.education = [{"id": e.id, "degree": e.degree, "school": e.school, "period": e.period} for e in input.education]
        obj.save()
        def e_dict(e: "EducationEntry") -> dict:
            return {"id": e.id, "degree": e.degree, "school": e.school, "period": e.period}
        def w_dict(w: "WorkHistoryEntry") -> dict:
            return {"id": w.id, "role": w.role, "company": w.company, "period": w.period, "description": w.description}
        return ProfilePayload(
            profile=ProfileNode(
                id=strawberry.ID(str(obj.id)), name=obj.name, role=obj.role,
                email=obj.email, phone=obj.phone or "", location=obj.location or "",
                plant=obj.plant or "", department=obj.department or "",
                reports_to=obj.reports_to or "", language=obj.language or "",
                about=obj.about or "",
                created_at=obj.created_at.isoformat() if obj.created_at else "",
                updated_at=obj.updated_at.isoformat() if obj.updated_at else "",
                work_history=[WorkHistoryEntry(**w) for w in (obj.work_history or [])],
                education=[EducationEntry(**e) for e in (obj.education or [])],
            )
        )

    @strawberry.mutation
    def login(self, input: LoginInput) -> Optional[AuthPayload]:
        user = authenticate(username=input.username, password=input.password)
        if user is None:
            return None
        try:
            rp = user.role_profile
            role = rp.role
            plant = rp.plant or ""
            department = rp.department or ""
        except Exception:
            role = "guest"
            plant = ""
            department = ""
        return AuthPayload(
            token=encode_jwt(user.id, role),
            user=UserNode(
                id=str(user.id), name=user.get_full_name() or user.username, username=user.username, email=user.email or "",
                role=role, plant=plant,
                department=department,
            ),
        )

    @strawberry.mutation
    def create_company(self, input: CompanyInput) -> CompanyPayload:
        try:
            company = StructureService.create_company(input)
            return CompanyPayload(ok=True, company=CompanyNode.from_db(company))
        except StructureServiceError as exc:
            return CompanyPayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def update_company(self, input: CompanyInput) -> CompanyPayload:
        try:
            company = StructureService.update_primary_company(input)
            return CompanyPayload(ok=True, company=CompanyNode.from_db(company))
        except StructureServiceError as exc:
            return CompanyPayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def delete_company(self) -> CompanyPayload:
        try:
            StructureService.delete_primary_company()
            return CompanyPayload(ok=True)
        except StructureServiceError as exc:
            return CompanyPayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def create_plant(self, input: PlantInput, company_id: Optional[str] = strawberry.UNSET) -> PlantPayload:
        domain_errors = validate_plant_input(input.code or "", input.name or "")
        if domain_errors:
            return PlantPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message) for e in domain_errors])
        try:
            company = None if company_id is strawberry.UNSET else company_id
            plant = StructureService.create_plant(input, company or str(Company.objects.first().id) if Company.objects.exists() else None)
            return PlantPayload(ok=True, plant=PlantNode.from_db(plant))
        except StructureServiceError as exc:
            return PlantPayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def update_plant(self, id: str, input: PlantInput, company_id: Optional[str] = strawberry.UNSET) -> PlantPayload:
        try:
            plant = StructureService.update_plant(id, input, None if company_id is strawberry.UNSET else company_id)
            return PlantPayload(ok=True, plant=PlantNode.from_db(plant))
        except StructureServiceError as exc:
            return PlantPayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def archive_plant(self, id: str) -> PlantPayload:
        try:
            plant = StructureService.archive_plant(id)
            return PlantPayload(ok=True, plant=PlantNode.from_db(plant))
        except StructureServiceError as exc:
            return PlantPayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def create_production_line(self, input: ProductionLineInput) -> ProductionLinePayload:
        try:
            line = StructureService.create_production_line(input)
            _sync_line_product_scope(line, input)
            return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))
        except StructureServiceError as exc:
            return ProductionLinePayload(ok=False, errors=_structure_error_payload(exc))
        except ValueError as exc:
            return ProductionLinePayload(ok=False, errors=[MutationError(field="productModels", code="VALIDATION", message=str(exc))])

    @strawberry.mutation
    def update_production_line(self, id: str, input: ProductionLineInput) -> ProductionLinePayload:
        try:
            line = StructureService.update_production_line(id, input)
            _sync_line_product_scope(line, input)
            return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))
        except StructureServiceError as exc:
            return ProductionLinePayload(ok=False, errors=_structure_error_payload(exc))
        except ValueError as exc:
            return ProductionLinePayload(ok=False, errors=[MutationError(field="productModels", code="VALIDATION", message=str(exc))])

    @strawberry.mutation
    def archive_production_line(self, id: str) -> ProductionLinePayload:
        try:
            line = StructureService.archive_production_line(id)
            return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))
        except StructureServiceError as exc:
            return ProductionLinePayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def create_department(self, input: DepartmentInput) -> DepartmentPayload:
        try:
            dept = DepartmentService.create(input)
            return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))
        except DepartmentServiceError as exc:
            return DepartmentPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    def update_department(self, id: str, input: DepartmentInput) -> DepartmentPayload:
        try:
            dept = DepartmentService.update(id, input)
            return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))
        except DepartmentServiceError as exc:
            return DepartmentPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    def archive_department(self, id: str) -> DepartmentPayload:
        try:
            dept = StructureService.archive_department(id)
            return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))
        except StructureServiceError as exc:
            return DepartmentPayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def delete_department(self, id: str) -> DeletePayload:
        try:
            DepartmentService.delete(id)
            return DeletePayload(success=True, in_use=False, message="Department deleted.")
        except DepartmentServiceError as exc:
            return DeletePayload(
                success=False,
                in_use=exc.code.startswith("IN_USE"),
                message=exc.message,
                errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)],
            )

    @strawberry.mutation
    def assign_department_to_production_lines(self, input: AssignDepartmentToLinesInput) -> DepartmentPayload:
        try:
            dept = DepartmentService.assign_to_lines(str(input.department_id), input.production_line_ids)
            return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))
        except DepartmentServiceError as exc:
            return DepartmentPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    def assign_department_to_production_line(self, input: AssignDepartmentInput) -> AssignmentPayload:
        try:
            a = StructureService.assign_department_to_production_line(
                str(input.production_line_id),
                str(input.department_id),
                input.sequence or 0,
                input.status or "ACTIVE",
            )
        except StructureServiceError as exc:
            return AssignmentPayload(ok=False, errors=_structure_error_payload(exc))
        return AssignmentPayload(ok=True, assignment=ProductionLineDepartmentAssignmentNode.from_db(a))

    @strawberry.mutation
    def remove_department_from_production_line(self, production_line_id: str, department_id: str) -> AssignmentPayload:
        deleted = StructureService.remove_department_from_production_line(production_line_id, department_id)
        return AssignmentPayload(ok=deleted)

    @strawberry.mutation
    def create_resource_group(self, input: ResourceGroupInput) -> ResourceGroupPayload:
        try:
            rg = StructureService.create_resource_group(input)
            return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))
        except StructureServiceError as exc:
            return ResourceGroupPayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def update_resource_group(self, id: str, input: ResourceGroupInput) -> ResourceGroupPayload:
        try:
            rg = StructureService.update_resource_group(id, input)
            return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))
        except StructureServiceError as exc:
            return ResourceGroupPayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def archive_resource_group(self, id: str) -> ResourceGroupPayload:
        try:
            rg = StructureService.archive_resource_group(id)
            return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))
        except StructureServiceError as exc:
            return ResourceGroupPayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def create_resource(self, input: ResourceInput) -> ResourcePayload:
        try:
            res = StructureService.create_resource(input)
            return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))
        except StructureServiceError as exc:
            return ResourcePayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def update_resource(self, id: str, input: ResourceInput) -> ResourcePayload:
        try:
            res = StructureService.update_resource(id, input)
            return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))
        except StructureServiceError as exc:
            return ResourcePayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def archive_resource(self, id: str) -> ResourcePayload:
        try:
            res = StructureService.archive_resource(id)
            return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))
        except StructureServiceError as exc:
            return ResourcePayload(ok=False, errors=_structure_error_payload(exc))

    @strawberry.mutation
    def create_material_bin(self, input: MaterialBinInput) -> MaterialBinPayload:
        try:
            bin_obj = MaterialBinService.create_bin({
                "plant_id": input.plant_id,
                "production_line_id": input.production_line_id,
                "resource_group_id": input.resource_group_id,
                "code": input.code,
                "name": input.name,
                "description": input.description,
                "bin_type": input.bin_type,
                "material_id": input.material_id,
                "material_group": input.material_group,
                "capacity": input.capacity,
                "uom_id": input.uom_id,
                "replenishment_mode": input.replenishment_mode,
                "fifo_enabled": input.fifo_enabled,
                "supermarket_enabled": input.supermarket_enabled,
                "location_code": input.location_code,
                "location_reference": input.location_reference,
                "warehouse_code": input.warehouse_code,
                "is_active": input.is_active,
            })
            return MaterialBinPayload(ok=True, material_bin=MaterialBinNode.from_db(bin_obj))
        except MaterialBinServiceError as exc:
            return MaterialBinPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message, details=json.dumps(exc.details) if exc.details else None)])
        except Exception as exc:
            return MaterialBinPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    def update_material_bin(self, id: str, input: MaterialBinInput) -> MaterialBinPayload:
        try:
            bin_obj = MaterialBinService.update_bin(id, {
                "plant_id": input.plant_id,
                "production_line_id": input.production_line_id,
                "resource_group_id": input.resource_group_id,
                "code": input.code,
                "name": input.name,
                "description": input.description,
                "bin_type": input.bin_type,
                "material_id": input.material_id,
                "material_group": input.material_group,
                "capacity": input.capacity,
                "uom_id": input.uom_id,
                "replenishment_mode": input.replenishment_mode,
                "fifo_enabled": input.fifo_enabled,
                "supermarket_enabled": input.supermarket_enabled,
                "location_code": input.location_code,
                "location_reference": input.location_reference,
                "warehouse_code": input.warehouse_code,
                "is_active": input.is_active,
            })
            return MaterialBinPayload(ok=True, material_bin=MaterialBinNode.from_db(bin_obj))
        except MaterialBinServiceError as exc:
            return MaterialBinPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message, details=json.dumps(exc.details) if exc.details else None)])
        except Exception as exc:
            return MaterialBinPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    def archive_material_bin(self, id: str) -> MaterialBinPayload:
        try:
            bin_obj = MaterialBinService.archive_bin(id)
            return MaterialBinPayload(ok=True, material_bin=MaterialBinNode.from_db(bin_obj))
        except MaterialBinServiceError as exc:
            return MaterialBinPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message, details=json.dumps(exc.details) if exc.details else None)])

    @strawberry.mutation
    def create_warehouse(self, info: Info, input: WarehouseInput) -> WarehousePayload:
        ensure_access(user=_user(info), action="manage_warehouses")
        from manufacturing.models import Warehouse
        try:
            warehouse = Warehouse.objects.create(
                plant_id=input.plant_id,
                code=input.code,
                name=input.name,
                warehouse_type=input.warehouse_type or "GENERAL",
                location=input.location or "",
                is_active=input.is_active if input.is_active is not None else True,
            )
            return WarehousePayload(ok=True, warehouse=WarehouseNode.from_db(warehouse))
        except Exception as exc:
            return WarehousePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    def update_warehouse(self, info: Info, id: str, input: WarehouseInput) -> WarehousePayload:
        ensure_access(user=_user(info), action="manage_warehouses")
        from manufacturing.models import Warehouse
        try:
            warehouse = Warehouse.objects.get(id=id)
        except Warehouse.DoesNotExist:
            return WarehousePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Warehouse not found")])
        try:
            warehouse.plant_id = input.plant_id
            warehouse.code = input.code
            warehouse.name = input.name
            if input.warehouse_type is not None:
                warehouse.warehouse_type = input.warehouse_type
            if input.location is not None:
                warehouse.location = input.location
            if input.is_active is not None:
                warehouse.is_active = input.is_active
            warehouse.save()
            return WarehousePayload(ok=True, warehouse=WarehouseNode.from_db(warehouse))
        except Exception as exc:
            return WarehousePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    def archive_warehouse(self, info: Info, id: str) -> WarehousePayload:
        ensure_access(user=_user(info), action="manage_warehouses")
        from manufacturing.models import Warehouse
        try:
            warehouse = Warehouse.objects.get(id=id)
        except Warehouse.DoesNotExist:
            return WarehousePayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Warehouse not found")])
        try:
            warehouse.is_active = False
            warehouse.save()
            return WarehousePayload(ok=True, warehouse=WarehouseNode.from_db(warehouse))
        except Exception as exc:
            return WarehousePayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(exc))])

    @strawberry.mutation
    def create_schedule(self, info: Info, input: ScheduleInput) -> SchedulePayload:
        ensure_access(user=_user(info), action="manage_schedules")
        s = Schedule.objects.create(
            code=input.code, name=input.name, description=input.description or "",
            status=input.status or "ACTIVE",
        )
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))

    @strawberry.mutation
    def update_schedule(self, info: Info, id: str, input: ScheduleInput) -> SchedulePayload:
        ensure_access(user=_user(info), action="manage_schedules")
        try:
            s = Schedule.objects.get(id=id)
        except Schedule.DoesNotExist:
            return SchedulePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Schedule not found"}])
        for f in ("code", "name", "description", "status"):
            v = getattr(input, f)
            if v is not None:
                setattr(s, f, v)
        s.save()
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))

    @strawberry.mutation
    def archive_schedule(self, info: Info, id: str) -> SchedulePayload:
        ensure_access(user=_user(info), action="manage_schedules")
        try:
            s = Schedule.objects.get(id=id)
        except Schedule.DoesNotExist:
            return SchedulePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Schedule not found"}])
        s.status = "ARCHIVED"
        s.save()
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))

    @strawberry.mutation
    def assign_schedule(self, info: Info, input: ScheduleAssignmentInput) -> ScheduleAssignmentPayload:
        ensure_access(user=_user(info), action="manage_schedule_assignments")
        if input.work_schedule_id:
            from manufacturing.domain.schedule_assignment_service import ScheduleAssignmentError, ScheduleAssignmentService
            try:
                a = ScheduleAssignmentService.assign(
                    plant_id=str(input.plant_id or ""),
                    scope_type=input.entity_type,
                    scope_id=input.entity_id,
                    work_schedule_id=str(input.work_schedule_id),
                    effective_from=input.valid_from,
                    effective_to=input.valid_to,
                    priority=input.priority or 0,
                )
            except ScheduleAssignmentError as exc:
                return ScheduleAssignmentPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])
            return ScheduleAssignmentPayload(ok=True, assignment=ScheduleAssignmentNode.from_db(a))

        a = ScheduleAssignment.objects.create(
            entity_type=input.entity_type, entity_id=input.entity_id,
            schedule_id=input.schedule_id, inheritance_mode=input.inheritance_mode or "NONE",
            valid_from=input.valid_from, valid_to=input.valid_to,
            priority=input.priority or 0,
        )
        return ScheduleAssignmentPayload(ok=True, assignment=ScheduleAssignmentNode.from_db(a))

    @strawberry.mutation
    def remove_schedule_assignment(self, info: Info, id: str) -> ScheduleAssignmentPayload:
        ensure_access(user=_user(info), action="manage_schedule_assignments")
        deleted, _ = ScheduleAssignment.objects.filter(id=id).delete()
        return ScheduleAssignmentPayload(ok=deleted > 0)

    # ── Legacy reference item mutations ──

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

    @strawberry.mutation
    def create_product_family(self, input: ProductFamilyInput) -> ProductFamilyPayload:
        try:
            family = ProductIdentityService.create_family(input.__dict__)
            return ProductFamilyPayload(ok=True, family=ProductFamilyNode.from_db(family))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductFamilyPayload, exc)

    @strawberry.mutation
    def update_product_family(self, id: str, input: ProductFamilyInput) -> ProductFamilyPayload:
        try:
            family = ProductIdentityService.update_family(id, input.__dict__)
            return ProductFamilyPayload(ok=True, family=ProductFamilyNode.from_db(family))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductFamilyPayload, exc)

    @strawberry.mutation
    def archive_product_family(self, id: str) -> ProductFamilyPayload:
        try:
            family = ProductIdentityService.archive_family(id)
            return ProductFamilyPayload(ok=True, family=ProductFamilyNode.from_db(family))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductFamilyPayload, exc)

    @strawberry.mutation
    def create_product_model(self, input: ProductModelInput) -> ProductModelPayload:
        try:
            model = ProductIdentityService.create_model(input.__dict__)
            return ProductModelPayload(ok=True, model=ProductModelNode.from_db(model))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductModelPayload, exc)

    @strawberry.mutation
    def update_product_model(self, id: str, input: ProductModelInput) -> ProductModelPayload:
        try:
            model = ProductIdentityService.update_model(id, input.__dict__)
            return ProductModelPayload(ok=True, model=ProductModelNode.from_db(model))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductModelPayload, exc)

    @strawberry.mutation
    def archive_product_model(self, id: str) -> ProductModelPayload:
        try:
            model = ProductIdentityService.archive_model(id)
            return ProductModelPayload(ok=True, model=ProductModelNode.from_db(model))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductModelPayload, exc)

    @strawberry.mutation
    def create_product_variant(self, input: ProductVariantInput) -> ProductVariantPayload:
        try:
            variant = ProductIdentityService.create_variant(input.__dict__)
            return ProductVariantPayload(ok=True, variant=ProductVariantNode.from_db(variant))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductVariantPayload, exc)

    @strawberry.mutation
    def update_product_variant(self, id: str, input: ProductVariantInput) -> ProductVariantPayload:
        try:
            variant = ProductIdentityService.update_variant(id, input.__dict__)
            return ProductVariantPayload(ok=True, variant=ProductVariantNode.from_db(variant))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductVariantPayload, exc)

    @strawberry.mutation
    def archive_product_variant(self, id: str) -> ProductVariantPayload:
        try:
            variant = ProductIdentityService.archive_variant(id)
            return ProductVariantPayload(ok=True, variant=ProductVariantNode.from_db(variant))
        except ProductIdentityError as exc:
            return _product_identity_error(ProductVariantPayload, exc)

    @strawberry.mutation
    def create_part_number(self, input: PartNumberInput) -> PartNumberPayload:
        try:
            part = ProductIdentityService.create_part_number(input.__dict__)
            return PartNumberPayload(ok=True, part_number=PartNumberNode.from_db(part))
        except ProductIdentityError as exc:
            return _product_identity_error(PartNumberPayload, exc)

    @strawberry.mutation
    def update_part_number(self, id: str, input: PartNumberInput) -> PartNumberPayload:
        try:
            part = ProductIdentityService.update_part_number(id, input.__dict__)
            return PartNumberPayload(ok=True, part_number=PartNumberNode.from_db(part))
        except ProductIdentityError as exc:
            return _product_identity_error(PartNumberPayload, exc)

    @strawberry.mutation
    def archive_part_number(self, id: str) -> PartNumberPayload:
        try:
            part = ProductIdentityService.archive_part_number(id)
            return PartNumberPayload(ok=True, part_number=PartNumberNode.from_db(part))
        except ProductIdentityError as exc:
            return _product_identity_error(PartNumberPayload, exc)

    @strawberry.mutation
    def create_bom(self, input: BomInput) -> BomPayload:
        try:
            bom = RoutingService.create_bom(input.__dict__)
            return BomPayload(ok=True, bom=BOMNode.from_db(bom))
        except RoutingValidationError as exc:
            return BomPayload(ok=False, errors=[MutationError(field=exc.field, code="VALIDATION", message=exc.message)])

    @strawberry.mutation
    def update_bom(self, id: str, input: BomInput) -> BomPayload:
        try:
            bom = RoutingService.update_bom(id, input.__dict__)
            return BomPayload(ok=True, bom=BOMNode.from_db(bom))
        except RoutingValidationError as exc:
            return BomPayload(ok=False, errors=[MutationError(field=exc.field, code="VALIDATION", message=exc.message)])

    @strawberry.mutation
    def archive_bom(self, id: str) -> BomPayload:
        try:
            bom = RoutingService.update_bom(id, {"status": "ARCHIVED"})
            return BomPayload(ok=True, bom=BOMNode.from_db(bom))
        except RoutingValidationError as exc:
            return BomPayload(ok=False, errors=[MutationError(field=exc.field, code="VALIDATION", message=exc.message)])

    @strawberry.mutation
    def create_routing(self, input: RoutingInput) -> RoutingPayload:
        try:
            routing = RoutingService.create_routing({
                "production_line_id": input.production_line_id,
                "product_family_id": input.product_family_id,
                "product_model_id": input.product_model_id,
                "part_number_id": input.part_number_id,
                "version": input.version or "1.0",
                "status": input.status or "DRAFT",
                "effective_from": input.effective_from,
                "effective_to": input.effective_to,
                "notes": input.notes or "",
            })
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as e:
            return RoutingPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def update_routing(self, id: str, input: RoutingInput) -> RoutingPayload:
        try:
            data = {
                "production_line_id": input.production_line_id,
                "product_family_id": input.product_family_id,
                "product_model_id": input.product_model_id,
                "part_number_id": input.part_number_id,
                "version": input.version,
                "effective_from": input.effective_from,
                "effective_to": input.effective_to,
                "notes": input.notes,
            }
            if input.status:
                data["status"] = input.status
            routing = RoutingService.update_routing(id, data)
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as e:
            return RoutingPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def activate_routing(self, id: str) -> RoutingPayload:
        try:
            routing = RoutingService.activate_routing(id)
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as e:
            return RoutingPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def archive_routing(self, id: str) -> RoutingPayload:
        try:
            routing = RoutingService.archive_routing(id)
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as e:
            return RoutingPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def save_routing(self, input: SaveRoutingInput) -> RoutingPayload:
        try:
            routing = RoutingService.save_routing({
                "routing_id": input.routing_id,
                "production_line_id": input.production_line_id,
                "product_family_id": input.product_family_id,
                "product_model_id": input.product_model_id,
                "part_number_id": input.part_number_id,
                "version": input.version or "1.0",
                "notes": input.notes or "",
                "steps": [
                    {
                        "id": step.id,
                        "sequence": step.sequence,
                        "department_id": step.department_id,
                        "resource_group_id": step.resource_group_id,
                        "resource_id": step.resource_id,
                        "standard_work_id": step.standard_work_id,
                        "cycle_time_sec": step.cycle_time_sec,
                        "setup_time_sec": step.setup_time_sec,
                        "changeover_time_sec": step.changeover_time_sec,
                        "required_operators": step.required_operators,
                        "schedule_source": step.schedule_source or "LINE",
                        "buffer_type": step.buffer_type,
                        "wip_min": step.wip_min,
                        "wip_max": step.wip_max,
                        "quality_checkpoint": step.quality_checkpoint or False,
                        "rework_allowed": step.rework_allowed or False,
                        "notes": step.notes or "",
                        "material_inputs": [
                            {
                                "id": item.id,
                                "material_id": item.material_id,
                                "quantity": item.quantity,
                                "material_state": item.material_state,
                                "location_id": item.location_id,
                                "bin_id": item.bin_id,
                            }
                            for item in step.material_inputs
                        ],
                        "material_outputs": [
                            {
                                "id": item.id,
                                "material_id": item.material_id,
                                "quantity": item.quantity,
                                "material_state": item.material_state,
                                "location_id": item.location_id,
                                "bin_id": item.bin_id,
                            }
                            for item in step.material_outputs
                        ],
                        "movement_rule": {
                            "rule_type": step.movement_rule.rule_type,
                            "source_location_id": step.movement_rule.source_location_id,
                            "destination_location_id": step.movement_rule.destination_location_id,
                            "source_bin_id": step.movement_rule.source_bin_id,
                            "destination_bin_id": step.movement_rule.destination_bin_id,
                            "notes": step.movement_rule.notes or "",
                        } if step.movement_rule else None,
                    }
                    for step in input.steps
                ],
            })
            return RoutingPayload(ok=True, routing=RoutingNode.from_db(routing))
        except RoutingValidationError as e:
            return RoutingPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def create_routing_step(self, input: RoutingStepInput) -> RoutingStepPayload:
        try:
            step = RoutingService.add_step(input.routing_id, {
                "sequence": input.sequence,
                "department_id": input.department_id,
                "resource_group_id": input.resource_group_id,
                "resource_id": input.resource_id,
                "standard_work_id": input.standard_work_id,
                "cycle_time_sec": input.cycle_time_sec,
                "setup_time_sec": input.setup_time_sec,
                "changeover_time_sec": input.changeover_time_sec,
                "required_operators": input.required_operators,
                "schedule_source": input.schedule_source or "LINE",
                "buffer_type": input.buffer_type,
                "wip_min": input.wip_min,
                "wip_max": input.wip_max,
                "quality_checkpoint": input.quality_checkpoint or False,
                "rework_allowed": input.rework_allowed or False,
                "notes": input.notes or "",
            })
            return RoutingStepPayload(ok=True, step=RoutingStepNode.from_db(step))
        except RoutingValidationError as e:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def update_routing_step(self, id: str, input: RoutingStepInput) -> RoutingStepPayload:
        try:
            data = {
                "sequence": input.sequence,
                "department_id": input.department_id,
                "resource_group_id": input.resource_group_id,
                "resource_id": input.resource_id,
                "standard_work_id": input.standard_work_id,
                "cycle_time_sec": input.cycle_time_sec,
                "setup_time_sec": input.setup_time_sec,
                "changeover_time_sec": input.changeover_time_sec,
                "required_operators": input.required_operators,
                "schedule_source": input.schedule_source,
                "buffer_type": input.buffer_type,
                "wip_min": input.wip_min,
                "wip_max": input.wip_max,
                "quality_checkpoint": input.quality_checkpoint,
                "rework_allowed": input.rework_allowed,
                "notes": input.notes,
            }
            step = RoutingService.update_step(id, data)
            return RoutingStepPayload(ok=True, step=RoutingStepNode.from_db(step))
        except RoutingValidationError as e:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def delete_routing_step(self, id: str) -> RoutingStepPayload:
        try:
            RoutingService.delete_step(id)
            return RoutingStepPayload(ok=True)
        except RoutingValidationError as e:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    @strawberry.mutation
    def reorder_routing_steps(self, input: ReorderStepsInput) -> RoutingStepPayload:
        try:
            RoutingService.reorder_steps(input.routing_id, input.ordered_step_ids)
            return RoutingStepPayload(ok=True)
        except RoutingValidationError as e:
            return RoutingStepPayload(ok=False, errors=[MutationError(field=e.field, code="VALIDATION", message=e.message)])

    # ── Capacity Planning ──

    @strawberry.mutation
    def create_capacity_plan(self, info: Info, input: CapacityPlanCreateInput) -> CapacityPlanPayload:
        try:
            plan = CapacityPlanService.create_plan({
                "plant_id": input.plant_id,
                "production_line_id": input.production_line_id,
                "product_model_id": input.product_model_id,
                "routing_version_id": input.routing_version_id,
                "planning_horizon_start": input.planning_horizon_start,
                "planning_horizon_end": input.planning_horizon_end,
            }, user=getattr(info.context, "user", None))
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])
        except Exception as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def update_capacity_plan_input(self, info: Info, input: CapacityPlanInputUpdateInput) -> CapacityPlanPayload:
        try:
            plan = CapacityPlanService.update_inputs(str(input.capacity_plan_id), {
                "planned_quantity": input.planned_quantity,
                "efficiency_factor": input.efficiency_factor,
            }, user=getattr(info.context, "user", None))
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def calculate_capacity_plan(self, info: Info, id: str) -> CapacityPlanPayload:
        try:
            plan = CapacityPlanService.calculate_plan(id, user=getattr(info.context, "user", None))
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def create_capacity_scenario(self, input: CapacityScenarioInput) -> CapacityScenarioPayload:
        try:
            plan = CapacityPlanService._get_plan(str(input.capacity_plan_id))
            scenario = ScenarioSimulationService.create(plan, input.name, input.assumptions_json or {})
            return CapacityScenarioPayload(ok=True, scenario=CapacityScenarioNode.from_db(scenario))
        except CapacityValidationError as e:
            return CapacityScenarioPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def approve_capacity_plan(self, info: Info, id: str) -> CapacityPlanPayload:
        try:
            plan = CapacityPlanService.approve_plan(id, user=getattr(info.context, "user", None))
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def archive_capacity_plan(self, info: Info, id: str) -> CapacityPlanPayload:
        try:
            plan = CapacityPlanService.archive_plan(id, user=getattr(info.context, "user", None))
            return CapacityPlanPayload(ok=True, plan=CapacityPlanNode.from_db(plan))
        except CapacityValidationError as e:
            return CapacityPlanPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    # ── Product Family / Model Assignments ──

    @strawberry.mutation
    def assign_families_to_production_line(self, info: Info, production_line_id: str, family_ids: list[str], primary_family_id: typing.Optional[str] = None) -> ProductFamilyAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            line = ProductionLine.objects.get(id=production_line_id)
        except ProductionLine.DoesNotExist:
            return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Production line not found")])
        try:
            if len(family_ids) != 1:
                return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="familyIds", code="ONE_FAMILY_REQUIRED", message="Production line requires exactly one product family")])
            primary_family_id = family_ids[0]
            existing = {a.product_family_id: a for a in ProductionLineProductFamily.objects.filter(production_line=line)}
            new_ids = set(family_ids)
            # Remove unselected
            for fam_id, assignment in list(existing.items()):
                if fam_id not in new_ids:
                    ProductionLineProductModel.objects.filter(production_line=line, product_family_id=fam_id).delete()
                    assignment.delete()
            # Add new
            for fam_id in family_ids:
                if fam_id not in existing:
                    ProductionLineProductFamily.objects.create(
                        production_line=line,
                        product_family_id=fam_id,
                        is_primary=(fam_id == primary_family_id),
                    )
                elif fam_id == primary_family_id:
                    existing[fam_id].is_primary = True
                    existing[fam_id].save()
            # Ensure only one primary
            if primary_family_id:
                ProductionLineProductFamily.objects.filter(production_line=line).exclude(product_family_id=primary_family_id).update(is_primary=False)
            assignments = ProductionLineProductFamily.objects.filter(production_line=line).select_related("product_family").all()
            return ProductFamilyAssignmentPayload(ok=True, assignments=[ProductFamilyAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def remove_family_from_production_line(self, info: Info, production_line_id: str, family_id: str) -> ProductFamilyAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id, product_family_id=family_id).delete()
            ProductionLineProductFamily.objects.filter(production_line_id=production_line_id, product_family_id=family_id).delete()
            assignments = ProductionLineProductFamily.objects.filter(production_line_id=production_line_id).select_related("product_family").all()
            return ProductFamilyAssignmentPayload(ok=True, assignments=[ProductFamilyAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def assign_models_to_production_line(self, info: Info, production_line_id: str, model_ids: list[str], primary_model_id: typing.Optional[str] = None) -> ProductModelAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            line = ProductionLine.objects.get(id=production_line_id)
        except ProductionLine.DoesNotExist:
            return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="id", code="NOT_FOUND", message="Production line not found")])
        try:
            primary_fam = ProductionLineProductFamily.objects.filter(production_line=line, is_primary=True).first() or ProductionLineProductFamily.objects.filter(production_line=line).first()
            if not primary_fam:
                return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="productFamilyId", code="REQUIRED", message="Product family is required before assigning models")])
            if primary_model_id and primary_model_id not in model_ids:
                return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="primaryModelId", code="INVALID_PRIMARY", message="Primary model must be one of the selected models")])
            family = primary_fam.product_family
            selected_models = ReferenceValue.objects.filter(id__in=model_ids).select_related("category")
            invalid_models = [
                model for model in selected_models
                if model.category.code == "product_model"
                and (
                    (model.metadata or {}).get("familyId") not in (None, "", str(family.id))
                    or ((model.metadata or {}).get("family") not in (None, "", family.code))
                )
            ]
            if invalid_models:
                return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="modelIds", code="MODEL_FAMILY_MISMATCH", message="Selected product models must belong to the selected product family")])
            existing = {a.product_model_id: a for a in ProductionLineProductModel.objects.filter(production_line=line).select_related("product_model", "product_family")}
            new_ids = set(model_ids)
            for model_id, assignment in list(existing.items()):
                if model_id not in new_ids:
                    assignment.delete()
            default_family_id = primary_fam.product_family_id if primary_fam else None
            for idx, model_id in enumerate(model_ids):
                if model_id not in existing:
                    family_id = default_family_id
                    if not family_id:
                        continue
                    ProductionLineProductModel.objects.create(
                        production_line=line,
                        product_model_id=model_id,
                        product_family_id=family_id,
                        is_primary=False,
                    )
                elif model_id in existing and existing[model_id].product_family_id != default_family_id:
                    existing[model_id].product_family_id = default_family_id
                    existing[model_id].save()
            if primary_model_id:
                ProductionLineProductModel.objects.filter(production_line=line, product_model_id=primary_model_id).update(is_primary=True)
                ProductionLineProductModel.objects.filter(production_line=line).exclude(product_model_id=primary_model_id).update(is_primary=False)
            else:
                ProductionLineProductModel.objects.filter(production_line=line).update(is_primary=False)
            assignments = ProductionLineProductModel.objects.filter(production_line=line).select_related("product_model", "product_family").all()
            return ProductModelAssignmentPayload(ok=True, assignments=[ProductModelAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def remove_model_from_production_line(self, info: Info, production_line_id: str, model_id: str) -> ProductModelAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id, product_model_id=model_id).delete()
            assignments = ProductionLineProductModel.objects.filter(production_line_id=production_line_id).select_related("product_model", "product_family").all()
            return ProductModelAssignmentPayload(ok=True, assignments=[ProductModelAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def set_primary_production_line_family(self, info: Info, production_line_id: str, family_id: str) -> ProductFamilyAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            ProductionLineProductFamily.objects.filter(production_line_id=production_line_id).update(is_primary=False)
            ProductionLineProductFamily.objects.filter(production_line_id=production_line_id, product_family_id=family_id).update(is_primary=True)
            assignments = ProductionLineProductFamily.objects.filter(production_line_id=production_line_id).select_related("product_family").all()
            return ProductFamilyAssignmentPayload(ok=True, assignments=[ProductFamilyAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def set_primary_production_line_model(self, info: Info, production_line_id: str, model_id: str) -> ProductModelAssignmentPayload:
        ensure_access(user=_user(info), action="manage_line_product_scopes")
        try:
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id).update(is_primary=False)
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id, product_model_id=model_id).update(is_primary=True)
            assignments = ProductionLineProductModel.objects.filter(production_line_id=production_line_id).select_related("product_model", "product_family").all()
            return ProductModelAssignmentPayload(ok=True, assignments=[ProductModelAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    # ── New Work Schedule & Capacity Profile Mutations ──

    @strawberry.mutation
    def create_work_schedule(self, info: Info, input: WorkScheduleInput) -> WorkSchedulePayload:
        from datetime import datetime
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from manufacturing.domain.capacity_cascade_service import CapacityCascadeService
        try:
            schedule = ScheduleService.create_schedule(
                scope_type=input.scope_type,
                scope_id=input.scope_id,
                name=input.name,
                effective_from=datetime.fromisoformat(input.effective_from),
                effective_to=datetime.fromisoformat(input.effective_to) if input.effective_to else None,
                timezone=input.timezone or "",
            )
            from_dt = datetime.fromisoformat(input.effective_from)
            to_dt = datetime.fromisoformat(input.effective_to) if input.effective_to else from_dt
            jobs = CapacityCascadeService.recalculate_from_scope(
                input.scope_type, input.scope_id, from_dt, to_dt,
                trigger_type="SCHEDULE_CHANGED",
            )
            return WorkSchedulePayload(
                ok=True,
                schedule=WorkScheduleNode.from_db(schedule),
                recalculation_job=CapacityRecalculationJobNode.from_db(jobs[0]) if jobs else None,
            )
        except ScheduleValidationError as e:
            return WorkSchedulePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def update_work_schedule(self, info: Info, id: str, input: WorkScheduleUpdateInput) -> WorkSchedulePayload:
        from datetime import datetime
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from manufacturing.domain.capacity_cascade_service import CapacityCascadeService
        try:
            kwargs = {}
            if input.name is not None:
                kwargs["name"] = input.name
            if input.timezone is not None:
                kwargs["timezone"] = input.timezone
            if input.effective_from is not None:
                kwargs["effective_from"] = datetime.fromisoformat(input.effective_from)
            if input.effective_to is not None:
                kwargs["effective_to"] = datetime.fromisoformat(input.effective_to)
            if input.is_active is not None:
                kwargs["is_active"] = input.is_active

            schedule = ScheduleService.update_schedule(id, **kwargs)
            jobs = CapacityCascadeService.recalculate_from_scope(
                schedule.scope_type, schedule.scope_id,
                schedule.effective_from, schedule.effective_to or schedule.effective_from,
                trigger_type="SCHEDULE_CHANGED",
            )
            return WorkSchedulePayload(
                ok=True,
                schedule=WorkScheduleNode.from_db(schedule),
                recalculation_job=CapacityRecalculationJobNode.from_db(jobs[0]) if jobs else None,
            )
        except ScheduleValidationError as e:
            return WorkSchedulePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def archive_work_schedule(self, info: Info, id: str) -> WorkSchedulePayload:
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from manufacturing.domain.capacity_cascade_service import CapacityCascadeService
        try:
            schedule = ScheduleService.archive_schedule(id)
            jobs = CapacityCascadeService.recalculate_from_scope(
                schedule.scope_type, schedule.scope_id,
                schedule.effective_from, schedule.effective_to or schedule.effective_from,
                trigger_type="SCHEDULE_CHANGED",
            )
            return WorkSchedulePayload(
                ok=True,
                schedule=WorkScheduleNode.from_db(schedule),
                recalculation_job=CapacityRecalculationJobNode.from_db(jobs[0]) if jobs else None,
            )
        except ScheduleValidationError as e:
            return WorkSchedulePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def create_work_shift(self, info: Info, input: WorkShiftInput) -> WorkShiftPayload:
        from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
        from datetime import time as dt_time
        try:
            parts_s = input.start_time.split(":")
            parts_e = input.end_time.split(":")
            start = dt_time(int(parts_s[0]), int(parts_s[1]))
            end = dt_time(int(parts_e[0]), int(parts_e[1]))
            shift = ScheduleService.create_shift(
                schedule_id=input.schedule_id,
                name=input.name,
                weekday=input.weekday,
                start_time=start,
                end_time=end,
                paid_minutes=input.paid_minutes,
                break_minutes=input.break_minutes,
            )
            return WorkShiftPayload(ok=True, shift=WorkShiftNode.from_db(shift))
        except ScheduleValidationError as e:
            return WorkShiftPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def create_capacity_profile(self, info: Info, input: CapacityProfileInput) -> CapacityProfilePayload:
        from manufacturing.domain.capacity_service import NewCapacityService, NewCapacityValidationError
        try:
            profile = NewCapacityService.create_profile(
                scope_type=input.scope_type,
                scope_id=input.scope_id,
                capacity_mode=input.capacity_mode or "INHERITED",
                manual_capacity=input.manual_capacity,
                capacity_uom=input.capacity_uom or "",
                efficiency_factor=input.efficiency_factor or 1.0,
                oee_factor=input.oee_factor,
                takt_factor=input.takt_factor,
            )
            return CapacityProfilePayload(ok=True, profile=CapacityProfileNode.from_db(profile))
        except NewCapacityValidationError as e:
            return CapacityProfilePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def update_capacity_profile(self, info: Info, id: str, input: CapacityProfileUpdateInput) -> CapacityProfilePayload:
        from manufacturing.domain.capacity_service import NewCapacityService, NewCapacityValidationError
        try:
            kwargs = {}
            if input.capacity_mode is not None:
                kwargs["capacity_mode"] = input.capacity_mode
            if input.manual_capacity is not None:
                kwargs["manual_capacity"] = input.manual_capacity
            if input.capacity_uom is not None:
                kwargs["capacity_uom"] = input.capacity_uom
            if input.efficiency_factor is not None:
                kwargs["efficiency_factor"] = input.efficiency_factor
            if input.oee_factor is not None:
                kwargs["oee_factor"] = input.oee_factor
            if input.takt_factor is not None:
                kwargs["takt_factor"] = input.takt_factor
            profile = NewCapacityService.update_profile(id, **kwargs)
            return CapacityProfilePayload(ok=True, profile=CapacityProfileNode.from_db(profile))
        except NewCapacityValidationError as e:
            return CapacityProfilePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def archive_capacity_profile(self, info: Info, id: str) -> CapacityProfilePayload:
        from manufacturing.domain.capacity_service import NewCapacityService, NewCapacityValidationError
        try:
            profile = NewCapacityService.archive_profile(id)
            return CapacityProfilePayload(ok=True, profile=CapacityProfileNode.from_db(profile))
        except NewCapacityValidationError as e:
            return CapacityProfilePayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation
    def recalculate_capacity(self, info: Info, input: CapacityRecalculationInput) -> CapacityRecalculationPayload:
        from manufacturing.domain.capacity_service import NewCapacityService
        from datetime import datetime
        try:
            from_dt = datetime.fromisoformat(input.from_datetime)
            to_dt = datetime.fromisoformat(input.to_datetime)
            snapshot = NewCapacityService.calculate_scope_capacity(input.scope_type, input.scope_id, from_dt, to_dt)
            return CapacityRecalculationPayload(
                ok=True,
                snapshot=CapacitySnapshotNode.from_db(snapshot),
            )
        except Exception as e:
            return CapacityRecalculationPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def recalculate_resource_group_capacity(self, info: Info, resource_group_id: str, from_datetime: str, to_datetime: str) -> CapacitySnapshotNode:
        from manufacturing.domain.capacity_service import NewCapacityService
        from datetime import datetime
        try:
            from_dt = datetime.fromisoformat(from_datetime)
            to_dt = datetime.fromisoformat(to_datetime)
            snapshot = NewCapacityService.calculate_scope_capacity(
                "RESOURCE_GROUP", resource_group_id, from_dt, to_dt,
            )
            return CapacitySnapshotNode.from_db(snapshot)
        except Exception as e:
            raise e

    @strawberry.mutation
    @transaction.atomic
    def create_labor_requirement(self, info: Info, input: LaborRequirementInput) -> LaborRequirementPayload:
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            req = NewCapacityService.create_labor_requirement(
                plant_id=input.plant_id,
                resource_group_id=input.resource_group_id,
                routing_step_id=input.routing_step_id,
                product_model_id=input.product_model_id,
                operators_required=input.operators_required,
                labor_minutes_per_unit=input.labor_minutes_per_unit,
                skill_required_id=input.skill_required_id,
                effective_from=_parse_dt(input.effective_from),
                effective_to=_parse_dt(input.effective_to),
                is_active=True,
            )
            return LaborRequirementPayload(ok=True, labor_requirement=LaborRequirementNode.from_db(req))
        except Exception as exc:
            return _validation_payload(LaborRequirementPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def update_labor_requirement(self, info: Info, id: str, input: LaborRequirementUpdateInput) -> LaborRequirementPayload:
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            req = NewCapacityService.update_labor_requirement(id, **{
                "operators_required": input.operators_required,
                "labor_minutes_per_unit": input.labor_minutes_per_unit,
                "skill_required_id": input.skill_required_id,
                "effective_from": _parse_dt(input.effective_from),
                "effective_to": _parse_dt(input.effective_to),
                "is_active": input.is_active,
            })
            return LaborRequirementPayload(ok=True, labor_requirement=LaborRequirementNode.from_db(req))
        except Exception as exc:
            return _validation_payload(LaborRequirementPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def archive_labor_requirement(self, info: Info, id: str) -> LaborRequirementPayload:
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            req = NewCapacityService.archive_labor_requirement(id)
            return LaborRequirementPayload(ok=True, labor_requirement=LaborRequirementNode.from_db(req))
        except Exception as exc:
            return _validation_payload(LaborRequirementPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def create_operator_assignment(self, info: Info, input: OperatorAssignmentInput) -> OperatorAssignmentPayload:
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            assignment = NewCapacityService.create_operator_assignment(
                plant_id=input.plant_id,
                operator_id=input.operator_id,
                resource_group_id=input.resource_group_id,
                resource_id=input.resource_id,
                schedule_assignment_id=input.schedule_assignment_id,
                skill_id=input.skill_id,
                effective_from=_parse_dt(input.effective_from),
                effective_to=_parse_dt(input.effective_to),
                is_active=True,
            )
            return OperatorAssignmentPayload(ok=True, operator_assignment=OperatorAssignmentNode.from_db(assignment))
        except Exception as exc:
            return _validation_payload(OperatorAssignmentPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def update_operator_assignment(self, info: Info, id: str, input: OperatorAssignmentUpdateInput) -> OperatorAssignmentPayload:
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            assignment = NewCapacityService.update_operator_assignment(id, **{
                "skill_id": input.skill_id,
                "effective_from": _parse_dt(input.effective_from),
                "effective_to": _parse_dt(input.effective_to),
                "is_active": input.is_active,
            })
            return OperatorAssignmentPayload(ok=True, operator_assignment=OperatorAssignmentNode.from_db(assignment))
        except Exception as exc:
            return _validation_payload(OperatorAssignmentPayload, exc)

    @strawberry.mutation
    @transaction.atomic
    def archive_operator_assignment(self, info: Info, id: str) -> OperatorAssignmentPayload:
        from manufacturing.domain.capacity_service import NewCapacityService
        try:
            assignment = NewCapacityService.archive_operator_assignment(id)
            return OperatorAssignmentPayload(ok=True, operator_assignment=OperatorAssignmentNode.from_db(assignment))
        except Exception as exc:
            return _validation_payload(OperatorAssignmentPayload, exc)
