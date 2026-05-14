import strawberry
import typing
from typing import Optional
from django.contrib.auth import authenticate
from api.types.manufacturing import (
    CompanyNode, CompanyPayload, CompanyInput,
    PlantNode, PlantPayload, PlantInput,
    ProductionLineNode, ProductionLinePayload, ProductionLineInput,
    DepartmentNode, DepartmentPayload, DepartmentInput,
    ResourceGroupNode, ResourceGroupPayload, ResourceGroupInput,
    ResourceNode, ResourcePayload, ResourceInput,
    ProductionLineDepartmentAssignmentNode, AssignmentPayload, AssignDepartmentInput, AssignDepartmentToLinesInput,
    ScheduleNode, SchedulePayload, ScheduleInput,
    ScheduleAssignmentNode, ScheduleAssignmentPayload, ScheduleAssignmentInput,
    ProfileNode, ProfilePayload, ProfileInput, WorkHistoryEntry, EducationEntry,
    MutationError, DeletePayload,
    RoutingNode, RoutingPayload, RoutingInput,
    RoutingStepNode, RoutingStepPayload, RoutingStepInput,
    ReorderStepsInput,
    ProductFamilyAssignmentNode, ProductModelAssignmentNode,
    ProductFamilyAssignmentPayload, ProductModelAssignmentPayload,
)
from api.types.auth import LoginInput, AuthPayload, UserNode
from api.auth_utils import encode_jwt
from manufacturing.domain.department_service import DepartmentService, DepartmentServiceError
from manufacturing.models import (
    Company, Plant, Department, ProductionLine, ResourceGroup, Resource,
    ProductionLineDepartmentAssignment, ProductionLineProductFamily, ProductionLineProductModel,
    Schedule, ScheduleAssignment,
    ReferenceValue, ReferenceCategory, ProductModel,
    Routing, RoutingStep,
)
from manufacturing.domain.plant_structure_rules import validate_plant_input
from manufacturing.domain.routing_service import RoutingService, RoutingValidationError


def _resolve_ref(model, ref_id: Optional[str]):
    if not ref_id:
        return None
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
    is_active: Optional[bool] = strawberry.field(name="isActive", default=True)
    sort_order: Optional[int] = strawberry.field(name="sortOrder", default=0)


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
    is_active: bool = strawberry.field(name="isActive")
    sort_order: int = strawberry.field(name="sortOrder")

    @classmethod
    def from_ref_value(cls, rv: ReferenceValue, table_type: str) -> "LegacyReferenceItemResult":
        return cls(
            id=strawberry.ID(str(rv.id)),
            table_type=table_type,
            code=rv.code,
            name=rv.name,
            description=rv.description,
            is_active=rv.is_active,
            sort_order=rv.sort_order,
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
    "downtime_code": "status",
    "defect_code": "status",
    "scrap_reason": "status",
    "kaizen_category": "lean_methodology",
    "skill_type": "resource_capability",
    "role": "department_type",
    "shift_team": "shift_model",
    "product_model": "product_model",
    "production_family": "production_family",
}


def _table_type_to_category(table_type: str) -> str:
    return TABLE_TYPE_TO_CATEGORY.get(table_type, table_type)


WORKFLOW_MANAGED_REFERENCE_TABLES = {"staff_user", "staff_assignment"}


def _validate_reference_item_input(input: ReferenceItemInput, current_id: Optional[str] = None) -> list[MutationError]:
    errors: list[MutationError] = []
    if input.table_type in WORKFLOW_MANAGED_REFERENCE_TABLES:
        errors.append(MutationError(field="tableType", code="WORKFLOW_MANAGED", message="This table is managed by the staff workflow. Direct edits are not allowed."))
        return errors
    if not input.code.strip():
        errors.append(MutationError(field="code", code="REQUIRED", message="Code is required"))
    if not input.name.strip():
        errors.append(MutationError(field="name", code="REQUIRED", message="Name is required"))
    cat_code = _table_type_to_category(input.table_type)
    duplicate = ReferenceValue.objects.filter(category__code=cat_code, code__iexact=input.code.strip())
    if current_id:
        duplicate = duplicate.exclude(id=current_id)
    if input.code.strip() and duplicate.exists():
        errors.append(MutationError(field="code", code="DUPLICATE", message="Code must be unique inside this table"))
    return errors


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

