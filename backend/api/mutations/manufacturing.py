import strawberry
from typing import Optional
from django.contrib.auth import authenticate
from api.types.manufacturing import (
    CompanyNode, CompanyPayload, CompanyInput,
    PlantNode, PlantPayload, PlantInput,
    ProductionLineNode, ProductionLinePayload, ProductionLineInput,
    DepartmentNode, DepartmentPayload, DepartmentInput,
    ResourceGroupNode, ResourceGroupPayload, ResourceGroupInput,
    ResourceNode, ResourcePayload, ResourceInput,
    ProductionLineDepartmentAssignmentNode, AssignmentPayload, AssignDepartmentInput,
    ScheduleNode, SchedulePayload, ScheduleInput,
    ScheduleAssignmentNode, ScheduleAssignmentPayload, ScheduleAssignmentInput,
    ProfileNode, ProfilePayload, ProfileInput, WorkHistoryEntry, EducationEntry,
    MutationError,
)
from api.types.auth import LoginInput, AuthPayload, UserNode
from api.auth_utils import encode_jwt
from manufacturing.models import (
    Company, Plant, Department, ProductionLine, ResourceGroup, Resource,
    ProductionLineDepartmentAssignment, Schedule, ScheduleAssignment,
    ReferenceValue, ReferenceCategory,
)
from manufacturing.domain.plant_structure_rules import validate_plant_input


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
}


def _table_type_to_category(table_type: str) -> str:
    return TABLE_TYPE_TO_CATEGORY.get(table_type, table_type)


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
                id=str(user.id), username=user.username, email=user.email or "",
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
        line = ProductionLine.objects.create(
            plant_id=input.plant_id, code=input.code, name=input.name,
            description=input.description or "", status=input.status or "ACTIVE",
            shift_pattern=input.shift_pattern or "", is_constraint=input.is_constraint or False,
        )
        if input.status_id is not None:
            ref = _resolve_ref(ReferenceValue, input.status_id)
            line.status_id = ref
        if input.shift_pattern_id is not None:
            ref = _resolve_ref(ReferenceValue, input.shift_pattern_id)
            line.shift_pattern_id = ref
        line.save()
        return ProductionLinePayload(ok=True, production_line=ProductionLineNode.from_db(line))

    @strawberry.mutation
    def update_production_line(self, id: str, input: ProductionLineInput) -> ProductionLinePayload:
        try:
            line = ProductionLine.objects.get(id=id)
        except ProductionLine.DoesNotExist:
            return ProductionLinePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Production line not found"}])
        for f in ("plant_id", "code", "name", "description", "status", "shift_pattern", "is_constraint"):
            v = getattr(input, f)
            if v is not None:
                setattr(line, f, v)
        if input.status_id is not None:
            ref = _resolve_ref(ReferenceValue, input.status_id)
            line.status_id = ref
        if input.shift_pattern_id is not None:
            ref = _resolve_ref(ReferenceValue, input.shift_pattern_id)
            line.shift_pattern_id = ref
        line.save()
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
        dept = Department.objects.create(
            code=input.code, name=input.name, description=input.description or "",
            status=input.status or "ACTIVE", manager=input.manager or "", employees=input.employees or 0,
        )
        if input.status_id is not None:
            ref = _resolve_ref(ReferenceValue, input.status_id)
            dept.status_id = ref
        if input.department_type_id is not None:
            ref = _resolve_ref(ReferenceValue, input.department_type_id)
            dept.department_type_id = ref
        dept.save()
        return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))

    @strawberry.mutation
    def update_department(self, id: str, input: DepartmentInput) -> DepartmentPayload:
        try:
            dept = Department.objects.get(id=id)
        except Department.DoesNotExist:
            return DepartmentPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Department not found"}])
        for f in ("code", "name", "description", "status", "manager", "employees"):
            v = getattr(input, f)
            if v is not None:
                setattr(dept, f, v)
        if input.status_id is not None:
            ref = _resolve_ref(ReferenceValue, input.status_id)
            dept.status_id = ref
        if input.department_type_id is not None:
            ref = _resolve_ref(ReferenceValue, input.department_type_id)
            dept.department_type_id = ref
        dept.save()
        return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))

    @strawberry.mutation
    def archive_department(self, id: str) -> DepartmentPayload:
        try:
            dept = Department.objects.get(id=id)
        except Department.DoesNotExist:
            return DepartmentPayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Department not found"}])
        dept.status = "ARCHIVED"
        dept.save()
        return DepartmentPayload(ok=True, department=DepartmentNode.from_db(dept))

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
        cat_code = _table_type_to_category(input.table_type)
        try:
            cat = ReferenceCategory.objects.get(code=cat_code)
        except ReferenceCategory.DoesNotExist:
            return ReferenceItemPayload(errors=[MutationError(field="tableType", code="INVALID", message=f"Unknown table type: {input.table_type}")])
        rv, _ = ReferenceValue.objects.update_or_create(
            category=cat,
            code=input.code,
            defaults={
                "name": input.name,
                "description": input.description or "",
                "sort_order": input.sort_order or 0,
                "is_active": input.is_active if input.is_active is not None else True,
            },
        )
        return ReferenceItemPayload(item=LegacyReferenceItemResult.from_ref_value(rv, input.table_type))

    @strawberry.mutation
    def update_reference_item(self, id: str, input: ReferenceItemInput) -> ReferenceItemPayload:
        try:
            rv = ReferenceValue.objects.get(id=id)
        except ReferenceValue.DoesNotExist:
            return ReferenceItemPayload(errors=[MutationError(field="id", code="NOT_FOUND", message="Reference item not found")])
        rv.code = input.code
        rv.name = input.name
        rv.description = input.description or ""
        rv.sort_order = input.sort_order or 0
        if input.is_active is not None:
            rv.is_active = input.is_active
        rv.save()
        return ReferenceItemPayload(item=LegacyReferenceItemResult.from_ref_value(rv, input.table_type))

    @strawberry.mutation
    def deactivate_reference_item(self, id: str) -> ReferenceItemPayload:
        try:
            rv = ReferenceValue.objects.get(id=id)
        except ReferenceValue.DoesNotExist:
            return ReferenceItemPayload(errors=[MutationError(field="id", code="NOT_FOUND", message="Reference item not found")])
        rv.is_active = False
        rv.save()
        return ReferenceItemPayload(item=LegacyReferenceItemResult.from_ref_value(rv, ""))