@strawberry.type
class ManufacturingMutation:
    @strawberry.mutation
    def update_profile(self, input: ProfileInput) -> ProfilePayload:
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
            role = user.role_profile.role
        except Exception:
            role = "guest"
        return AuthPayload(
            token=encode_jwt(user.id, role),
            user=UserNode(
                id=str(user.id), name=user.get_full_name() or user.username, username=user.username, email=user.email or "",
                role=role, plant=getattr(user.role_profile, "plant", "") or "",
                department=getattr(user.role_profile, "department", "") or "",
            ),
        )

    @strawberry.mutation
    def create_company(self, input: CompanyInput) -> CompanyPayload:
        if Company.objects.exists():
            return CompanyPayload(ok=False, errors=[MutationError(field=None, code="DUPLICATE", message="A company already exists")])
        company = Company.objects.create(
            code=input.code or "", name=input.name or "",
            legal_name=input.legal_name or "", description=input.description or "",
            industry_type=input.industry_type or "", status=input.status or "ACTIVE",
            address=input.address or "", city=input.city or "",
            state=input.state or "", country=input.country or "",
            phone=input.phone or "", email=input.email or "",
            website=input.website or "", operating_since=input.operating_since or "",
            manufacturing_focus=input.manufacturing_focus or "",
            product_lines=input.product_lines or "",
            lean_methodology=input.lean_methodology or "",
            default_timezone=input.default_timezone or "",
            default_language=input.default_language or "",
            default_calendar=input.default_calendar or "",
            default_shift_model=input.default_shift_model or "",
            week_start_day=input.week_start_day or "",
            admin_name=input.admin_name or "", admin_role=input.admin_role or "",
            zipcode=input.zipcode or "",
        )
        _set_company_refs(company, input)
        company.save()
        return CompanyPayload(ok=True, company=CompanyNode.from_db(company))

    @strawberry.mutation
    def update_company(self, input: CompanyInput) -> CompanyPayload:
        company = Company.objects.first()
        if not company:
            return CompanyPayload(ok=False, errors=[MutationError(field=None, code="NOT_FOUND", message="No company found")])
        for f in ("code", "name", "legal_name", "description", "industry_type", "status",
                   "address", "city", "state", "country", "phone", "email", "website",
                   "operating_since", "manufacturing_focus", "product_lines",
                   "lean_methodology", "default_timezone", "default_language",
                   "default_calendar", "default_shift_model", "week_start_day",
                   "admin_name", "admin_role", "zipcode"):
            v = getattr(input, f)
            if v is not None:
                setattr(company, f, v)
        _set_company_refs(company, input)
        company.save()
        return CompanyPayload(ok=True, company=CompanyNode.from_db(company))

    @strawberry.mutation
    def delete_company(self) -> CompanyPayload:
        company = Company.objects.first()
        if not company:
            return CompanyPayload(ok=False, errors=[MutationError(field=None, code="NOT_FOUND", message="No company found")])
        from manufacturing.models import Plant
        if Plant.objects.exists():
            return CompanyPayload(ok=False, errors=[MutationError(field=None, code="IN_USE", message="Cannot delete company with existing plants. Remove all plants first.")])
        company.delete()
        return CompanyPayload(ok=True)

    @strawberry.mutation
    def create_plant(self, input: PlantInput) -> PlantPayload:
        errors = validate_plant_input(input)
        if errors:
            return PlantPayload(ok=False, errors=errors)
        plant = Plant.objects.create(
            code=input.code, name=input.name, description=input.description or "",
            status=input.status or "ACTIVE", building=input.building or "",
            address=input.address or "", city=input.city or "",
            state=input.state or "", country=input.country or "",
            zipcode=input.zipcode or "", timezone=input.timezone or "",
            latitude=input.latitude or "", longitude=input.longitude or "",
            plant_type=input.plant_type or "", operating_since=input.operating_since or "",
            manager_name=input.manager_name or "", manager_email=input.manager_email or "",
            manager_phone=input.manager_phone or "",
            default_calendar=input.default_calendar or "",
            default_shift_model=input.default_shift_model or "",
            week_start_day=input.week_start_day or "",
            default_schedule=input.default_schedule or "",
            manufacturing_focus=input.manufacturing_focus or "",
        )
        _set_refs(plant, input)
        plant.save()
        return PlantPayload(ok=True, plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def update_plant(self, id: str, input: PlantInput) -> PlantPayload:
        try:
            plant = Plant.objects.get(id=id)
        except Plant.DoesNotExist:
            return PlantPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Plant not found"}])
        for f in ("code", "name", "description", "status", "building", "address", "city", "state", "country", "zipcode", "timezone", "latitude", "longitude", "plant_type", "operating_since", "manager_name", "manager_email", "manager_phone", "default_calendar", "default_shift_model", "week_start_day", "default_schedule", "manufacturing_focus"):
            v = getattr(input, f)
            if v is not None:
                setattr(plant, f, v)
        _set_refs(plant, input)
        plant.save()
        return PlantPayload(ok=True, plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def archive_plant(self, id: str) -> PlantPayload:
        try:
            plant = Plant.objects.get(id=id)
        except Plant.DoesNotExist:
            return PlantPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Plant not found"}])
        plant.status = "ARCHIVED"
        plant.save()
        return PlantPayload(ok=True, plant=PlantNode.from_db(plant))

    @strawberry.mutation
    def create_production_line(self, input: ProductionLineInput) -> ProductionLinePayload:
        try:
            line = ProductionLine.objects.create(
                plant_id=input.plant_id, code=input.code, name=input.name,
                description=input.description or "", status=input.status or "ACTIVE",
                shift_pattern=input.shift_pattern or "", capacity_basis=input.capacity_basis or "",
                is_constraint=input.is_constraint or False,
            )
            _set_line_refs(line, input)
            line.save()
            _sync_line_product_scope(line, input)
            return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))
        except ValueError as exc:
            return ProductionLinePayload(ok=False, errors=[MutationError(field="productModels", code="VALIDATION", message=str(exc))])

    @strawberry.mutation
    def update_production_line(self, id: str, input: ProductionLineInput) -> ProductionLinePayload:
        try:
            line = ProductionLine.objects.get(id=id)
        except ProductionLine.DoesNotExist:
            return ProductionLinePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Production line not found"}])
        for f in ("plant_id", "code", "name", "description", "status", "shift_pattern", "capacity_basis", "is_constraint"):
            v = getattr(input, f)
            if v is not None:
                setattr(line, f, v)
        _set_line_refs(line, input)
        line.save()
        try:
            _sync_line_product_scope(line, input)
        except ValueError as exc:
            return ProductionLinePayload(ok=False, errors=[MutationError(field="productModels", code="VALIDATION", message=str(exc))])
        return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))

    @strawberry.mutation
    def archive_production_line(self, id: str) -> ProductionLinePayload:
        try:
            line = ProductionLine.objects.get(id=id)
        except ProductionLine.DoesNotExist:
            return ProductionLinePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Production line not found"}])
        line.status = "ARCHIVED"
        line.save()
        return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))

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
            dept = DepartmentService.get(id)
            dept.status = "ARCHIVED"
            dept.save()
            return DepartmentPayload(ok=True, department=DepartmentNode.from_db(DepartmentService.get(id)))
        except DepartmentServiceError as exc:
            return DepartmentPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

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
    def remove_department_from_production_line(self, department_id: str, production_line_id: str) -> DepartmentPayload:
        try:
            dept = DepartmentService.remove_from_line(department_id, production_line_id)
            return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))
        except DepartmentServiceError as exc:
            return DepartmentPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])

    @strawberry.mutation
    def assign_department_to_production_line(self, input: AssignDepartmentInput) -> AssignmentPayload:
        a, _ = ProductionLineDepartmentAssignment.objects.update_or_create(
            production_line_id=input.production_line_id, department_id=input.department_id,
            defaults={"sequence": input.sequence or 0, "status": input.status or "ACTIVE"},
        )
        return AssignmentPayload(ok=True, assignment=ProductionLineDepartmentAssignmentNode.from_db(a))

    @strawberry.mutation
    def remove_department_from_production_line(self, production_line_id: str, department_id: str) -> AssignmentPayload:
        deleted, _ = ProductionLineDepartmentAssignment.objects.filter(
            production_line_id=production_line_id, department_id=department_id,
        ).delete()
        return AssignmentPayload(ok=deleted > 0)

    @strawberry.mutation
    def create_resource_group(self, input: ResourceGroupInput) -> ResourceGroupPayload:
        rg = ResourceGroup.objects.create(
            department_id=input.department_id, code=input.code or "", name=input.name,
            description=input.description or "", status=input.status or "ACTIVE",
            members=input.members or 0, leader=input.leader or "",
        )
        if input.status_id is not None:
            ref = _resolve_ref(ReferenceValue, input.status_id)
            rg.status_id = ref
        if input.group_type_id is not None:
            ref = _resolve_ref(ReferenceValue, input.group_type_id)
            rg.group_type_id = ref
        rg.save()
        return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))

    @strawberry.mutation
    def update_resource_group(self, id: str, input: ResourceGroupInput) -> ResourceGroupPayload:
        try:
            rg = ResourceGroup.objects.get(id=id)
        except ResourceGroup.DoesNotExist:
            return ResourceGroupPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Resource group not found"}])
        for f in ("department_id", "code", "name", "description", "status", "members", "leader"):
            v = getattr(input, f)
            if v is not None:
                setattr(rg, f, v)
        if input.status_id is not None:
            ref = _resolve_ref(ReferenceValue, input.status_id)
            rg.status_id = ref
        if input.group_type_id is not None:
            ref = _resolve_ref(ReferenceValue, input.group_type_id)
            rg.group_type_id = ref
        rg.save()
        return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))

    @strawberry.mutation
    def archive_resource_group(self, id: str) -> ResourceGroupPayload:
        try:
            rg = ResourceGroup.objects.get(id=id)
        except ResourceGroup.DoesNotExist:
            return ResourceGroupPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Resource group not found"}])
        rg.status = "ARCHIVED"
        rg.save()
        return ResourceGroupPayload(ok=True, resource_group=ResourceGroupNode.from_db(rg))

    @strawberry.mutation
    def create_resource(self, input: ResourceInput) -> ResourcePayload:
        res = Resource.objects.create(
            resource_group_id=input.resource_group_id, code=input.code, name=input.name,
            description=input.description or "", status=input.status or "ACTIVE",
        )
        if input.status_id is not None:
            ref = _resolve_ref(ReferenceValue, input.status_id)
            res.status_id = ref
        if input.resource_type_id is not None:
            ref = _resolve_ref(ReferenceValue, input.resource_type_id)
            res.resource_type_id = ref
        if input.capability_ids is not None:
            refs = ReferenceValue.objects.filter(id__in=input.capability_ids)
            res.capabilities.set(refs)
        res.save()
        return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))

    @strawberry.mutation
    def update_resource(self, id: str, input: ResourceInput) -> ResourcePayload:
        try:
            res = Resource.objects.get(id=id)
        except Resource.DoesNotExist:
            return ResourcePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Resource not found"}])
        for f in ("resource_group_id", "code", "name", "description", "status"):
            v = getattr(input, f)
            if v is not None:
                setattr(res, f, v)
        if input.status_id is not None:
            ref = _resolve_ref(ReferenceValue, input.status_id)
            res.status_id = ref
        if input.resource_type_id is not None:
            ref = _resolve_ref(ReferenceValue, input.resource_type_id)
            res.resource_type_id = ref
        if input.capability_ids is not None:
            refs = ReferenceValue.objects.filter(id__in=input.capability_ids)
            res.capabilities.set(refs)
        res.save()
        return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))

    @strawberry.mutation
    def archive_resource(self, id: str) -> ResourcePayload:
        try:
            res = Resource.objects.get(id=id)
        except Resource.DoesNotExist:
            return ResourcePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Resource not found"}])
        res.status = "ARCHIVED"
        res.save()
        return ResourcePayload(ok=True, resource=ResourceNode.from_db(res))

    @strawberry.mutation
    def create_schedule(self, input: ScheduleInput) -> SchedulePayload:
        s = Schedule.objects.create(
            code=input.code, name=input.name, description=input.description or "",
            status=input.status or "ACTIVE",
        )
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))

    @strawberry.mutation
    def update_schedule(self, id: str, input: ScheduleInput) -> SchedulePayload:
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
    def archive_schedule(self, id: str) -> SchedulePayload:
        try:
            s = Schedule.objects.get(id=id)
        except Schedule.DoesNotExist:
            return SchedulePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Schedule not found"}])
        s.status = "ARCHIVED"
        s.save()
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))

    @strawberry.mutation
    def assign_schedule(self, input: ScheduleAssignmentInput) -> ScheduleAssignmentPayload:
        a = ScheduleAssignment.objects.create(
            entity_type=input.entity_type, entity_id=input.entity_id,
            schedule_id=input.schedule_id, inheritance_mode=input.inheritance_mode or "NONE",
            valid_from=input.valid_from, valid_to=input.valid_to,
        )
        return ScheduleAssignmentPayload(ok=True, assignment=ScheduleAssignmentNode.from_db(a))

    @strawberry.mutation
    def remove_schedule_assignment(self, id: str) -> ScheduleAssignmentPayload:
        deleted, _ = ScheduleAssignment.objects.filter(id=id).delete()
        return ScheduleAssignmentPayload(ok=deleted > 0)

    # ── Legacy reference item mutations ──

    @strawberry.mutation
    def create_reference_item(self, input: ReferenceItemInput) -> ReferenceItemPayload:
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
            description=input.description or "",
            sort_order=input.sort_order or 0,
            is_active=input.is_active if input.is_active is not None else True,
        )
        return ReferenceItemPayload(item=LegacyReferenceItemResult.from_ref_value(rv, input.table_type))

    @strawberry.mutation
    def update_reference_item(self, id: str, input: ReferenceItemInput) -> ReferenceItemPayload:
        validation_errors = _validate_reference_item_input(input, id)
        if validation_errors:
            return ReferenceItemPayload(errors=validation_errors)
        try:
            rv = ReferenceValue.objects.get(id=id)
        except ReferenceValue.DoesNotExist:
            return ReferenceItemPayload(errors=[MutationError(field="id", code="NOT_FOUND", message="Reference item not found")])
        rv.code = input.code.strip()
        rv.name = input.name.strip()
        rv.description = input.description or ""
        rv.sort_order = input.sort_order or 0
        if input.is_active is not None:
            rv.is_active = input.is_active
        rv.save()
        return ReferenceItemPayload(item=LegacyReferenceItemResult.from_ref_value(rv, input.table_type))

    @strawberry.mutation
    def deactivate_reference_item(self, id: str) -> ReferenceItemPayload:
        if id.startswith("user:") or id.startswith("user_role:"):
            return ReferenceItemPayload(errors=[MutationError(field="id", code="WORKFLOW_MANAGED", message="System-managed staff records must be changed from the staff workflow")])
        try:
            rv = ReferenceValue.objects.get(id=id)
        except ReferenceValue.DoesNotExist:
            return ReferenceItemPayload(errors=[MutationError(field="id", code="NOT_FOUND", message="Reference item not found")])
        rv.is_active = False
        rv.save()
        return ReferenceItemPayload(item=LegacyReferenceItemResult.from_ref_value(rv, ""))

    # ── Routing ──

    @strawberry.mutation
    def create_routing(self, input: RoutingInput) -> RoutingPayload:
        try:
            routing = RoutingService.create_routing({
                "production_line_id": input.production_line_id,
                "product_family_id": input.product_family_id,
                "product_model_id": input.product_model_id,
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

    # ── Product Family / Model Assignments ──

    @strawberry.mutation
    def assign_families_to_production_line(self, production_line_id: str, family_ids: list[str], primary_family_id: typing.Optional[str] = None) -> ProductFamilyAssignmentPayload:
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
    def remove_family_from_production_line(self, production_line_id: str, family_id: str) -> ProductFamilyAssignmentPayload:
        try:
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id, product_family_id=family_id).delete()
            ProductionLineProductFamily.objects.filter(production_line_id=production_line_id, product_family_id=family_id).delete()
            assignments = ProductionLineProductFamily.objects.filter(production_line_id=production_line_id).select_related("product_family").all()
            return ProductFamilyAssignmentPayload(ok=True, assignments=[ProductFamilyAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def assign_models_to_production_line(self, production_line_id: str, model_ids: list[str], primary_model_id: typing.Optional[str] = None) -> ProductModelAssignmentPayload:
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
    def remove_model_from_production_line(self, production_line_id: str, model_id: str) -> ProductModelAssignmentPayload:
        try:
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id, product_model_id=model_id).delete()
            assignments = ProductionLineProductModel.objects.filter(production_line_id=production_line_id).select_related("product_model", "product_family").all()
            return ProductModelAssignmentPayload(ok=True, assignments=[ProductModelAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def set_primary_production_line_family(self, production_line_id: str, family_id: str) -> ProductFamilyAssignmentPayload:
        try:
            ProductionLineProductFamily.objects.filter(production_line_id=production_line_id).update(is_primary=False)
            ProductionLineProductFamily.objects.filter(production_line_id=production_line_id, product_family_id=family_id).update(is_primary=True)
            assignments = ProductionLineProductFamily.objects.filter(production_line_id=production_line_id).select_related("product_family").all()
            return ProductFamilyAssignmentPayload(ok=True, assignments=[ProductFamilyAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductFamilyAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])

    @strawberry.mutation
    def set_primary_production_line_model(self, production_line_id: str, model_id: str) -> ProductModelAssignmentPayload:
        try:
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id).update(is_primary=False)
            ProductionLineProductModel.objects.filter(production_line_id=production_line_id, product_model_id=model_id).update(is_primary=True)
            assignments = ProductionLineProductModel.objects.filter(production_line_id=production_line_id).select_related("product_model", "product_family").all()
            return ProductModelAssignmentPayload(ok=True, assignments=[ProductModelAssignmentNode.from_db(a) for a in assignments])
        except Exception as e:
            return ProductModelAssignmentPayload(ok=False, errors=[MutationError(field="_form", code="ERROR", message=str(e))])
