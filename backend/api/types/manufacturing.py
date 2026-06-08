import json
import strawberry
import typing
from datetime import datetime
from django.db.models import Q

from manufacturing.models import (
    Plant, Department, ProductionLine, ResourceGroup, Resource,
    ProductionLineDepartmentAssignment, Company,
    Schedule, Shift, ScheduleAssignment,
    ReferenceCategory, ReferenceValue, ResourceType, VisualIdentity,
    ProductModel, ProcessFlow, ProcessStep,
    Routing, RoutingStep, RoutingStatus,
    Material, BOM, BOMItem, InventoryLocation, OperationInput, OperationOutput, MaterialMovementRule,
    MaterialBin, CapacityPlan, CapacityPlanInput as CapacityPlanInputModel, CapacityPlanResult as CapacityPlanResultModel, CapacityScenario,
    ProductFamily, ProductVariant, PartNumber,
)
from manufacturing.models.capacity import CapacitySnapshot

# ── Shared interfaces ──

@strawberry.type
class MutationError:
    field: typing.Optional[str]
    code: str
    message: str
    details: typing.Optional[str] = None


# ── Profile ──

@strawberry.input
class WorkHistoryInput:
    id: str
    role: str
    company: str
    period: str
    description: typing.Optional[str] = ""

@strawberry.input
class EducationInput:
    id: str
    degree: str
    school: str
    period: str

@strawberry.input
class ProfileInput:
    name: typing.Optional[str] = None
    role: typing.Optional[str] = None
    email: typing.Optional[str] = None
    phone: typing.Optional[str] = None
    location: typing.Optional[str] = None
    plant: typing.Optional[str] = None
    department: typing.Optional[str] = None
    reports_to: typing.Optional[str] = strawberry.field(name="reportsTo", default=None)
    language: typing.Optional[str] = None
    about: typing.Optional[str] = None
    work_history: typing.Optional[list[WorkHistoryInput]] = strawberry.field(name="workHistory", default=None)
    education: typing.Optional[list[EducationInput]] = strawberry.field(name="education", default=None)

@strawberry.type
class WorkHistoryEntry:
    id: str
    role: str
    company: str
    period: str
    description: str

@strawberry.type
class EducationEntry:
    id: str
    degree: str
    school: str
    period: str

@strawberry.type
class ProfileNode:
    id: strawberry.ID
    name: str
    role: str
    email: str
    phone: str
    location: str
    plant: str
    department: str
    reports_to: str = strawberry.field(name="reportsTo")
    language: str
    about: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")
    work_history: list[WorkHistoryEntry] = strawberry.field(name="workHistory")
    education: list[EducationEntry] = strawberry.field(name="education")

@strawberry.type
class ProfilePayload:
    profile: typing.Optional[ProfileNode] = None
    errors: typing.Optional[list[MutationError]] = None


# ── Company ──

@strawberry.type
class CompanyNode:
    id: strawberry.ID
    code: str
    name: str
    legal_name: str = strawberry.field(name="legalName")
    description: str
    industry_type: str = strawberry.field(name="industryType")
    industry_type_id: typing.Optional[str] = strawberry.field(name="industryTypeId", default=None)
    industry_type_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="industryTypeRef", default=None)
    status: str
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    status_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="statusRef", default=None)
    address: str
    city: str
    state: str
    country: str
    country_id: typing.Optional[str] = strawberry.field(name="countryId", default=None)
    country_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="countryRef", default=None)
    phone: str
    email: str
    website: str
    operating_since: str = strawberry.field(name="operatingSince")
    manufacturing_focus: str = strawberry.field(name="manufacturingFocus")
    product_lines: str = strawberry.field(name="productLines")
    product_line_refs: typing.Optional[list["ReferenceValueNode"]] = strawberry.field(name="productLineRefs", default_factory=list)
    lean_methodology: str = strawberry.field(name="leanMethodology")
    lean_methodology_refs: typing.Optional[list["ReferenceValueNode"]] = strawberry.field(name="leanMethodologyRefs", default_factory=list)
    default_timezone: str = strawberry.field(name="defaultTimezone")
    default_timezone_id: typing.Optional[str] = strawberry.field(name="defaultTimezoneId", default=None)
    default_timezone_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="defaultTimezoneRef", default=None)
    default_language: str = strawberry.field(name="defaultLanguage")
    default_language_id: typing.Optional[str] = strawberry.field(name="defaultLanguageId", default=None)
    default_language_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="defaultLanguageRef", default=None)
    default_calendar: str = strawberry.field(name="defaultCalendar")
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId", default=None)
    default_calendar_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="defaultCalendarRef", default=None)
    default_shift_model: str = strawberry.field(name="defaultShiftModel")
    default_shift_model_id: typing.Optional[str] = strawberry.field(name="defaultShiftModelId", default=None)
    default_shift_model_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="defaultShiftModelRef", default=None)
    week_start_day: str = strawberry.field(name="weekStartDay")
    week_start_day_id: typing.Optional[str] = strawberry.field(name="weekStartDayId", default=None)
    week_start_day_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="weekStartDayRef", default=None)
    admin_name: str = strawberry.field(name="adminName")
    admin_role: str = strawberry.field(name="adminRole")
    zipcode: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Company) -> "CompanyNode":
        product_line_refs_list = list(obj.product_line_refs.all()) if obj.pk else []
        lean_methodology_refs_list = list(obj.lean_methodology_refs.all()) if obj.pk else []
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            legal_name=obj.legal_name or "",
            description=obj.description, industry_type=obj.industry_type or "",
            industry_type_id=str(obj.industry_type_id_id) if obj.industry_type_id_id else None,
            industry_type_ref=_ref_val(obj.industry_type_id) if obj.industry_type_id_id else None,
            status=obj.status,
            status_id=str(obj.status_id_id) if obj.status_id_id else None,
            status_ref=_ref_val(obj.status_id) if obj.status_id_id else None,
            address=obj.address, city=obj.city, state=obj.state, country=obj.country,
            country_id=str(obj.country_id_id) if obj.country_id_id else None,
            country_ref=_ref_val(obj.country_id) if obj.country_id_id else None,
            phone=obj.phone, email=obj.email,
            website=obj.website, operating_since=obj.operating_since or "",
            manufacturing_focus=obj.manufacturing_focus or "",
            product_lines=obj.product_lines or "",
            product_line_refs=[_ref_val(rv) for rv in product_line_refs_list],
            lean_methodology=obj.lean_methodology or "",
            lean_methodology_refs=[_ref_val(rv) for rv in lean_methodology_refs_list],
            default_timezone=obj.default_timezone,
            default_timezone_id=str(obj.default_timezone_id_id) if obj.default_timezone_id_id else None,
            default_timezone_ref=_ref_val(obj.default_timezone_id) if obj.default_timezone_id_id else None,
            default_language=obj.default_language or "",
            default_language_id=str(obj.default_language_id_id) if obj.default_language_id_id else None,
            default_language_ref=_ref_val(obj.default_language_id) if obj.default_language_id_id else None,
            default_calendar=obj.default_calendar or "",
            default_calendar_id=str(obj.default_calendar_id_id) if obj.default_calendar_id_id else None,
            default_calendar_ref=_ref_val(obj.default_calendar_id) if obj.default_calendar_id_id else None,
            default_shift_model=obj.default_shift_model or "",
            default_shift_model_id=str(obj.default_shift_model_id_id) if obj.default_shift_model_id_id else None,
            default_shift_model_ref=_ref_val(obj.default_shift_model_id) if obj.default_shift_model_id_id else None,
            week_start_day=obj.week_start_day or "",
            week_start_day_id=str(obj.week_start_day_id_id) if obj.week_start_day_id_id else None,
            week_start_day_ref=_ref_val(obj.week_start_day_id) if obj.week_start_day_id_id else None,
            admin_name=obj.admin_name or "", admin_role=obj.admin_role or "",
            zipcode=obj.zipcode or "",
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── Plant ──

@strawberry.type
class PlantNode:
    id: strawberry.ID
    company_id: strawberry.ID = strawberry.field(name="companyId")
    company_name: str = strawberry.field(name="companyName")
    code: str
    name: str
    description: str
    status: str
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    status_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="statusRef", default=None)
    building: str
    address: str
    city: str
    state: str
    country: str
    country_id: typing.Optional[str] = strawberry.field(name="countryId", default=None)
    country_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="countryRef", default=None)
    zipcode: str
    timezone: str
    timezone_id: typing.Optional[str] = strawberry.field(name="timezoneId", default=None)
    timezone_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="timezoneRef", default=None)
    latitude: str
    longitude: str
    plant_type: str = strawberry.field(name="plantType")
    plant_type_id: typing.Optional[str] = strawberry.field(name="plantTypeId", default=None)
    plant_type_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="plantTypeRef", default=None)
    operating_since: str = strawberry.field(name="operatingSince")
    manager_name: str = strawberry.field(name="managerName")
    manager_email: str = strawberry.field(name="managerEmail")
    manager_phone: str = strawberry.field(name="managerPhone")
    default_calendar: str = strawberry.field(name="defaultCalendar")
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId", default=None)
    default_calendar_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="defaultCalendarRef", default=None)
    default_shift_model: str = strawberry.field(name="defaultShiftModel")
    default_shift_model_id: typing.Optional[str] = strawberry.field(name="defaultShiftModelId", default=None)
    default_shift_model_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="defaultShiftModelRef", default=None)
    week_start_day: str = strawberry.field(name="weekStartDay")
    week_start_day_id: typing.Optional[str] = strawberry.field(name="weekStartDayId", default=None)
    week_start_day_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="weekStartDayRef", default=None)
    default_schedule: str = strawberry.field(name="defaultSchedule")
    default_schedule_id: typing.Optional[str] = strawberry.field(name="defaultScheduleId", default=None)
    default_schedule_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="defaultScheduleRef", default=None)
    manufacturing_focus: str = strawberry.field(name="manufacturingFocus")
    manufacturing_focus_refs: typing.Optional[list["ReferenceValueNode"]] = strawberry.field(name="manufacturingFocusRefs", default_factory=list)
    line_count: int = strawberry.field(name="lineCount")
    department_count: int = strawberry.field(name="departmentCount")
    group_count: int = strawberry.field(name="groupCount")
    resource_count: int = strawberry.field(name="resourceCount")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Plant) -> "PlantNode":
        line_count = getattr(obj, "line_count_annotated", None)
        department_count = getattr(obj, "department_count_annotated", None)
        group_count = getattr(obj, "group_count_annotated", None)
        resource_count = getattr(obj, "resource_count_annotated", None)

        if line_count is None or department_count is None or group_count is None or resource_count is None:
            from manufacturing.models import ResourceGroup, Resource

            plant_lines = obj.production_lines.all()
            line_count = plant_lines.count()
            dept_ids = set()
            for line in plant_lines:
                for a in line.department_assignments.all():
                    dept_ids.add(a.department_id)

            department_count = len(dept_ids)
            group_qs = ResourceGroup.objects.filter(department_id__in=dept_ids) if dept_ids else ResourceGroup.objects.none()
            group_count = group_qs.count()
            resource_qs = (
                Resource.objects.filter(resource_group_id__in=list(group_qs.values_list("id", flat=True)))
                if dept_ids
                else Resource.objects.none()
            )
            resource_count = resource_qs.count()

        mfg_refs = list(obj.manufacturing_focus_refs.all()) if obj.pk else []
        return cls(
            id=strawberry.ID(str(obj.id)),
            company_id=strawberry.ID(str(obj.company_id)),
            company_name=obj.company.name if obj.company_id else "",
            code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            status_id=str(obj.status_id_id) if obj.status_id_id else None,
            status_ref=_ref_val(obj.status_id) if obj.status_id_id else None,
            building=obj.building, address=obj.address,
            city=obj.city, state=obj.state, country=obj.country,
            country_id=str(obj.country_id_id) if obj.country_id_id else None,
            country_ref=_ref_val(obj.country_id) if obj.country_id_id else None,
            zipcode=obj.zipcode, timezone=obj.timezone,
            timezone_id=str(obj.timezone_id_id) if obj.timezone_id_id else None,
            timezone_ref=_ref_val(obj.timezone_id) if obj.timezone_id_id else None,
            latitude=obj.latitude, longitude=obj.longitude,
            plant_type=obj.plant_type,
            plant_type_id=str(obj.plant_type_id_id) if obj.plant_type_id_id else None,
            plant_type_ref=_ref_val(obj.plant_type_id) if obj.plant_type_id_id else None,
            operating_since=obj.operating_since,
            manager_name=obj.manager_name, manager_email=obj.manager_email,
            manager_phone=obj.manager_phone,
            default_calendar=obj.default_calendar,
            default_calendar_id=str(obj.default_calendar_id_id) if obj.default_calendar_id_id else None,
            default_calendar_ref=_ref_val(obj.default_calendar_id) if obj.default_calendar_id_id else None,
            default_shift_model=obj.default_shift_model,
            default_shift_model_id=str(obj.default_shift_model_id_id) if obj.default_shift_model_id_id else None,
            default_shift_model_ref=_ref_val(obj.default_shift_model_id) if obj.default_shift_model_id_id else None,
            week_start_day=obj.week_start_day,
            week_start_day_id=str(obj.week_start_day_id_id) if obj.week_start_day_id_id else None,
            week_start_day_ref=_ref_val(obj.week_start_day_id) if obj.week_start_day_id_id else None,
            default_schedule=obj.default_schedule,
            default_schedule_id=str(obj.default_schedule_id_id) if obj.default_schedule_id_id else None,
            default_schedule_ref=_ref_val(obj.default_schedule_id) if obj.default_schedule_id_id else None,
            manufacturing_focus=obj.manufacturing_focus,
            manufacturing_focus_refs=[_ref_val(rv) for rv in mfg_refs],
            line_count=line_count, department_count=department_count,
            group_count=group_count, resource_count=resource_count,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── ProductionLine ──

@strawberry.type
class ProductionLineDepartmentLinkNode:
    id: strawberry.ID
    sequence: int
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    department_name: str = strawberry.field(name="departmentName")
    department_code: str = strawberry.field(name="departmentCode")
    resource_groups: int = strawberry.field(name="resourceGroups")
    resources: int
    schedule: str
    status: str


@strawberry.type
class ProductionLineResourceGroupOptionNode:
    id: strawberry.ID
    code: str
    name: str
    department_name: str = strawberry.field(name="departmentName")


@strawberry.type
class AssignedResourceGroupNode:
    id: strawberry.ID
    resource_group_id: strawberry.ID = strawberry.field(name="resourceGroupId")
    resource_group_code: str = strawberry.field(name="resourceGroupCode")
    resource_group_name: str = strawberry.field(name="resourceGroupName")
    department_name: str = strawberry.field(name="departmentName")
    sequence: int
    is_active: bool = strawberry.field(name="isActive")

    @classmethod
    def from_db(cls, obj) -> "AssignedResourceGroupNode":
        rg = obj.resource_group
        return cls(
            id=strawberry.ID(str(obj.id)),
            resource_group_id=strawberry.ID(str(rg.id)),
            resource_group_code=rg.code,
            resource_group_name=rg.name,
            department_name=rg.department.name if rg.department else "",
            sequence=obj.sequence,
            is_active=obj.is_active,
        )


@strawberry.type
class ProductFamilyAssignmentNode:
    id: strawberry.ID
    name: str
    code: str
    is_primary: bool = strawberry.field(name="isPrimary")
    status: str

    @classmethod
    def from_db(cls, obj) -> "ProductFamilyAssignmentNode":
        return cls(
            id=strawberry.ID(str(obj.product_family_id)),
            name=obj.product_family.name if obj.product_family else "",
            code=obj.product_family.code if obj.product_family else "",
            is_primary=obj.is_primary,
            status=obj.status,
        )


@strawberry.type
class ProductModelAssignmentNode:
    id: strawberry.ID
    name: str
    code: str
    family_id: typing.Optional[strawberry.ID] = strawberry.field(name="familyId", default=None)
    family_name: typing.Optional[str] = strawberry.field(name="familyName", default=None)
    is_primary: bool = strawberry.field(name="isPrimary")
    status: str

    @classmethod
    def from_db(cls, obj) -> "ProductModelAssignmentNode":
        return cls(
            id=strawberry.ID(str(obj.product_model_id)),
            name=obj.product_model.name if obj.product_model else "",
            code=obj.product_model.code if obj.product_model else "",
            family_id=strawberry.ID(str(obj.product_family_id)) if obj.product_family_id else None,
            family_name=obj.product_family.name if obj.product_family else None,
            is_primary=obj.is_primary,
            status=obj.status,
        )


@strawberry.type
class ProductModelByFamilyNode:
    id: strawberry.ID
    name: str
    code: str
    family_id: strawberry.ID = strawberry.field(name="familyId")
    status: str

    @classmethod
    def from_reference(cls, obj, family_id: str) -> "ProductModelByFamilyNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            name=obj.name,
            code=obj.code,
            family_id=strawberry.ID(str(family_id)),
            status=obj.status,
        )

    @classmethod
    def from_product_model(cls, obj: ProductModel) -> "ProductModelByFamilyNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            name=obj.name,
            code=obj.code,
            family_id=strawberry.ID(str(obj.family_id)),
            status=obj.status,
        )


@strawberry.type
class ProductionLineNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    status_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="statusRef", default=None)
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")
    line_type: str = strawberry.field(name="lineType")
    line_type_id: typing.Optional[str] = strawberry.field(name="lineTypeId", default=None)
    line_type_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="lineTypeRef", default=None)
    shift_pattern: str = strawberry.field(name="shiftPattern")
    shift_pattern_id: typing.Optional[str] = strawberry.field(name="shiftPatternId", default=None)
    shift_pattern_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="shiftPatternRef", default=None)
    default_calendar: str = strawberry.field(name="defaultCalendar")
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId", default=None)
    default_calendar_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="defaultCalendarRef", default=None)
    week_start_day: str = strawberry.field(name="weekStartDay")
    week_start_day_id: typing.Optional[str] = strawberry.field(name="weekStartDayId", default=None)
    week_start_day_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="weekStartDayRef", default=None)
    timezone: str
    timezone_id: typing.Optional[str] = strawberry.field(name="timezoneId", default=None)
    timezone_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="timezoneRef", default=None)
    product_families: list["ProductFamilyAssignmentNode"] = strawberry.field(name="productFamilies", default_factory=list)
    product_family: typing.Optional["ProductFamilyAssignmentNode"] = strawberry.field(name="productFamily", default=None)
    product_family_id: typing.Optional[str] = strawberry.field(name="productFamilyId", default=None)
    product_models: list["ProductModelAssignmentNode"] = strawberry.field(name="productModels", default_factory=list)
    product_family_count: int = strawberry.field(name="productFamilyCount", default=0)
    product_model_count: int = strawberry.field(name="productModelCount", default=0)
    primary_model_id: typing.Optional[str] = strawberry.field(name="primaryModelId", default=None)
    primary_product_model: typing.Optional["ProductModelAssignmentNode"] = strawberry.field(name="primaryProductModel", default=None)
    bottleneck_resource_group_calculated: typing.Optional[str] = strawberry.field(name="bottleneckResourceGroupCalculated", default=None)
    constraint_status: str = strawberry.field(name="constraintStatus", default="No")
    capacity_basis: str = strawberry.field(name="capacityBasis")
    capacity_uom: str = strawberry.field(name="capacityUom")
    capacity_uom_id: typing.Optional[str] = strawberry.field(name="capacityUomId", default=None)
    capacity_uom_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="capacityUomRef", default=None)
    bottleneck_resource_group_id: typing.Optional[str] = strawberry.field(name="bottleneckResourceGroupId", default=None)
    bottleneck_resource_group: typing.Optional[str] = strawberry.field(name="bottleneckResourceGroup", default=None)
    resource_group_options: list[ProductionLineResourceGroupOptionNode] = strawberry.field(name="resourceGroupOptions", default_factory=list)
    assigned_resource_groups: list[AssignedResourceGroupNode] = strawberry.field(name="assignedResourceGroups", default_factory=list)
    is_constraint: bool = strawberry.field(name="isConstraint")
    line_count: typing.Optional[int] = strawberry.field(name="lineCount", default=0)
    department_count: typing.Optional[int] = strawberry.field(name="departmentCount", default=0)
    group_count: typing.Optional[int] = strawberry.field(name="groupCount", default=0)
    resource_count: typing.Optional[int] = strawberry.field(name="resourceCount", default=0)
    department_links: list[ProductionLineDepartmentLinkNode] = strawberry.field(name="departmentLinks", default_factory=list)
    models_produced: typing.Optional[list[str]] = strawberry.field(name="modelsProduced", default_factory=list)
    flow_routing_status: str = strawberry.field(name="flowRoutingStatus")
    active_flow_route_id: typing.Optional[str] = strawberry.field(name="activeFlowRouteId", default=None)
    active_flow_route_version: typing.Optional[str] = strawberry.field(name="activeFlowRouteVersion", default=None)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProductionLine) -> "ProductionLineNode":
        assignments = list(obj.department_assignments.select_related("department").order_by("sequence", "id"))
        department_links: list[ProductionLineDepartmentLinkNode] = []
        resource_group_options: list[ProductionLineResourceGroupOptionNode] = []
        seen_rg_ids = set()
        group_count = 0
        resource_count = 0
        for assignment in assignments:
            dept = assignment.department
            groups = list(dept.resource_groups.all()) if dept else []
            group_total = len(groups)
            resource_total = sum(group.resources.count() for group in groups)
            group_count += group_total
            resource_count += resource_total
            for group in groups:
                if group.id in seen_rg_ids:
                    continue
                seen_rg_ids.add(group.id)
                resource_group_options.append(ProductionLineResourceGroupOptionNode(
                    id=strawberry.ID(str(group.id)),
                    code=group.code,
                    name=group.name,
                    department_name=dept.name if dept else "",
                ))
            department_links.append(ProductionLineDepartmentLinkNode(
                id=strawberry.ID(str(assignment.id)),
                sequence=assignment.sequence,
                department_id=strawberry.ID(str(dept.id)) if dept else strawberry.ID(""),
                department_name=dept.name if dept else "",
                department_code=dept.code if dept else "",
                resource_groups=group_total,
                resources=resource_total,
                schedule="Plant default",
                status=assignment.status,
            ))
        fam_assignments = list(obj.family_assignments.select_related("product_family").all())
        model_assignments = list(obj.model_assignments.select_related("product_model", "product_family").all())
        primary_family_assignment = next((a for a in fam_assignments if a.is_primary), fam_assignments[0] if fam_assignments else None)
        primary_model_assignment = next((a for a in model_assignments if a.is_primary), None)
        primary_family_node = ProductFamilyAssignmentNode.from_db(primary_family_assignment) if primary_family_assignment else None
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            status_id=str(obj.status_id_id) if obj.status_id_id else None,
            status_ref=_ref_val(obj.status_id) if obj.status_id_id else None,
            plant_id=strawberry.ID(str(obj.plant_id)),
            plant_name=obj.plant.name if obj.plant else "",
            line_type=obj.line_type_id.name if obj.line_type_id_id else "",
            line_type_id=str(obj.line_type_id_id) if obj.line_type_id_id else None,
            line_type_ref=_ref_val(obj.line_type_id) if obj.line_type_id_id else None,
            shift_pattern=obj.shift_pattern_id.name if obj.shift_pattern_id_id else obj.shift_pattern,
            shift_pattern_id=str(obj.shift_pattern_id_id) if obj.shift_pattern_id_id else None,
            shift_pattern_ref=_ref_val(obj.shift_pattern_id) if obj.shift_pattern_id_id else None,
            default_calendar=obj.default_calendar_id.name if obj.default_calendar_id_id else "",
            default_calendar_id=str(obj.default_calendar_id_id) if obj.default_calendar_id_id else None,
            default_calendar_ref=_ref_val(obj.default_calendar_id) if obj.default_calendar_id_id else None,
            week_start_day=obj.week_start_day_id.name if obj.week_start_day_id_id else "",
            week_start_day_id=str(obj.week_start_day_id_id) if obj.week_start_day_id_id else None,
            week_start_day_ref=_ref_val(obj.week_start_day_id) if obj.week_start_day_id_id else None,
            timezone=obj.timezone_id.name if obj.timezone_id_id else "",
            timezone_id=str(obj.timezone_id_id) if obj.timezone_id_id else None,
            timezone_ref=_ref_val(obj.timezone_id) if obj.timezone_id_id else None,
            product_families=[ProductFamilyAssignmentNode.from_db(a) for a in fam_assignments],
            product_family=primary_family_node,
            product_family_id=str(primary_family_assignment.product_family_id) if primary_family_assignment else None,
            product_models=[ProductModelAssignmentNode.from_db(a) for a in model_assignments],
            product_family_count=len(fam_assignments),
            product_model_count=len(model_assignments),
            primary_model_id=str(primary_model_assignment.product_model_id) if primary_model_assignment else None,
            primary_product_model=ProductModelAssignmentNode.from_db(primary_model_assignment) if primary_model_assignment else None,
            bottleneck_resource_group_calculated=obj.bottleneck_resource_group.name if obj.bottleneck_resource_group_id else None,
            constraint_status="Yes" if obj.is_constraint else "No",
            capacity_basis=obj.capacity_basis,
            capacity_uom=obj.capacity_uom_id.name if obj.capacity_uom_id_id else "",
            capacity_uom_id=str(obj.capacity_uom_id_id) if obj.capacity_uom_id_id else None,
            capacity_uom_ref=_ref_val(obj.capacity_uom_id) if obj.capacity_uom_id_id else None,
            bottleneck_resource_group_id=str(obj.bottleneck_resource_group_id) if obj.bottleneck_resource_group_id else None,
            bottleneck_resource_group=obj.bottleneck_resource_group.name if obj.bottleneck_resource_group_id else None,
            resource_group_options=resource_group_options,
            assigned_resource_groups=[AssignedResourceGroupNode.from_db(a) for a in obj.assigned_resource_groups.select_related("resource_group__department").order_by("sequence").all()],
            is_constraint=obj.is_constraint,
            line_count=1,
            department_count=len(department_links),
            group_count=group_count,
            resource_count=resource_count,
            department_links=department_links,
            models_produced=[a.product_model.name for a in model_assignments if a.product_model],
            flow_routing_status="CONFIGURED" if obj.routings.filter(status="ACTIVE").exists() else "MISSING",
            active_flow_route_id=str(obj.routings.filter(status="ACTIVE").values_list("id", flat=True).first()) if obj.routings.filter(status="ACTIVE").exists() else None,
            active_flow_route_version=obj.routings.filter(status="ACTIVE").values_list("version", flat=True).first() or None,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── ProductionLineDepartmentAssignment ──

@strawberry.type
class ProductionLineDepartmentAssignmentNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    sequence: int
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProductionLineDepartmentAssignment) -> "ProductionLineDepartmentAssignmentNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            production_line_id=strawberry.ID(str(obj.production_line_id)),
            department_id=strawberry.ID(str(obj.department_id)),
            sequence=obj.sequence, status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── Department ──

@strawberry.type
class PersonRefNode:
    id: strawberry.ID
    name: str


@strawberry.type
class DepartmentProductionLineNode:
    id: strawberry.ID
    code: str
    name: str
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")
    status: str


@strawberry.type
class DepartmentResourceGroupNode:
    id: strawberry.ID
    code: str
    name: str
    status: str
    resource_count: int = strawberry.field(name="resourceCount")


@strawberry.type
class DepartmentNode:
    id: strawberry.ID
    code: str
    name: str
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    plant: PlantNode
    description: str
    status: str
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    status_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="statusRef", default=None)
    manager: str
    manager_ref: typing.Optional[PersonRefNode] = strawberry.field(name="managerRef", default=None)
    supervisor: typing.Optional[PersonRefNode] = None
    supervisor_name: str = strawberry.field(name="supervisorName", default="")
    employees: int
    employee_count: int = strawberry.field(name="employeeCount")
    department_type_id: typing.Optional[str] = strawberry.field(name="departmentTypeId", default=None)
    department_type_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="departmentTypeRef", default=None)
    group_count: typing.Optional[int] = strawberry.field(name="groupCount", default=0)
    group_name: typing.Optional[str] = strawberry.field(name="groupName", default="")
    production_line_count: int = strawberry.field(name="productionLineCount", default=0)
    production_lines: list[DepartmentProductionLineNode] = strawberry.field(name="productionLines", default_factory=list)
    resource_group_count: int = strawberry.field(name="resourceGroupCount", default=0)
    resource_count: int = strawberry.field(name="resourceCount", default=0)
    resource_groups: list[DepartmentResourceGroupNode] = strawberry.field(name="resourceGroups", default_factory=list)
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Department) -> "DepartmentNode":
        from django.contrib.auth.models import User
        from manufacturing.models import UserRole

        def person_ref(raw: str | None) -> typing.Optional[PersonRefNode]:
            value = (raw or "").strip()
            if not value:
                return None
            user = User.objects.filter(id=value).first() if value.isdigit() else None
            if not user and not value.isdigit():
                user = User.objects.filter(username__iexact=value).first() or User.objects.filter(email__iexact=value).first()
            if not user and not value.isdigit():
                lookup = value.casefold()
                user = next((candidate for candidate in User.objects.all() if (candidate.get_full_name() or "").casefold() == lookup), None)
            if user:
                return PersonRefNode(id=strawberry.ID(str(user.id)), name=user.get_full_name() or user.username)
            ref = ReferenceValue.objects.filter(id=value).first() if value.isdigit() else None
            if not ref and not value.isdigit():
                ref = ReferenceValue.objects.filter(
                    category__code__in=("staff", "employee", "user", "manager", "supervisor"),
                    is_active=True,
                ).filter(Q(name__iexact=value) | Q(code__iexact=value)).first()
            if ref:
                return PersonRefNode(id=strawberry.ID(str(ref.id)), name=ref.name)
            return None

        assignments = list(obj.line_assignments.all())
        resource_groups = list(obj.resource_groups.all())
        production_line_nodes = []
        for assignment in assignments:
            line = assignment.production_line
            production_line_nodes.append(DepartmentProductionLineNode(
                id=strawberry.ID(str(line.id)),
                code=line.code,
                name=line.name,
                plant_id=strawberry.ID(str(line.plant_id)),
                plant_name=line.plant.name if line.plant else "",
                status=assignment.status,
            ))
        resource_group_nodes = []
        for group in resource_groups:
            resource_group_nodes.append(DepartmentResourceGroupNode(
                id=strawberry.ID(str(group.id)),
                code=group.code,
                name=group.name,
                status=group.status,
                resource_count=group.resources.count(),
            ))
        production_line_count = getattr(obj, "production_line_count", len(production_line_nodes))
        resource_group_count = getattr(obj, "resource_group_count", len(resource_group_nodes))
        resource_count = getattr(obj, "resource_count", sum(group.resource_count for group in resource_group_nodes))
        employee_count = UserRole.objects.filter(department__in=[str(obj.id), obj.code, obj.name]).count()
        manager_ref = person_ref(obj.manager)
        supervisor_name = getattr(obj, "supervisor", "") or ""
        supervisor_ref = person_ref(supervisor_name)
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            plant_id=strawberry.ID(str(obj.plant_id)),
            plant=PlantNode.from_db(obj.plant),
            description=obj.description, status=obj.status,
            status_id=str(obj.status_id_id) if obj.status_id_id else None,
            status_ref=_ref_val(obj.status_id) if obj.status_id_id else None,
            manager=obj.manager,
            manager_ref=manager_ref,
            supervisor=supervisor_ref,
            supervisor_name=supervisor_name,
            employees=employee_count,
            employee_count=employee_count,
            department_type_id=str(obj.department_type_id_id) if obj.department_type_id_id else None,
            department_type_ref=_ref_val(obj.department_type_id) if obj.department_type_id_id else None,
            group_count=resource_group_count,
            group_name=resource_group_nodes[0].name if resource_group_nodes else "",
            production_line_count=production_line_count,
            production_lines=production_line_nodes,
            resource_group_count=resource_group_count,
            resource_count=resource_count,
            resource_groups=resource_group_nodes,
            department_id=strawberry.ID(str(obj.id)),
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── ResourceGroup ──

@strawberry.type
class ResolvedScheduleNode:
    source: typing.Optional[str] = None
    calendar_name: str = strawberry.field(name="calendarName")
    shift_name: str = strawberry.field(name="shiftName")
    timezone: str
    week_start: str = strawberry.field(name="weekStart")
    is_configured: bool = strawberry.field(name="isConfigured")


@strawberry.type
class ResourceGroupNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    status_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="statusRef", default=None)
    company_id: typing.Optional[str] = strawberry.field(name="companyId", default=None)
    company_name: str = strawberry.field(name="companyName", default="")
    department_id: typing.Optional[str] = strawberry.field(name="departmentId")
    department_name: str = strawberry.field(name="departmentName")
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    plant_name: str = strawberry.field(name="plantName", default="")
    members: int
    leader: str
    supervisor: str
    group_type_id: typing.Optional[str] = strawberry.field(name="groupTypeId", default=None)
    group_type_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="groupTypeRef", default=None)
    capability_type: str = strawberry.field(name="capabilityType")
    shift_pattern_id: typing.Optional[str] = strawberry.field(name="shiftPatternId", default=None)
    shift_pattern_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="shiftPatternRef", default=None)
    capacity_model: str = strawberry.field(name="capacityModel")
    oee_target: typing.Optional[float] = strawberry.field(name="oeeTarget", default=None)
    assigned_resource_count: int = strawberry.field(name="assignedResourceCount", default=0)
    is_bottleneck: bool = strawberry.field(name="isBottleneck")
    is_constraint: bool = strawberry.field(name="isConstraint")
    resource_count: typing.Optional[int] = strawberry.field(name="resourceCount", default=0)
    resource_type: typing.Optional[str] = strawberry.field(name="resourceType", default="")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")
    latest_capacity: typing.Optional["CapacitySnapshotNode"] = strawberry.field(name="latestCapacity", default=None)
    schedule_status: str = strawberry.field(name="scheduleStatus")
    resolved_schedule_source: typing.Optional[str] = strawberry.field(name="resolvedScheduleSource", default=None)
    resolved_schedule_name: typing.Optional[str] = strawberry.field(name="resolvedScheduleName", default=None)
    resolved_shift_name: typing.Optional[str] = strawberry.field(name="resolvedShiftName", default=None)
    resolved_schedule: ResolvedScheduleNode = strawberry.field(name="resolvedSchedule")

    @classmethod
    def from_db(cls, obj: ResourceGroup) -> "ResourceGroupNode":
        dept = obj.department if obj.department_id else None
        plant = dept.plant if dept and dept.plant_id else None
        company = plant.company if plant and plant.company_id else None
        res_count = obj.resources.count()
        snap = CapacitySnapshot.objects.filter(
            scope_type="RESOURCE_GROUP", scope_id=str(obj.id),
            status="ACTIVE",
        ).order_by("-calculated_at").first()

        from manufacturing.domain.schedule_assignment_service import ScheduleAssignmentService
        from manufacturing.domain.schedule_service import ScheduleService
        assignment = ScheduleAssignmentService.resolve_assignment("RESOURCE_GROUP", str(obj.id))
        schedule = assignment.work_schedule if assignment else ScheduleService.resolve_schedule("RESOURCE_GROUP", str(obj.id))

        sched_status = "MISSING"
        sched_source = None
        sched_name = None
        shift_name = None
        timezone_name = ""
        week_start = ""
        if schedule:
            sched_status = "SCHEDULED" if schedule.scope_type == "RESOURCE_GROUP" else "INHERITED"
            sched_source = schedule.scope_type
            sched_name = schedule.name
            timezone_name = schedule.timezone or (plant.timezone if plant else "")
            week_start = plant.week_start_day if plant else ""
            first_shift = schedule.shifts.filter(is_active=True).order_by("weekday", "start_time").first()
            if first_shift:
                shift_name = first_shift.name
        resolved_schedule = ResolvedScheduleNode(
            source=sched_source,
            calendar_name=sched_name or "",
            shift_name=shift_name or "",
            timezone=timezone_name,
            week_start=week_start,
            is_configured=bool(schedule and shift_name),
        )

        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            status_id=str(obj.status_id_id) if obj.status_id_id else None,
            status_ref=_ref_val(obj.status_id) if obj.status_id_id else None,
            company_id=str(company.id) if company else None,
            company_name=company.name if company else "",
            department_id=str(dept.id) if dept else None,
            department_name=dept.name if dept else "",
            plant_id=str(plant.id) if plant else None,
            plant_name=plant.name if plant else "",
            members=obj.members, leader=obj.leader, supervisor=obj.supervisor,
            group_type_id=str(obj.group_type_id_id) if obj.group_type_id_id else None,
            group_type_ref=_ref_val(obj.group_type_id) if obj.group_type_id_id else None,
            capability_type=obj.capability_type,
            shift_pattern_id=str(obj.shift_pattern_id_id) if obj.shift_pattern_id_id else None,
            shift_pattern_ref=_ref_val(obj.shift_pattern_id) if obj.shift_pattern_id_id else None,
            capacity_model=obj.capacity_model,
            oee_target=obj.oee_target,
            assigned_resource_count=res_count,
            is_bottleneck=obj.is_bottleneck,
            is_constraint=obj.is_constraint,
            resource_count=res_count,
            resource_type=obj.capability_type if obj.capability_type else "",
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
            latest_capacity=CapacitySnapshotNode.from_db(snap) if snap else None,
            schedule_status=sched_status,
            resolved_schedule_source=sched_source,
            resolved_schedule_name=sched_name,
            resolved_shift_name=shift_name,
            resolved_schedule=resolved_schedule,
        )


@strawberry.type
class ResourceGroupFlowUsageNode:
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    production_line_name: str = strawberry.field(name="productionLineName")
    routing_id: strawberry.ID = strawberry.field(name="routingId")
    routing_version: str = strawberry.field(name="routingVersion")
    routing_status: str = strawberry.field(name="routingStatus")
    step_sequence: int = strawberry.field(name="stepSequence")
    step_id: strawberry.ID = strawberry.field(name="stepId")
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")

    @classmethod
    def from_db(cls, step: "RoutingStep") -> "ResourceGroupFlowUsageNode":
        routing = step.routing
        return cls(
            production_line_id=strawberry.ID(str(routing.production_line_id)),
            production_line_name=routing.production_line.name if routing.production_line else "",
            routing_id=strawberry.ID(str(routing.id)),
            routing_version=routing.version,
            routing_status=routing.status,
            step_sequence=step.sequence,
            step_id=strawberry.ID(str(step.id)),
            cycle_time_sec=step.cycle_time_sec,
        )


# ── Resource ──

@strawberry.type
class ResourceNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    status_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="statusRef", default=None)
    resource_group_id: strawberry.ID = strawberry.field(name="resourceGroupId")
    resource_group_name: str = strawberry.field(name="resourceGroupName")
    department_id: typing.Optional[str] = strawberry.field(name="departmentId", default=None)
    department_name: str = strawberry.field(name="departmentName", default="")
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    plant_name: str = strawberry.field(name="plantName", default="")
    resource_type_id: typing.Optional[str] = strawberry.field(name="resourceTypeId", default=None)
    resource_type_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="resourceTypeRef", default=None)
    capabilities: typing.Optional[list["ReferenceValueNode"]] = strawberry.field(default_factory=list)
    utilization: typing.Optional[float] = strawberry.field(default=0.0)
    op_status: typing.Optional[str] = strawberry.field(name="opStatus", default="Idle")
    last_activity: typing.Optional[str] = strawberry.field(name="lastActivity", default=None)
    shift_pattern: typing.Optional[str] = strawberry.field(name="shiftPattern", default="")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Resource) -> "ResourceNode":
        caps = list(obj.capabilities.all()) if obj.pk else []
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            status_id=str(obj.status_id_id) if obj.status_id_id else None,
            status_ref=_ref_val(obj.status_id) if obj.status_id_id else None,
            resource_group_id=strawberry.ID(str(obj.resource_group_id)),
            resource_group_name=obj.resource_group.name if obj.resource_group else "",
            department_id=str(obj.resource_group.department_id) if obj.resource_group_id else None,
            department_name=obj.resource_group.department.name if obj.resource_group_id else "",
            plant_id=str(obj.resource_group.department.plant_id) if obj.resource_group_id else None,
            plant_name=obj.resource_group.department.plant.name if obj.resource_group_id else "",
            resource_type_id=str(obj.resource_type_id_id) if obj.resource_type_id_id else None,
            resource_type_ref=_ref_val(obj.resource_type_id) if obj.resource_type_id_id else None,
            capabilities=[_ref_val(rv) for rv in caps],
            utilization=0.0,
            op_status="Idle",
            last_activity=None,
            shift_pattern="",
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── Schedule ──

@strawberry.type
class ScheduleNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Schedule) -> "ScheduleNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ShiftNode:
    id: strawberry.ID
    schedule_id: strawberry.ID = strawberry.field(name="scheduleId")
    name: str
    start_time: str = strawberry.field(name="startTime")
    end_time: str = strawberry.field(name="endTime")
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Shift) -> "ShiftNode":
        return cls(
            id=strawberry.ID(str(obj.id)), schedule_id=strawberry.ID(str(obj.schedule_id)),
            name=obj.name,
            start_time=obj.start_time.isoformat() if obj.start_time else "",
            end_time=obj.end_time.isoformat() if obj.end_time else "",
            status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ScheduleAssignmentNode:
    id: strawberry.ID
    plant_id: typing.Optional[strawberry.ID] = strawberry.field(name="plantId", default=None)
    entity_type: str = strawberry.field(name="entityType")
    entity_id: str = strawberry.field(name="entityId")
    schedule_id: typing.Optional[strawberry.ID] = strawberry.field(name="scheduleId", default=None)
    work_schedule_id: typing.Optional[strawberry.ID] = strawberry.field(name="workScheduleId", default=None)
    inheritance_mode: str = strawberry.field(name="inheritanceMode")
    priority: int
    is_active: bool = strawberry.field(name="isActive")
    valid_from: typing.Optional[str] = strawberry.field(name="validFrom")
    valid_to: typing.Optional[str] = strawberry.field(name="validTo")
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ScheduleAssignment) -> "ScheduleAssignmentNode":
        return cls(
            id=strawberry.ID(str(obj.id)), plant_id=strawberry.ID(str(obj.plant_id)) if obj.plant_id else None,
            entity_type=obj.entity_type,
            entity_id=obj.entity_id, schedule_id=strawberry.ID(str(obj.schedule_id)) if obj.schedule_id else None,
            work_schedule_id=strawberry.ID(str(obj.work_schedule_id)) if obj.work_schedule_id else None,
            inheritance_mode=obj.inheritance_mode,
            priority=obj.priority,
            is_active=obj.is_active,
            valid_from=obj.valid_from.isoformat() if obj.valid_from else None,
            valid_to=obj.valid_to.isoformat() if obj.valid_to else None,
            status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── Reference Data & Response Types ──

@strawberry.type
class ReferenceTableCatalogEntryNode:
    """A single table within a catalog group, with record count from the backend."""
    code: str
    label: str
    label_singular: str = strawberry.field(name="labelSingular")
    description: str
    usage_context: str = strawberry.field(name="usageContext")
    record_count: int = strawberry.field(name="recordCount")
    is_configurable: bool = strawberry.field(name="isConfigurable")
    category_code: str = strawberry.field(name="categoryCode")
    scope: str


@strawberry.type
class ReferenceTableCatalogGroupNode:
    """A group of reference tables in the catalog sidebar."""
    code: str
    label: str
    tables: list[ReferenceTableCatalogEntryNode]


@strawberry.type
class ReferenceTableNode:
    """Reference table with metadata and values (for new referenceTables resolver)"""
    category_id: strawberry.ID = strawberry.field(name="categoryId")
    category_code: str = strawberry.field(name="categoryCode")
    category_name: str = strawberry.field(name="categoryName")
    values: list["ReferenceValueNode"] = strawberry.field(default_factory=list)
    total_count: int = strawberry.field(name="totalCount", default=0)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_category(cls, category: ReferenceCategory, values: list[ReferenceValue]) -> "ReferenceTableNode":
        return cls(
            category_id=strawberry.ID(str(category.id)),
            category_code=category.code,
            category_name=category.name,
            values=[ReferenceValueNode.from_db(v) for v in values],
            total_count=len(values),
            created_at=_iso(category.created_at),
            updated_at=_iso(category.updated_at),
        )


@strawberry.type
class ReferenceCategoryNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ReferenceCategory) -> "ReferenceCategoryNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ReferenceValueNode:
    id: strawberry.ID
    category_id: strawberry.ID = strawberry.field(name="categoryId")
    code: str
    name: str
    description: str
    usage_context: str = strawberry.field(name="usageContext")
    sort_order: int = strawberry.field(name="sortOrder")
    is_active: bool = strawberry.field(name="isActive")
    is_system_managed: bool = strawberry.field(name="isSystemManaged")
    is_configurable: bool = strawberry.field(name="isConfigurable")
    metadata: typing.Optional[str] = None
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ReferenceValue) -> "ReferenceValueNode":
        return cls(
            id=strawberry.ID(str(obj.id)), category_id=strawberry.ID(str(obj.category_id)),
            code=obj.code, name=obj.name, description=obj.description,
            usage_context=obj.usage_context or "",
            sort_order=obj.sort_order, is_active=obj.is_active,
            is_system_managed=obj.is_system_managed,
            is_configurable=obj.is_configurable,
            metadata=json.dumps(obj.metadata) if obj.metadata else None,
            status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ResourceTypeNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ResourceType) -> "ResourceTypeNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class VisualIdentityNode:
    id: strawberry.ID
    entity_type: str = strawberry.field(name="entityType")
    entity_id: str = strawberry.field(name="entityId")
    icon_key: str = strawberry.field(name="iconKey")
    color_key: str = strawberry.field(name="colorKey")
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: VisualIdentity) -> "VisualIdentityNode":
        return cls(
            id=strawberry.ID(str(obj.id)), entity_type=obj.entity_type,
            entity_id=obj.entity_id, icon_key=obj.icon_key,
            color_key=obj.color_key, status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── Product Routing ──

@strawberry.type
class ProductFamilyNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProductFamily) -> "ProductFamilyNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status, is_active=obj.is_active,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ProductModelNode:
    id: strawberry.ID
    family_id: typing.Optional[str] = strawberry.field(name="familyId", default=None)
    family_name: typing.Optional[str] = strawberry.field(name="familyName", default=None)
    code: str
    name: str
    description: str
    status: str
    is_active: bool = strawberry.field(name="isActive", default=True)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProductModel) -> "ProductModelNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            family_id=str(obj.family_id) if obj.family_id else None,
            family_name=obj.family.name if obj.family_id else None,
            code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            is_active=getattr(obj, "is_active", obj.status != "ARCHIVED"),
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ProductVariantNode:
    id: strawberry.ID
    model_id: strawberry.ID = strawberry.field(name="modelId")
    model_name: str = strawberry.field(name="modelName")
    code: str
    name: str
    configuration_summary: str = strawberry.field(name="configurationSummary")
    part_number: typing.Optional[str] = strawberry.field(name="partNumber", default=None)
    status: str
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProductVariant) -> "ProductVariantNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            model_id=strawberry.ID(str(obj.model_id)),
            model_name=obj.model.name,
            code=obj.code,
            name=obj.name,
            configuration_summary=obj.configuration_summary,
            part_number=obj.part_number,
            status=obj.status,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class PartNumberNode:
    id: strawberry.ID
    family_id: strawberry.ID = strawberry.field(name="familyId")
    family_name: str = strawberry.field(name="familyName")
    model_id: strawberry.ID = strawberry.field(name="modelId")
    model_name: str = strawberry.field(name="modelName")
    variant_id: typing.Optional[strawberry.ID] = strawberry.field(name="variantId", default=None)
    variant_name: typing.Optional[str] = strawberry.field(name="variantName", default=None)
    part_number: str = strawberry.field(name="partNumber")
    description: str
    revision: str
    uom: str
    status: str
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: PartNumber) -> "PartNumberNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            family_id=strawberry.ID(str(obj.family_id)),
            family_name=obj.family.name,
            model_id=strawberry.ID(str(obj.model_id)),
            model_name=obj.model.name,
            variant_id=strawberry.ID(str(obj.variant_id)) if obj.variant_id else None,
            variant_name=obj.variant.name if obj.variant_id else None,
            part_number=obj.part_number,
            description=obj.description,
            revision=obj.revision,
            uom=obj.uom,
            status=obj.status,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ProcessFlowNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId")
    part_number_id: typing.Optional[str] = strawberry.field(name="partNumberId")
    part_number: typing.Optional[str] = strawberry.field(name="partNumber")
    product_variant_id: typing.Optional[str] = strawberry.field(name="productVariantId", default=None)
    production_line_id: typing.Optional[str] = strawberry.field(name="productionLineId")
    version: str
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProcessFlow) -> "ProcessFlowNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            product_model_id=str(obj.product_model_id) if obj.product_model_id else None,
            part_number_id=str(obj.part_number_id) if obj.part_number_id else None,
            part_number=obj.part_number.part_number if obj.part_number_id else None,
            production_line_id=str(obj.production_line_id) if obj.production_line_id else None,
            version=obj.version,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ProcessStepNode:
    id: strawberry.ID
    process_flow_id: strawberry.ID = strawberry.field(name="processFlowId")
    sequence: int
    name: str
    description: str
    entity_type: str = strawberry.field(name="entityType")
    entity_id: str = strawberry.field(name="entityId")
    lead_time_minutes: typing.Optional[float] = strawberry.field(name="leadTimeMinutes")
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProcessStep) -> "ProcessStepNode":
        return cls(
            id=strawberry.ID(str(obj.id)), process_flow_id=strawberry.ID(str(obj.process_flow_id)),
            sequence=obj.sequence, name=obj.name, description=obj.description,
            entity_type=obj.entity_type, entity_id=obj.entity_id,
            lead_time_minutes=obj.lead_time_minutes,
            status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── ProductionStructureTree (read model) ──

@strawberry.type
class StructureChildNode:
    id: strawberry.ID
    type: str
    name: str
    code: str
    status: str
    department_name: typing.Optional[str] = strawberry.field(name="departmentName", default=None)
    child_count: int = strawberry.field(name="childCount")
    children: list["StructureChildNode"] = strawberry.field(name="children")
    schedule_status: str = strawberry.field(name="scheduleStatus")

    @classmethod
    def from_tree(cls, node: dict) -> "StructureChildNode":
        return cls(
            id=strawberry.ID(str(node["id"])), type=node["type"],
            name=node["name"], code=node["code"], status=node["status"],
            department_name=node.get("departmentName"),
            child_count=node.get("childCount", 0),
            children=[cls.from_tree(c) for c in node.get("children", [])],
            schedule_status=node.get("scheduleStatus", "Missing Schedule"),
        )


@strawberry.type
class ProductionStructureTree:
    id: strawberry.ID
    type: str
    name: str
    code: str
    status: str
    child_count: int = strawberry.field(name="childCount")
    children: list[StructureChildNode]
    schedule_status: str = strawberry.field(name="scheduleStatus")

    @classmethod
    def from_tree(cls, root: dict) -> "ProductionStructureTree":
        return cls(
            id=strawberry.ID(str(root["id"])), type=root["type"],
            name=root["name"], code=root["code"], status=root["status"],
            child_count=root.get("childCount", 0),
            children=[StructureChildNode.from_tree(c) for c in root.get("children", [])],
            schedule_status=root.get("scheduleStatus", "Missing Schedule"),
        )


# ── Read-only summaries ──

@strawberry.type
class ManufacturingSnapshot:
    plant_count: int = strawberry.field(name="plantCount")
    line_count: int = strawberry.field(name="lineCount")
    department_count: int = strawberry.field(name="departmentCount")
    resource_group_count: int = strawberry.field(name="resourceGroupCount")
    resource_count: int = strawberry.field(name="resourceCount")

    @classmethod
    def from_counts(cls, plants=0, lines=0, departments=0, groups=0, resources=0) -> "ManufacturingSnapshot":
        return cls(
            plant_count=plants, line_count=lines,
            department_count=departments, resource_group_count=groups,
            resource_count=resources,
        )


# ── Mutation payloads ──

@strawberry.type
class CompanyPayload:
    ok: bool
    company: typing.Optional[CompanyNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class PlantPayload:
    ok: bool
    plant: typing.Optional[PlantNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class DepartmentPayload:
    ok: bool
    department: typing.Optional[DepartmentNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class DeletePayload:
    success: bool
    in_use: bool = strawberry.field(name="inUse")
    message: str
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ProductionLinePayload:
    ok: bool
    production_line: typing.Optional[ProductionLineNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ProductFamilyAssignmentPayload:
    ok: bool
    assignments: typing.Optional[list[ProductFamilyAssignmentNode]] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ProductModelAssignmentPayload:
    ok: bool
    assignments: typing.Optional[list[ProductModelAssignmentNode]] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ProductFamilyPayload:
    ok: bool
    family: typing.Optional[ProductFamilyNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ProductModelPayload:
    ok: bool
    model: typing.Optional[ProductModelNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ProductVariantPayload:
    ok: bool
    variant: typing.Optional[ProductVariantNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class PartNumberPayload:
    ok: bool
    part_number: typing.Optional[PartNumberNode] = strawberry.field(name="partNumber", default=None)
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class BomPayload:
    ok: bool
    bom: typing.Optional["BOMNode"] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ResourceGroupPayload:
    ok: bool
    resource_group: typing.Optional[ResourceGroupNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ResourcePayload:
    ok: bool
    resource: typing.Optional[ResourceNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class MaterialBinPayload:
    ok: bool
    material_bin: typing.Optional["MaterialBinNode"] = strawberry.field(name="materialBin", default=None)
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class AssignmentPayload:
    ok: bool
    assignment: typing.Optional[ProductionLineDepartmentAssignmentNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class ProductionLineAssignmentPayload:
    ok: bool
    production_line: typing.Optional[ProductionLineNode] = strawberry.field(name="productionLine", default=None)
    assigned_resource_groups: typing.Optional[list[AssignedResourceGroupNode]] = strawberry.field(name="assignedResourceGroups", default=None)
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class SchedulePayload:
    ok: bool
    schedule: typing.Optional[ScheduleNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ScheduleAssignmentPayload:
    ok: bool
    assignment: typing.Optional[ScheduleAssignmentNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class SeedGptLinePayload:
    ok: bool
    messages: list[str] = strawberry.field(default_factory=list)
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class CleanupGptLinePayload:
    ok: bool
    messages: list[str] = strawberry.field(default_factory=list)
    errors: list[MutationError] = strawberry.field(default_factory=list)


# ── Warehouse ──

@strawberry.type
class WarehouseNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")
    code: str
    name: str
    warehouse_type: str = strawberry.field(name="warehouseType")
    location: str
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "WarehouseNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            plant_name=obj.plant.name if obj.plant else "",
            code=obj.code,
            name=obj.name,
            warehouse_type=obj.warehouse_type,
            location=obj.location or "",
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.input
class WarehouseInput:
    plant_id: str = strawberry.field(name="plantId")
    code: str
    name: str
    warehouse_type: typing.Optional[str] = strawberry.field(name="warehouseType", default="GENERAL")
    location: typing.Optional[str] = ""
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=True)


@strawberry.type
class WarehousePayload:
    ok: bool
    warehouse: typing.Optional[WarehouseNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


# ── Mutation inputs ──

@strawberry.input
class ProductFamilyInput:
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=True)

@strawberry.input
class ProductModelInput:
    family_id: str = strawberry.field(name="familyId")
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"

@strawberry.input
class ProductVariantInput:
    model_id: str = strawberry.field(name="modelId")
    code: str
    name: str
    configuration_summary: typing.Optional[str] = strawberry.field(name="configurationSummary", default="")
    part_number: typing.Optional[str] = strawberry.field(name="partNumber", default=None)
    status: typing.Optional[str] = "ACTIVE"
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=True)

@strawberry.input
class PartNumberInput:
    family_id: str = strawberry.field(name="familyId")
    model_id: str = strawberry.field(name="modelId")
    variant_id: typing.Optional[str] = strawberry.field(name="variantId", default=None)
    part_number: str = strawberry.field(name="partNumber")
    description: typing.Optional[str] = ""
    revision: typing.Optional[str] = ""
    uom: typing.Optional[str] = "EA"
    status: typing.Optional[str] = "ACTIVE"
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=True)

@strawberry.input
class BomInput:
    part_number_id: typing.Optional[str] = strawberry.field(name="partNumberId", default=None)
    product_variant_id: typing.Optional[str] = strawberry.field(name="productVariantId", default=None)
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId", default=None)
    version: typing.Optional[str] = "1.0"
    status: typing.Optional[str] = "DRAFT"
    notes: typing.Optional[str] = ""

@strawberry.input
class CompanyInput:
    code: typing.Optional[str] = None
    name: typing.Optional[str] = None
    legal_name: typing.Optional[str] = strawberry.field(name="legalName", default=None)
    description: typing.Optional[str] = None
    industry_type: typing.Optional[str] = strawberry.field(name="industryType", default=None)
    industry_type_id: typing.Optional[str] = strawberry.field(name="industryTypeId", default=None)
    status: typing.Optional[str] = None
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    address: typing.Optional[str] = None
    city: typing.Optional[str] = None
    state: typing.Optional[str] = None
    country: typing.Optional[str] = None
    country_id: typing.Optional[str] = strawberry.field(name="countryId", default=None)
    phone: typing.Optional[str] = None
    email: typing.Optional[str] = None
    website: typing.Optional[str] = None
    operating_since: typing.Optional[str] = strawberry.field(name="operatingSince", default=None)
    manufacturing_focus: typing.Optional[str] = strawberry.field(name="manufacturingFocus", default=None)
    product_lines: typing.Optional[str] = strawberry.field(name="productLines", default=None)
    lean_methodology: typing.Optional[str] = strawberry.field(name="leanMethodology", default=None)
    default_timezone: typing.Optional[str] = strawberry.field(name="defaultTimezone", default=None)
    default_timezone_id: typing.Optional[str] = strawberry.field(name="defaultTimezoneId", default=None)
    default_language: typing.Optional[str] = strawberry.field(name="defaultLanguage", default=None)
    default_language_id: typing.Optional[str] = strawberry.field(name="defaultLanguageId", default=None)
    default_calendar: typing.Optional[str] = strawberry.field(name="defaultCalendar", default=None)
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId", default=None)
    default_shift_model: typing.Optional[str] = strawberry.field(name="defaultShiftModel", default=None)
    default_shift_model_id: typing.Optional[str] = strawberry.field(name="defaultShiftModelId", default=None)
    week_start_day: typing.Optional[str] = strawberry.field(name="weekStartDay", default=None)
    week_start_day_id: typing.Optional[str] = strawberry.field(name="weekStartDayId", default=None)
    admin_name: typing.Optional[str] = strawberry.field(name="adminName", default=None)
    admin_role: typing.Optional[str] = strawberry.field(name="adminRole", default=None)
    zipcode: typing.Optional[str] = None
    manufacturing_focus_ids: typing.Optional[list[str]] = strawberry.field(name="manufacturingFocusIds", default=None)
    product_line_ids: typing.Optional[list[str]] = strawberry.field(name="productLineIds", default=None)
    lean_methodology_ids: typing.Optional[list[str]] = strawberry.field(name="leanMethodologyIds", default=None)

@strawberry.input
class PlantInput:
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    building: typing.Optional[str] = ""
    address: typing.Optional[str] = ""
    city: typing.Optional[str] = ""
    state: typing.Optional[str] = ""
    country: typing.Optional[str] = ""
    country_id: typing.Optional[str] = strawberry.field(name="countryId", default=None)
    zipcode: typing.Optional[str] = ""
    timezone: typing.Optional[str] = ""
    timezone_id: typing.Optional[str] = strawberry.field(name="timezoneId", default=None)
    latitude: typing.Optional[str] = ""
    longitude: typing.Optional[str] = ""
    plant_type: typing.Optional[str] = strawberry.field(name="plantType", default="")
    plant_type_id: typing.Optional[str] = strawberry.field(name="plantTypeId", default=None)
    operating_since: typing.Optional[str] = strawberry.field(name="operatingSince", default="")
    manager_name: typing.Optional[str] = strawberry.field(name="managerName", default="")
    manager_email: typing.Optional[str] = strawberry.field(name="managerEmail", default="")
    manager_phone: typing.Optional[str] = strawberry.field(name="managerPhone", default="")
    default_calendar: typing.Optional[str] = strawberry.field(name="defaultCalendar", default="")
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId", default=None)
    default_shift_model: typing.Optional[str] = strawberry.field(name="defaultShiftModel", default="")
    default_shift_model_id: typing.Optional[str] = strawberry.field(name="defaultShiftModelId", default=None)
    week_start_day: typing.Optional[str] = strawberry.field(name="weekStartDay", default="")
    week_start_day_id: typing.Optional[str] = strawberry.field(name="weekStartDayId", default=None)
    default_schedule: typing.Optional[str] = strawberry.field(name="defaultSchedule", default="")
    default_schedule_id: typing.Optional[str] = strawberry.field(name="defaultScheduleId", default=None)
    manufacturing_focus: typing.Optional[str] = strawberry.field(name="manufacturingFocus", default="")
    manufacturing_focus_ids: typing.Optional[list[str]] = strawberry.field(name="manufacturingFocusIds", default=None)

@strawberry.input
class ProductionLineInput:
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    line_type_id: typing.Optional[str] = strawberry.field(name="lineTypeId", default=None)
    shift_pattern: typing.Optional[str] = strawberry.field(name="shiftPattern", default="")
    shift_pattern_id: typing.Optional[str] = strawberry.field(name="shiftPatternId", default=None)
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId", default=None)
    week_start_day_id: typing.Optional[str] = strawberry.field(name="weekStartDayId", default=None)
    timezone_id: typing.Optional[str] = strawberry.field(name="timezoneId", default=None)
    capacity_basis: typing.Optional[str] = strawberry.field(name="capacityBasis", default="")
    capacity_uom_id: typing.Optional[str] = strawberry.field(name="capacityUomId", default=None)
    bottleneck_resource_group_id: typing.Optional[str] = strawberry.field(name="bottleneckResourceGroupId", default=None)
    is_constraint: typing.Optional[bool] = strawberry.field(name="isConstraint", default=False)
    product_family_id: typing.Optional[str] = strawberry.field(name="productFamilyId", default=None)
    product_model_ids: typing.Optional[list[str]] = strawberry.field(name="productModelIds", default=None)
    primary_product_model_id: typing.Optional[str] = strawberry.field(name="primaryProductModelId", default=None)

@strawberry.input
class DepartmentInput:
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    manager: typing.Optional[str] = ""
    supervisor: typing.Optional[str] = ""
    employees: typing.Optional[int] = 0
    department_type_id: typing.Optional[str] = strawberry.field(name="departmentTypeId", default=None)

@strawberry.input
class ResourceGroupInput:
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    code: typing.Optional[str] = ""
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    members: typing.Optional[int] = 0
    leader: typing.Optional[str] = ""
    supervisor: typing.Optional[str] = ""
    group_type_id: typing.Optional[str] = strawberry.field(name="groupTypeId", default=None)
    capability_type: typing.Optional[str] = strawberry.field(name="capabilityType", default="SHARED")
    shift_pattern_id: typing.Optional[str] = strawberry.field(name="shiftPatternId", default=None)
    capacity_model: typing.Optional[str] = strawberry.field(name="capacityModel", default="")
    oee_target: typing.Optional[float] = strawberry.field(name="oeeTarget", default=None)
    is_bottleneck: typing.Optional[bool] = strawberry.field(name="isBottleneck", default=False)
    is_constraint: typing.Optional[bool] = strawberry.field(name="isConstraint", default=False)


@strawberry.input
class MaterialBinInput:
    plant_id: typing.Optional[str] = strawberry.field(name="plantId", default=None)
    production_line_id: typing.Optional[str] = strawberry.field(name="productionLineId", default=None)
    resource_group_id: typing.Optional[str] = strawberry.field(name="resourceGroupId", default=None)
    code: str
    name: str
    description: typing.Optional[str] = ""
    bin_type: str = strawberry.field(name="binType")
    material_id: typing.Optional[str] = strawberry.field(name="materialId", default=None)
    material_group: typing.Optional[str] = strawberry.field(name="materialGroup", default="")
    capacity: typing.Optional[float] = 0
    uom_id: typing.Optional[str] = strawberry.field(name="uomId", default=None)
    replenishment_mode: typing.Optional[str] = strawberry.field(name="replenishmentMode", default=None)
    fifo_enabled: typing.Optional[bool] = strawberry.field(name="fifoEnabled", default=False)
    supermarket_enabled: typing.Optional[bool] = strawberry.field(name="supermarketEnabled", default=False)
    location_code: typing.Optional[str] = strawberry.field(name="locationCode", default="")
    location_reference: typing.Optional[str] = strawberry.field(name="locationReference", default="")
    warehouse_code: typing.Optional[str] = strawberry.field(name="warehouseCode", default="")
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=True)

@strawberry.input
class ResourceInput:
    resource_group_id: strawberry.ID = strawberry.field(name="resourceGroupId")
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    resource_type_id: typing.Optional[str] = strawberry.field(name="resourceTypeId", default=None)
    capability_ids: typing.Optional[list[str]] = strawberry.field(name="capabilityIds", default=None)

@strawberry.input
class AssignDepartmentInput:
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    sequence: typing.Optional[int] = 0
    status: typing.Optional[str] = "ACTIVE"

@strawberry.input
class AssignDepartmentToLinesInput:
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    production_line_ids: list[str] = strawberry.field(name="productionLineIds")

@strawberry.input
class ScheduleInput:
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"

@strawberry.input
class ScheduleAssignmentInput:
    entity_type: str = strawberry.field(name="entityType")
    entity_id: str = strawberry.field(name="entityId")
    plant_id: typing.Optional[strawberry.ID] = strawberry.field(name="plantId", default=None)
    schedule_id: typing.Optional[strawberry.ID] = strawberry.field(name="scheduleId", default=None)
    work_schedule_id: typing.Optional[strawberry.ID] = strawberry.field(name="workScheduleId", default=None)
    inheritance_mode: typing.Optional[str] = strawberry.field(name="inheritanceMode", default="NONE")
    priority: typing.Optional[int] = 0
    valid_from: typing.Optional[str] = strawberry.field(name="validFrom", default=None)
    valid_to: typing.Optional[str] = strawberry.field(name="validTo", default=None)


# ── Pagination Input Types ──

@strawberry.input
class PaginationInput:
    """Base pagination parameters for list queries"""
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class PlantPaginationInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class ProductionLineListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class DepartmentListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class ResourceGroupListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class ResourceListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class ScheduleListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class ScheduleAssignmentListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class VisualIdentityListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class ProductModelListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class ProcessFlowListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class ProcessStepListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


@strawberry.input
class ReferenceListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


# ── Paginated Response Types ──

@strawberry.type
class PaginatedReferenceCategoryResponse:
    items: list[ReferenceCategoryNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedReferenceValueResponse:
    items: list[ReferenceValueNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedShiftResponse:
    items: list[ShiftNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedScheduleAssignmentResponse:
    items: list[ScheduleAssignmentNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedVisualIdentityResponse:
    items: list[VisualIdentityNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedProductModelResponse:
    items: list[ProductModelNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedProductFamilyResponse:
    items: list[ProductFamilyNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedProductVariantResponse:
    items: list[ProductVariantNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedPartNumberResponse:
    items: list[PartNumberNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedProcessFlowResponse:
    items: list[ProcessFlowNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedProcessStepResponse:
    items: list[ProcessStepNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


def _iso(dt: typing.Optional[datetime]) -> str:
    return dt.isoformat() if dt else ""


# ── Routing ──

@strawberry.type
class RoutingStepNode:
    id: strawberry.ID
    routing_id: strawberry.ID = strawberry.field(name="routingId")
    sequence: int
    department_id: typing.Optional[strawberry.ID] = strawberry.field(name="departmentId", default=None)
    department_name: typing.Optional[str] = strawberry.field(name="departmentName", default=None)
    resource_group_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceGroupId", default=None)
    resource_group_name: typing.Optional[str] = strawberry.field(name="resourceGroupName", default=None)
    resource_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceId", default=None)
    resource_name: typing.Optional[str] = strawberry.field(name="resourceName", default=None)
    standard_work_id: typing.Optional[strawberry.ID] = strawberry.field(name="standardWorkId", default=None)
    standard_work_name: typing.Optional[str] = strawberry.field(name="standardWorkName", default=None)
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")
    setup_time_sec: typing.Optional[float] = strawberry.field(name="setupTimeSec", default=0)
    changeover_time_sec: typing.Optional[float] = strawberry.field(name="changeoverTimeSec", default=0)
    required_operators: typing.Optional[int] = strawberry.field(name="requiredOperators", default=1)
    schedule_source: str = strawberry.field(name="scheduleSource")
    buffer_type: typing.Optional[str] = strawberry.field(name="bufferType", default=None)
    wip_min: typing.Optional[int] = strawberry.field(name="wipMin", default=None)
    wip_max: typing.Optional[int] = strawberry.field(name="wipMax", default=None)
    quality_checkpoint: bool = strawberry.field(name="qualityCheckpoint")
    rework_allowed: bool = strawberry.field(name="reworkAllowed")
    notes: str
    material_inputs: list["MaterialFlowItemNode"] = strawberry.field(name="materialInputs")
    material_outputs: list["MaterialFlowItemNode"] = strawberry.field(name="materialOutputs")
    movement_rule: typing.Optional["MaterialMovementRuleNode"] = strawberry.field(name="movementRule", default=None)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: RoutingStep) -> "RoutingStepNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            routing_id=strawberry.ID(str(obj.routing_id)),
            sequence=obj.sequence,
            department_id=strawberry.ID(str(obj.department_id)) if obj.department_id else None,
            department_name=obj.department.name if obj.department else None,
            resource_group_id=strawberry.ID(str(obj.resource_group_id)) if obj.resource_group_id else None,
            resource_group_name=obj.resource_group.name if obj.resource_group else None,
            resource_id=strawberry.ID(str(obj.resource_id)) if obj.resource_id else None,
            resource_name=obj.resource.name if obj.resource else None,
            standard_work_id=strawberry.ID(str(obj.standard_work_id)) if obj.standard_work_id else None,
            standard_work_name=obj.standard_work.name if obj.standard_work else None,
            cycle_time_sec=obj.cycle_time_sec,
            setup_time_sec=obj.setup_time_sec,
            changeover_time_sec=obj.changeover_time_sec,
            required_operators=obj.required_operators,
            schedule_source=obj.schedule_source,
            buffer_type=obj.buffer_type,
            wip_min=obj.wip_min,
            wip_max=obj.wip_max,
            quality_checkpoint=obj.quality_checkpoint,
            rework_allowed=obj.rework_allowed,
            notes=obj.notes,
            material_inputs=[MaterialFlowItemNode.from_input(item) for item in obj.material_inputs.all()],
            material_outputs=[MaterialFlowItemNode.from_output(item) for item in obj.material_outputs.all()],
            movement_rule=MaterialMovementRuleNode.from_db(obj.material_movement_rule) if hasattr(obj, "material_movement_rule") else None,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class RoutingNode:
    id: strawberry.ID
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    production_line_name: str = strawberry.field(name="productionLineName")
    product_family_id: typing.Optional[strawberry.ID] = strawberry.field(name="productFamilyId", default=None)
    product_family_name: typing.Optional[str] = strawberry.field(name="productFamilyName", default=None)
    product_model_id: typing.Optional[strawberry.ID] = strawberry.field(name="productModelId", default=None)
    product_model_name: typing.Optional[str] = strawberry.field(name="productModelName", default=None)
    part_number_id: typing.Optional[strawberry.ID] = strawberry.field(name="partNumberId", default=None)
    part_number: typing.Optional[str] = strawberry.field(name="partNumber", default=None)
    part_description: typing.Optional[str] = strawberry.field(name="partDescription", default=None)
    product_variant_id: typing.Optional[strawberry.ID] = strawberry.field(name="productVariantId", default=None)
    version: str
    status: str
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    notes: str
    steps: list[RoutingStepNode]
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Routing, steps: typing.Optional[list[RoutingStep]] = None) -> "RoutingNode":
        step_nodes = [RoutingStepNode.from_db(s) for s in (steps or list(obj.steps.all().order_by("sequence")))]
        return cls(
            id=strawberry.ID(str(obj.id)),
            production_line_id=strawberry.ID(str(obj.production_line_id)),
            production_line_name=obj.production_line.name if obj.production_line else "",
            product_family_id=strawberry.ID(str(obj.product_family_id)) if obj.product_family_id else None,
            product_family_name=obj.product_family.name if obj.product_family_id else None,
            product_model_id=strawberry.ID(str(obj.product_model_id)) if obj.product_model_id else None,
            product_model_name=obj.product_model.name if obj.product_model else None,
            part_number_id=strawberry.ID(str(obj.part_number_id)) if obj.part_number_id else None,
            part_number=obj.part_number.part_number if obj.part_number_id else None,
            part_description=obj.part_number.description if obj.part_number_id else None,
            version=obj.version,
            status=obj.status,
            effective_from=obj.effective_from.isoformat() if obj.effective_from else None,
            effective_to=obj.effective_to.isoformat() if obj.effective_to else None,
            notes=obj.notes,
            steps=step_nodes,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class RoutingSummaryNode:
    routing_id: typing.Optional[strawberry.ID] = strawberry.field(name="routingId", default=None)
    status: str
    version: typing.Optional[str] = None
    routing_scope: typing.Optional[str] = strawberry.field(name="routingScope", default=None)
    message: typing.Optional[str] = None
    sequence_count: int = strawberry.field(name="sequenceCount")
    first_department_name: typing.Optional[str] = strawberry.field(name="firstDepartmentName", default=None)
    last_department_name: typing.Optional[str] = strawberry.field(name="lastDepartmentName", default=None)
    bottleneck_step_name: typing.Optional[str] = strawberry.field(name="bottleneckStepName", default=None)
    bottleneck_resource_group_name: typing.Optional[str] = strawberry.field(name="bottleneckResourceGroupName", default=None)
    constraint_status: typing.Optional[str] = strawberry.field(name="constraintStatus", default=None)
    updated_at: typing.Optional[str] = strawberry.field(name="updatedAt", default=None)


@strawberry.type
class FlowValidationMessageNode:
    field: str
    code: str
    message: str

    @classmethod
    def from_dict(cls, item: dict) -> "FlowValidationMessageNode":
        return cls(field=item.get("field", "_form"), code=item.get("code", "VALIDATION"), message=item.get("message", "Validation issue"))


@strawberry.type
class InventoryLocationNode:
    id: strawberry.ID
    code: str
    name: str
    location_type: str = strawberry.field(name="locationType")
    status: str

    @classmethod
    def from_db(cls, obj: InventoryLocation) -> "InventoryLocationNode":
        return cls(id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name, location_type=obj.location_type, status=obj.status)


@strawberry.type
class MaterialNode:
    id: strawberry.ID
    code: str
    name: str
    material_state: str = strawberry.field(name="materialState")
    status: str

    @classmethod
    def from_db(cls, obj: Material) -> "MaterialNode":
        return cls(id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name, material_state=obj.material_state, status=obj.status)


@strawberry.type
class MaterialBinNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")
    production_line_id: typing.Optional[strawberry.ID] = strawberry.field(name="productionLineId", default=None)
    production_line_name: typing.Optional[str] = strawberry.field(name="productionLineName", default=None)
    resource_group_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceGroupId", default=None)
    resource_group_name: typing.Optional[str] = strawberry.field(name="resourceGroupName", default=None)
    code: str
    name: str
    description: str
    bin_type: str = strawberry.field(name="binType")
    material_id: typing.Optional[strawberry.ID] = strawberry.field(name="materialId", default=None)
    material_code: typing.Optional[str] = strawberry.field(name="materialCode", default=None)
    material_name: typing.Optional[str] = strawberry.field(name="materialName", default=None)
    material_group: str = strawberry.field(name="materialGroup")
    capacity: float
    uom_id: typing.Optional[strawberry.ID] = strawberry.field(name="uomId", default=None)
    uom_name: typing.Optional[str] = strawberry.field(name="uomName", default=None)
    replenishment_mode: typing.Optional[str] = strawberry.field(name="replenishmentMode", default=None)
    fifo_enabled: bool = strawberry.field(name="fifoEnabled")
    supermarket_enabled: bool = strawberry.field(name="supermarketEnabled")
    location_code: str = strawberry.field(name="locationCode")
    location_reference: str = strawberry.field(name="locationReference")
    warehouse_code: str = strawberry.field(name="warehouseCode")
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: MaterialBin) -> "MaterialBinNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            plant_name=obj.plant.name if obj.plant_id else "",
            production_line_id=strawberry.ID(str(obj.production_line_id)) if obj.production_line_id else None,
            production_line_name=obj.production_line.name if obj.production_line_id else None,
            resource_group_id=strawberry.ID(str(obj.resource_group_id)) if obj.resource_group_id else None,
            resource_group_name=obj.resource_group.name if obj.resource_group_id else None,
            code=obj.code,
            name=obj.name,
            description=obj.description,
            bin_type=obj.bin_type,
            material_id=strawberry.ID(str(obj.material_id)) if obj.material_id else None,
            material_code=obj.material.code if obj.material_id else None,
            material_name=obj.material.name if obj.material_id else None,
            material_group=obj.material_group,
            capacity=obj.capacity,
            uom_id=strawberry.ID(str(obj.uom_id)) if obj.uom_id else None,
            uom_name=obj.uom.name if obj.uom_id else None,
            replenishment_mode=obj.replenishment_mode,
            fifo_enabled=obj.fifo_enabled,
            supermarket_enabled=obj.supermarket_enabled,
            location_code=obj.location_code,
            location_reference=obj.location_reference,
            warehouse_code=obj.warehouse_code,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class MaterialFlowItemNode:
    id: strawberry.ID
    material_id: strawberry.ID = strawberry.field(name="materialId")
    material_code: str = strawberry.field(name="materialCode")
    material_name: str = strawberry.field(name="materialName")
    quantity: float
    material_state: str = strawberry.field(name="materialState")
    location_id: typing.Optional[strawberry.ID] = strawberry.field(name="locationId", default=None)
    location_name: typing.Optional[str] = strawberry.field(name="locationName", default=None)
    bin_id: typing.Optional[strawberry.ID] = strawberry.field(name="binId", default=None)
    bin_code: typing.Optional[str] = strawberry.field(name="binCode", default=None)
    bin_name: typing.Optional[str] = strawberry.field(name="binName", default=None)

    @classmethod
    def from_input(cls, obj: OperationInput) -> "MaterialFlowItemNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            material_id=strawberry.ID(str(obj.material_id)),
            material_code=obj.material.code,
            material_name=obj.material.name,
            quantity=obj.quantity,
            material_state=obj.material_state,
            location_id=strawberry.ID(str(obj.source_location_id)) if obj.source_location_id else None,
            location_name=obj.source_location.name if obj.source_location else None,
            bin_id=strawberry.ID(str(obj.source_bin_id)) if obj.source_bin_id else None,
            bin_code=obj.source_bin.code if obj.source_bin_id else None,
            bin_name=obj.source_bin.name if obj.source_bin_id else None,
        )

    @classmethod
    def from_output(cls, obj: OperationOutput) -> "MaterialFlowItemNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            material_id=strawberry.ID(str(obj.material_id)),
            material_code=obj.material.code,
            material_name=obj.material.name,
            quantity=obj.quantity,
            material_state=obj.material_state,
            location_id=strawberry.ID(str(obj.target_location_id)) if obj.target_location_id else None,
            location_name=obj.target_location.name if obj.target_location else None,
            bin_id=strawberry.ID(str(obj.destination_bin_id)) if obj.destination_bin_id else None,
            bin_code=obj.destination_bin.code if obj.destination_bin_id else None,
            bin_name=obj.destination_bin.name if obj.destination_bin_id else None,
        )


@strawberry.type
class MaterialMovementRuleNode:
    id: strawberry.ID
    rule_type: str = strawberry.field(name="ruleType")
    source_location_id: typing.Optional[strawberry.ID] = strawberry.field(name="sourceLocationId", default=None)
    source_location_name: typing.Optional[str] = strawberry.field(name="sourceLocationName", default=None)
    destination_location_id: typing.Optional[strawberry.ID] = strawberry.field(name="destinationLocationId", default=None)
    destination_location_name: typing.Optional[str] = strawberry.field(name="destinationLocationName", default=None)
    source_bin_id: typing.Optional[strawberry.ID] = strawberry.field(name="sourceBinId", default=None)
    source_bin_name: typing.Optional[str] = strawberry.field(name="sourceBinName", default=None)
    destination_bin_id: typing.Optional[strawberry.ID] = strawberry.field(name="destinationBinId", default=None)
    destination_bin_name: typing.Optional[str] = strawberry.field(name="destinationBinName", default=None)
    notes: str

    @classmethod
    def from_db(cls, obj: MaterialMovementRule) -> "MaterialMovementRuleNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            rule_type=obj.rule_type,
            source_location_id=strawberry.ID(str(obj.source_location_id)) if obj.source_location_id else None,
            source_location_name=obj.source_location.name if obj.source_location else None,
            destination_location_id=strawberry.ID(str(obj.destination_location_id)) if obj.destination_location_id else None,
            destination_location_name=obj.destination_location.name if obj.destination_location else None,
            source_bin_id=strawberry.ID(str(obj.source_bin_id)) if obj.source_bin_id else None,
            source_bin_name=obj.source_bin.name if obj.source_bin_id else None,
            destination_bin_id=strawberry.ID(str(obj.destination_bin_id)) if obj.destination_bin_id else None,
            destination_bin_name=obj.destination_bin.name if obj.destination_bin_id else None,
            notes=obj.notes,
        )


@strawberry.type
class ProcessFlowOperationNode:
    sequence: int
    department_name: typing.Optional[str] = strawberry.field(name="departmentName", default=None)
    resource_group_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceGroupId", default=None)
    resource_group_name: typing.Optional[str] = strawberry.field(name="resourceGroupName", default=None)
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")
    inputs: list[MaterialFlowItemNode]
    outputs: list[MaterialFlowItemNode]

    @classmethod
    def from_step(cls, obj: RoutingStep) -> "ProcessFlowOperationNode":
        return cls(
            sequence=obj.sequence,
            department_name=obj.department.name if obj.department else None,
            resource_group_id=strawberry.ID(str(obj.resource_group_id)) if obj.resource_group_id else None,
            resource_group_name=obj.resource_group.name if obj.resource_group else None,
            cycle_time_sec=obj.cycle_time_sec,
            inputs=[MaterialFlowItemNode.from_input(item) for item in obj.material_inputs.all()],
            outputs=[MaterialFlowItemNode.from_output(item) for item in obj.material_outputs.all()],
        )


@strawberry.type
class BOMItemNode:
    material_id: strawberry.ID = strawberry.field(name="materialId")
    material_code: str = strawberry.field(name="materialCode")
    material_name: str = strawberry.field(name="materialName")
    quantity: float
    scrap_factor: float = strawberry.field(name="scrapFactor")

    @classmethod
    def from_db(cls, obj: BOMItem) -> "BOMItemNode":
        return cls(
            material_id=strawberry.ID(str(obj.material_id)),
            material_code=obj.material.code,
            material_name=obj.material.name,
            quantity=obj.quantity,
            scrap_factor=obj.scrap_factor,
        )


@strawberry.type
class BOMNode:
    id: strawberry.ID
    product_model_id: strawberry.ID = strawberry.field(name="productModelId")
    part_number_id: typing.Optional[strawberry.ID] = strawberry.field(name="partNumberId", default=None)
    part_number: typing.Optional[str] = strawberry.field(name="partNumber", default=None)
    product_variant_id: typing.Optional[strawberry.ID] = strawberry.field(name="productVariantId", default=None)
    version: str
    status: str
    notes: str = ""
    item_count: int = strawberry.field(name="itemCount", default=0)
    items: list[BOMItemNode]
    created_at: str = strawberry.field(name="createdAt", default="")
    updated_at: str = strawberry.field(name="updatedAt", default="")

    @classmethod
    def from_db(cls, obj: BOM) -> "BOMNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            product_model_id=strawberry.ID(str(obj.product_model_id)),
            part_number_id=strawberry.ID(str(obj.part_number_id)) if obj.part_number_id else None,
            part_number=obj.part_number.part_number if obj.part_number_id else None,
            version=obj.version,
            status=obj.status,
            notes=obj.notes or "",
            item_count=obj.items.count() if hasattr(obj, "items") else 0,
            items=[BOMItemNode.from_db(item) for item in obj.items.all()],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class PaginatedBOMResponse:
    items: list[BOMNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class ProductionLineFlowContextNode:
    ok: bool
    message: typing.Optional[str] = None
    is_blocked: bool = strawberry.field(name="isBlocked", default=False)
    routing: typing.Optional[RoutingNode] = None
    operations: list[ProcessFlowOperationNode] = strawberry.field(default_factory=list)
    bom: typing.Optional[BOMNode] = None
    inventory_locations: list[InventoryLocationNode] = strawberry.field(name="inventoryLocations", default_factory=list)
    validations: list[FlowValidationMessageNode] = strawberry.field(default_factory=list)

    @classmethod
    def from_service(cls, data: dict) -> "ProductionLineFlowContextNode":
        routing = data.get("routing")
        return cls(
            ok=data.get("ok", False),
            message=data.get("message"),
            is_blocked=data.get("is_blocked", False),
            routing=RoutingNode.from_db(routing) if routing else None,
            operations=[ProcessFlowOperationNode.from_step(step) for step in routing.steps.all().order_by("sequence")] if routing else [],
            bom=BOMNode.from_db(data["bom"]) if data.get("bom") else None,
            inventory_locations=[InventoryLocationNode.from_db(location) for location in data.get("inventory_locations", [])],
            validations=[FlowValidationMessageNode.from_dict(item) for item in data.get("validations", [])],
        )


@strawberry.input
class RoutingInput:
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    product_family_id: typing.Optional[str] = strawberry.field(name="productFamilyId", default=None)
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId", default=None)
    part_number_id: typing.Optional[str] = strawberry.field(name="partNumberId", default=None)
    product_variant_id: typing.Optional[str] = strawberry.field(name="productVariantId", default=None)
    version: typing.Optional[str] = "1.0"
    status: typing.Optional[str] = "DRAFT"
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    notes: typing.Optional[str] = ""


@strawberry.input
class OperationMaterialInput:
    id: typing.Optional[str] = strawberry.field(default=None)
    material_id: typing.Optional[str] = strawberry.field(name="materialId", default=None)
    quantity: float = 1
    material_state: typing.Optional[str] = strawberry.field(name="materialState", default=None)
    location_id: typing.Optional[str] = strawberry.field(name="locationId", default=None)
    bin_id: typing.Optional[str] = strawberry.field(name="binId", default=None)


@strawberry.input
class MaterialMovementRuleInput:
    rule_type: typing.Optional[str] = strawberry.field(name="ruleType", default=None)
    source_location_id: typing.Optional[str] = strawberry.field(name="sourceLocationId", default=None)
    destination_location_id: typing.Optional[str] = strawberry.field(name="destinationLocationId", default=None)
    source_bin_id: typing.Optional[str] = strawberry.field(name="sourceBinId", default=None)
    destination_bin_id: typing.Optional[str] = strawberry.field(name="destinationBinId", default=None)
    notes: typing.Optional[str] = ""


@strawberry.input
class RoutingStepInput:
    id: typing.Optional[str] = strawberry.field(default=None)
    routing_id: typing.Optional[strawberry.ID] = strawberry.field(name="routingId", default=None)
    sequence: int
    department_id: typing.Optional[str] = strawberry.field(name="departmentId", default=None)
    resource_group_id: typing.Optional[str] = strawberry.field(name="resourceGroupId", default=None)
    resource_id: typing.Optional[str] = strawberry.field(name="resourceId", default=None)
    standard_work_id: typing.Optional[str] = strawberry.field(name="standardWorkId", default=None)
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")
    setup_time_sec: typing.Optional[float] = strawberry.field(name="setupTimeSec", default=0)
    changeover_time_sec: typing.Optional[float] = strawberry.field(name="changeoverTimeSec", default=0)
    required_operators: typing.Optional[int] = strawberry.field(name="requiredOperators", default=1)
    schedule_source: typing.Optional[str] = strawberry.field(name="scheduleSource", default="LINE")
    buffer_type: typing.Optional[str] = strawberry.field(name="bufferType", default=None)
    wip_min: typing.Optional[int] = strawberry.field(name="wipMin", default=None)
    wip_max: typing.Optional[int] = strawberry.field(name="wipMax", default=None)
    quality_checkpoint: typing.Optional[bool] = strawberry.field(name="qualityCheckpoint", default=False)
    rework_allowed: typing.Optional[bool] = strawberry.field(name="reworkAllowed", default=False)
    notes: typing.Optional[str] = ""
    material_inputs: list[OperationMaterialInput] = strawberry.field(name="materialInputs", default_factory=list)
    material_outputs: list[OperationMaterialInput] = strawberry.field(name="materialOutputs", default_factory=list)
    movement_rule: typing.Optional[MaterialMovementRuleInput] = strawberry.field(name="movementRule", default=None)


@strawberry.type
class RoutingPayload:
    ok: bool
    routing: typing.Optional[RoutingNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class RoutingStepPayload:
    ok: bool
    step: typing.Optional[RoutingStepNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class RoutingListPayload:
    ok: bool
    routings: list[RoutingNode] = strawberry.field(name="routings", default_factory=list)
    errors: typing.Optional[list[MutationError]] = None


@strawberry.input
class ReorderStepsInput:
    routing_id: strawberry.ID = strawberry.field(name="routingId")
    ordered_step_ids: list[str] = strawberry.field(name="orderedStepIds")


@strawberry.input
class SaveRoutingInput:
    routing_id: typing.Optional[strawberry.ID] = strawberry.field(name="routingId", default=None)
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    product_family_id: typing.Optional[str] = strawberry.field(name="productFamilyId", default=None)
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId", default=None)
    part_number_id: typing.Optional[str] = strawberry.field(name="partNumberId", default=None)
    product_variant_id: typing.Optional[str] = strawberry.field(name="productVariantId", default=None)
    version: typing.Optional[str] = "1.0"
    notes: typing.Optional[str] = ""
    steps: list[RoutingStepInput]


@strawberry.type
class StepCapacityNode:
    sequence: int
    department_name: typing.Optional[str] = strawberry.field(name="departmentName", default=None)
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")
    available_time_sec: float = strawberry.field(name="availableTimeSec")
    demand_units: int = strawberry.field(name="demandUnits")
    takt_time_sec: float = strawberry.field(name="taktTimeSec")
    capacity_units: float = strawberry.field(name="capacityUnits")
    load_percent: float = strawberry.field(name="loadPercent")
    capacity_gap_units: float = strawberry.field(name="capacityGapUnits")
    is_bottleneck: bool = strawberry.field(name="isBottleneck")


@strawberry.type
class YamazumiStepNode:
    sequence: int
    department_name: typing.Optional[str] = strawberry.field(name="departmentName", default=None)
    resource_group_name: typing.Optional[str] = strawberry.field(name="resourceGroupName", default=None)
    resource_name: typing.Optional[str] = strawberry.field(name="resourceName", default=None)
    standard_work_name: typing.Optional[str] = strawberry.field(name="standardWorkName", default=None)
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")
    setup_time_sec: float = strawberry.field(name="setupTimeSec")
    changeover_time_sec: float = strawberry.field(name="changeoverTimeSec")
    work_content_sec: float = strawberry.field(name="workContentSec")
    takt_time_sec: float = strawberry.field(name="taktTimeSec")
    load_percent: float = strawberry.field(name="loadPercent")
    required_operators: int = strawberry.field(name="requiredOperators")
    is_bottleneck: bool = strawberry.field(name="isBottleneck")
    is_overloaded: bool = strawberry.field(name="isOverloaded")


@strawberry.type
class YamazumiAnalysisNode:
    ok: bool
    message: str
    routing_id: typing.Optional[strawberry.ID] = strawberry.field(name="routingId", default=None)
    routing_status: str = strawberry.field(name="routingStatus", default="")
    routing_version: str = strawberry.field(name="routingVersion", default="")
    production_line_id: typing.Optional[strawberry.ID] = strawberry.field(name="productionLineId", default=None)
    product_model_id: typing.Optional[strawberry.ID] = strawberry.field(name="productModelId", default=None)
    planned_quantity: int = strawberry.field(name="plannedQuantity")
    net_available_time_sec: float = strawberry.field(name="netAvailableTimeSec")
    takt_time_sec: float = strawberry.field(name="taktTimeSec")
    total_work_content_sec: float = strawberry.field(name="totalWorkContentSec")
    bottleneck_step_name: str = strawberry.field(name="bottleneckStepName", default="")
    balance_loss_percent: float = strawberry.field(name="balanceLossPercent")
    operators_required: int = strawberry.field(name="operatorsRequired")
    overloaded_resources: list[str] = strawberry.field(name="overloadedResources", default_factory=list)
    steps: list[YamazumiStepNode] = strawberry.field(default_factory=list)
    capacity_source: str = strawberry.field(name="capacitySource", default="")


@strawberry.type
class CapacityWarningNode:
    message: str


@strawberry.type
class CapacityLoadRowNode:
    level: str
    area: str
    available_capacity_minutes: float = strawberry.field(name="availableCapacityMinutes")
    required_capacity_minutes: float = strawberry.field(name="requiredCapacityMinutes")
    utilization_percent: float = strawberry.field(name="utilizationPercent")
    gap_minutes: float = strawberry.field(name="gapMinutes")
    status: str

    @classmethod
    def from_dict(cls, data: dict) -> "CapacityLoadRowNode":
        return cls(
            level=data.get("level", ""),
            area=data.get("area", ""),
            available_capacity_minutes=float(data.get("availableCapacityMinutes", 0) or 0),
            required_capacity_minutes=float(data.get("requiredCapacityMinutes", 0) or 0),
            utilization_percent=float(data.get("utilizationPercent", 0) or 0),
            gap_minutes=float(data.get("gapMinutes", 0) or 0),
            status=data.get("status", "MISSING_DATA"),
        )


@strawberry.type
class CapacityConstraintNode:
    severity: str
    source: str
    type: str
    message: str
    affected: str
    recommended_action: str = strawberry.field(name="recommendedAction")
    action: str

    @classmethod
    def from_dict(cls, data: dict) -> "CapacityConstraintNode":
        return cls(
            severity=data.get("severity", "WARNING"),
            source=data.get("source", ""),
            type=data.get("type", ""),
            message=data.get("message", ""),
            affected=data.get("affected", ""),
            recommended_action=data.get("recommendedAction", ""),
            action=data.get("action", ""),
        )


@strawberry.type
class CapacityYamazumiItemNode:
    step_id: str = strawberry.field(name="stepId")
    sequence: int
    department_name: str = strawberry.field(name="departmentName")
    resource_group_name: str = strawberry.field(name="resourceGroupName")
    resource_name: str = strawberry.field(name="resourceName")
    standard_work_name: str = strawberry.field(name="standardWorkName")
    operator: int
    cycle_time_seconds: float = strawberry.field(name="cycleTimeSeconds")
    manual_time_seconds: float = strawberry.field(name="manualTimeSeconds")
    auto_time_seconds: float = strawberry.field(name="autoTimeSeconds")
    setup_inclusive_seconds: float = strawberry.field(name="setupInclusiveSeconds")
    work_content_seconds: float = strawberry.field(name="workContentSeconds")
    takt_time_seconds: float = strawberry.field(name="taktTimeSeconds")
    load_percent: float = strawberry.field(name="loadPercent")
    is_bottleneck: bool = strawberry.field(name="isBottleneck")
    is_overloaded: bool = strawberry.field(name="isOverloaded")

    @classmethod
    def from_dict(cls, data: dict) -> "CapacityYamazumiItemNode":
        return cls(
            step_id=str(data.get("stepId", "")),
            sequence=int(data.get("sequence", 0) or 0),
            department_name=data.get("departmentName", ""),
            resource_group_name=data.get("resourceGroupName", ""),
            resource_name=data.get("resourceName", ""),
            standard_work_name=data.get("standardWorkName", ""),
            operator=int(data.get("operator", 1) or 1),
            cycle_time_seconds=float(data.get("cycleTimeSeconds", 0) or 0),
            manual_time_seconds=float(data.get("manualTimeSeconds", 0) or 0),
            auto_time_seconds=float(data.get("autoTimeSeconds", 0) or 0),
            setup_inclusive_seconds=float(data.get("setupInclusiveSeconds", 0) or 0),
            work_content_seconds=float(data.get("workContentSeconds", 0) or 0),
            takt_time_seconds=float(data.get("taktTimeSeconds", 0) or 0),
            load_percent=float(data.get("loadPercent", 0) or 0),
            is_bottleneck=bool(data.get("isBottleneck", False)),
            is_overloaded=bool(data.get("isOverloaded", False)),
        )


@strawberry.type
class CapacityYamazumiNode:
    metric: str
    takt_time_seconds: float = strawberry.field(name="taktTimeSeconds")
    balance_loss_percent: float = strawberry.field(name="balanceLossPercent")
    items: list[CapacityYamazumiItemNode]

    @classmethod
    def from_dict(cls, data: dict) -> "CapacityYamazumiNode":
        return cls(
            metric=data.get("metric", "SETUP_INCLUSIVE"),
            takt_time_seconds=float(data.get("taktTimeSeconds", 0) or 0),
            balance_loss_percent=float(data.get("balanceLossPercent", 0) or 0),
            items=[CapacityYamazumiItemNode.from_dict(item) for item in data.get("items", [])],
        )


@strawberry.type
class CapacityPlanInputNode:
    id: strawberry.ID
    capacity_plan_id: strawberry.ID = strawberry.field(name="capacityPlanId")
    planned_quantity: int = strawberry.field(name="plannedQuantity")
    available_time_minutes: float = strawberry.field(name="availableTimeMinutes")
    break_time_minutes: float = strawberry.field(name="breakTimeMinutes")
    planned_downtime_minutes: float = strawberry.field(name="plannedDowntimeMinutes")
    net_available_time_minutes: float = strawberry.field(name="netAvailableTimeMinutes")
    operators_available: int = strawberry.field(name="operatorsAvailable")
    efficiency_factor: float = strawberry.field(name="efficiencyFactor")
    takt_time_seconds: float = strawberry.field(name="taktTimeSeconds")

    @classmethod
    def from_db(cls, obj: CapacityPlanInputModel) -> "CapacityPlanInputNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            capacity_plan_id=strawberry.ID(str(obj.capacity_plan_id)),
            planned_quantity=obj.planned_quantity,
            available_time_minutes=obj.available_time_minutes,
            break_time_minutes=obj.break_time_minutes,
            planned_downtime_minutes=obj.planned_downtime_minutes,
            net_available_time_minutes=obj.net_available_time_minutes,
            operators_available=obj.operators_available,
            efficiency_factor=obj.efficiency_factor,
            takt_time_seconds=obj.takt_time_seconds,
        )


@strawberry.type
class CapacityPlanResultNode:
    id: strawberry.ID
    capacity_plan_id: strawberry.ID = strawberry.field(name="capacityPlanId")
    total_work_content_seconds: float = strawberry.field(name="totalWorkContentSeconds")
    required_capacity_minutes: float = strawberry.field(name="requiredCapacityMinutes")
    available_capacity_minutes: float = strawberry.field(name="availableCapacityMinutes")
    capacity_utilization_percent: float = strawberry.field(name="capacityUtilizationPercent")
    bottleneck_step_id: typing.Optional[strawberry.ID] = strawberry.field(name="bottleneckStepId", default=None)
    bottleneck_step_name: str = strawberry.field(name="bottleneckStepName")
    bottleneck_resource_id: typing.Optional[strawberry.ID] = strawberry.field(name="bottleneckResourceId", default=None)
    bottleneck_resource_name: str = strawberry.field(name="bottleneckResourceName")
    balance_loss_percent: float = strawberry.field(name="balanceLossPercent")
    operators_required: int = strawberry.field(name="operatorsRequired")
    feasibility_status: str = strawberry.field(name="feasibilityStatus")
    warnings: list[CapacityWarningNode]
    load_rows: list[CapacityLoadRowNode] = strawberry.field(name="loadRows")
    yamazumi: CapacityYamazumiNode
    constraints: list[CapacityConstraintNode]

    @classmethod
    def from_db(cls, obj: CapacityPlanResultModel) -> "CapacityPlanResultNode":
        bottleneck_step_name = ""
        if obj.bottleneck_step:
            bottleneck_step_name = obj.bottleneck_step.standard_work.name if obj.bottleneck_step.standard_work else f"Step {obj.bottleneck_step.sequence}"
        return cls(
            id=strawberry.ID(str(obj.id)),
            capacity_plan_id=strawberry.ID(str(obj.capacity_plan_id)),
            total_work_content_seconds=obj.total_work_content_seconds,
            required_capacity_minutes=obj.required_capacity_minutes,
            available_capacity_minutes=obj.available_capacity_minutes,
            capacity_utilization_percent=obj.capacity_utilization_percent,
            bottleneck_step_id=strawberry.ID(str(obj.bottleneck_step_id)) if obj.bottleneck_step_id else None,
            bottleneck_step_name=bottleneck_step_name,
            bottleneck_resource_id=strawberry.ID(str(obj.bottleneck_resource_id)) if obj.bottleneck_resource_id else None,
            bottleneck_resource_name=obj.bottleneck_resource.name if obj.bottleneck_resource else "",
            balance_loss_percent=obj.balance_loss_percent,
            operators_required=obj.operators_required,
            feasibility_status=obj.feasibility_status,
            warnings=[CapacityWarningNode(message=message) for message in (obj.warnings_json or [])],
            load_rows=[CapacityLoadRowNode.from_dict(row) for row in (obj.load_rows_json or [])],
            yamazumi=CapacityYamazumiNode.from_dict(obj.yamazumi_json or {}),
            constraints=[CapacityConstraintNode.from_dict(row) for row in (obj.constraints_json or [])],
        )


@strawberry.type
class CapacityScenarioNode:
    id: strawberry.ID
    capacity_plan_id: strawberry.ID = strawberry.field(name="capacityPlanId")
    name: str
    assumptions_json: strawberry.scalars.JSON = strawberry.field(name="assumptionsJson")
    result_json: strawberry.scalars.JSON = strawberry.field(name="resultJson")
    is_baseline: bool = strawberry.field(name="isBaseline")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: CapacityScenario) -> "CapacityScenarioNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            capacity_plan_id=strawberry.ID(str(obj.capacity_plan_id)),
            name=obj.name,
            assumptions_json=obj.assumptions_json,
            result_json=obj.result_json,
            is_baseline=obj.is_baseline,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class CapacityPlanNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    production_line_name: str = strawberry.field(name="productionLineName")
    product_model_id: strawberry.ID = strawberry.field(name="productModelId")
    product_model_name: str = strawberry.field(name="productModelName")
    routing_version_id: strawberry.ID = strawberry.field(name="routingVersionId")
    routing_version: str = strawberry.field(name="routingVersion")
    planning_horizon_start: str = strawberry.field(name="planningHorizonStart")
    planning_horizon_end: str = strawberry.field(name="planningHorizonEnd")
    status: str
    created_by_name: str = strawberry.field(name="createdByName")
    updated_by_name: str = strawberry.field(name="updatedByName")
    calculated_at: typing.Optional[str] = strawberry.field(name="calculatedAt", default=None)
    approved_at: typing.Optional[str] = strawberry.field(name="approvedAt", default=None)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")
    inputs: typing.Optional[CapacityPlanInputNode] = None
    result: typing.Optional[CapacityPlanResultNode] = None
    warnings: list[CapacityWarningNode] = strawberry.field(default_factory=list)
    constraints: list[CapacityConstraintNode] = strawberry.field(default_factory=list)

    @classmethod
    def from_db(cls, obj: CapacityPlan) -> "CapacityPlanNode":
        result = getattr(obj, "result", None)
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            plant_name=obj.plant.name if obj.plant else "",
            production_line_id=strawberry.ID(str(obj.production_line_id)),
            production_line_name=obj.production_line.name if obj.production_line else "",
            product_model_id=strawberry.ID(str(obj.product_model_id)),
            product_model_name=obj.product_model.name if obj.product_model else "",
            routing_version_id=strawberry.ID(str(obj.routing_version_id)),
            routing_version=obj.routing_version.version if obj.routing_version else "",
            planning_horizon_start=obj.planning_horizon_start.isoformat(),
            planning_horizon_end=obj.planning_horizon_end.isoformat(),
            status=obj.status,
            created_by_name=obj.created_by.get_full_name() or obj.created_by.username if obj.created_by else "",
            updated_by_name=obj.updated_by.get_full_name() or obj.updated_by.username if obj.updated_by else "",
            calculated_at=_iso(obj.calculated_at),
            approved_at=_iso(obj.approved_at),
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
            inputs=CapacityPlanInputNode.from_db(obj.inputs) if hasattr(obj, "inputs") else None,
            result=CapacityPlanResultNode.from_db(result) if result else None,
            warnings=[CapacityWarningNode(message=message) for message in (result.warnings_json if result else [])],
            constraints=[CapacityConstraintNode.from_dict(row) for row in (result.constraints_json if result else [])],
        )


@strawberry.input
class CapacityPlanCreateInput:
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    product_model_id: strawberry.ID = strawberry.field(name="productModelId")
    routing_version_id: strawberry.ID = strawberry.field(name="routingVersionId")
    planning_horizon_start: str = strawberry.field(name="planningHorizonStart")
    planning_horizon_end: str = strawberry.field(name="planningHorizonEnd")


@strawberry.input
class CapacityPlanInputUpdateInput:
    capacity_plan_id: strawberry.ID = strawberry.field(name="capacityPlanId")
    planned_quantity: int = strawberry.field(name="plannedQuantity")
    efficiency_factor: float = strawberry.field(name="efficiencyFactor")


@strawberry.input
class CapacityScenarioInput:
    capacity_plan_id: strawberry.ID = strawberry.field(name="capacityPlanId")
    name: str
    assumptions_json: strawberry.scalars.JSON = strawberry.field(name="assumptionsJson")


@strawberry.type
class CapacityPlanPayload:
    ok: bool
    plan: typing.Optional[CapacityPlanNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class CapacityScenarioPayload:
    ok: bool
    scenario: typing.Optional[CapacityScenarioNode] = None
    errors: typing.Optional[list[MutationError]] = None


def _ref_val(obj) -> typing.Optional["ReferenceValueNode"]:
    if obj is None:
        return None
    return ReferenceValueNode.from_db(obj)


# ── Work Schedule Types ──

@strawberry.type
class WorkScheduleNode:
    id: strawberry.ID
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    name: str
    timezone: str
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "WorkScheduleNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            scope_type=obj.scope_type,
            scope_id=obj.scope_id,
            name=obj.name,
            timezone=obj.timezone,
            effective_from=obj.effective_from.isoformat() if obj.effective_from else "",
            effective_to=obj.effective_to.isoformat() if obj.effective_to else None,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class WorkShiftNode:
    id: strawberry.ID
    schedule_id: strawberry.ID = strawberry.field(name="scheduleId")
    name: str
    weekday: int
    start_time: str = strawberry.field(name="startTime")
    end_time: str = strawberry.field(name="endTime")
    crosses_midnight: bool = strawberry.field(name="crossesMidnight")
    paid_minutes: int = strawberry.field(name="paidMinutes")
    break_minutes: int = strawberry.field(name="breakMinutes")
    net_minutes: int = strawberry.field(name="netMinutes")
    is_active: bool = strawberry.field(name="isActive")

    @classmethod
    def from_db(cls, obj) -> "WorkShiftNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            schedule_id=strawberry.ID(str(obj.schedule_id)),
            name=obj.name,
            weekday=obj.weekday,
            start_time=obj.start_time.isoformat() if obj.start_time else "",
            end_time=obj.end_time.isoformat() if obj.end_time else "",
            crosses_midnight=obj.crosses_midnight,
            paid_minutes=obj.paid_minutes,
            break_minutes=obj.break_minutes,
            net_minutes=obj.net_minutes,
            is_active=obj.is_active,
        )


@strawberry.type
class CapacityProfileNode:
    id: strawberry.ID
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    capacity_mode: str = strawberry.field(name="capacityMode")
    manual_capacity: typing.Optional[float] = strawberry.field(name="manualCapacity", default=None)
    capacity_uom: str = strawberry.field(name="capacityUom")
    efficiency_factor: float = strawberry.field(name="efficiencyFactor")
    oee_factor: typing.Optional[float] = strawberry.field(name="oeeFactor", default=None)
    takt_factor: typing.Optional[float] = strawberry.field(name="taktFactor", default=None)
    is_active: bool = strawberry.field(name="isActive")

    @classmethod
    def from_db(cls, obj) -> "CapacityProfileNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            scope_type=obj.scope_type,
            scope_id=obj.scope_id,
            capacity_mode=obj.capacity_mode,
            manual_capacity=obj.manual_capacity,
            capacity_uom=obj.capacity_uom,
            efficiency_factor=obj.efficiency_factor,
            oee_factor=obj.oee_factor,
            takt_factor=obj.takt_factor,
            is_active=obj.is_active,
        )


@strawberry.type
class CapacitySnapshotNode:
    id: strawberry.ID
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    from_datetime: str = strawberry.field(name="fromDatetime")
    to_datetime: str = strawberry.field(name="toDatetime")
    available_minutes: float = strawberry.field(name="availableMinutes")
    theoretical_capacity: float = strawberry.field(name="theoreticalCapacity")
    effective_capacity: float = strawberry.field(name="effectiveCapacity")
    bottleneck_capacity: typing.Optional[float] = strawberry.field(name="bottleneckCapacity", default=None)
    capacity_uom: str = strawberry.field(name="capacityUom")
    machine_capacity_units: float = strawberry.field(name="machineCapacityUnits")
    labor_capacity_units: float = strawberry.field(name="laborCapacityUnits")
    effective_capacity_units: float = strawberry.field(name="effectiveCapacityUnits")
    constraint_reason: str = strawberry.field(name="constraintReason")
    machine_available_minutes: float = strawberry.field(name="machineAvailableMinutes")
    labor_available_minutes: float = strawberry.field(name="laborAvailableMinutes")
    operators_required: float = strawberry.field(name="operatorsRequired")
    operators_available: float = strawberry.field(name="operatorsAvailable")
    snapshot_type: str = strawberry.field(name="snapshotType")
    status: str
    version: int
    calculated_at: str = strawberry.field(name="calculatedAt")
    missing_reasons: list[str] = strawberry.field(name="missingReasons")

    @classmethod
    def from_db(cls, obj) -> "CapacitySnapshotNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            scope_type=obj.scope_type,
            scope_id=obj.scope_id,
            from_datetime=obj.from_datetime.isoformat() if obj.from_datetime else "",
            to_datetime=obj.to_datetime.isoformat() if obj.to_datetime else "",
            available_minutes=obj.available_minutes,
            theoretical_capacity=obj.theoretical_capacity,
            effective_capacity=obj.effective_capacity,
            bottleneck_capacity=obj.bottleneck_capacity,
            capacity_uom=obj.capacity_uom,
            machine_capacity_units=obj.machine_capacity_units,
            labor_capacity_units=obj.labor_capacity_units,
            effective_capacity_units=obj.effective_capacity_units,
            constraint_reason=obj.constraint_reason,
            machine_available_minutes=obj.machine_available_minutes,
            labor_available_minutes=obj.labor_available_minutes,
            operators_required=obj.operators_required,
            operators_available=obj.operators_available,
            snapshot_type=obj.snapshot_type,
            status=obj.status,
            version=obj.version,
            calculated_at=_iso(obj.calculated_at),
            missing_reasons=obj.missing_reasons or [],
        )


@strawberry.type
class CapacityResultNode:
    snapshot: CapacitySnapshotNode
    schedule: typing.Optional[WorkScheduleNode] = None
    profile: typing.Optional[CapacityProfileNode] = None


@strawberry.type
class PaginatedCapacitySnapshotResponse:
    items: list[CapacitySnapshotNode]
    total: int
    limit: int
    offset: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class CapacityRecalculationJobNode:
    id: strawberry.ID
    trigger_type: str = strawberry.field(name="triggerType")
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    from_datetime: str = strawberry.field(name="fromDatetime")
    to_datetime: str = strawberry.field(name="toDatetime")
    status: str
    error_message: str = strawberry.field(name="errorMessage")
    created_at: str = strawberry.field(name="createdAt")
    started_at: typing.Optional[str] = strawberry.field(name="startedAt", default=None)
    completed_at: typing.Optional[str] = strawberry.field(name="completedAt", default=None)

    @classmethod
    def from_db(cls, obj) -> "CapacityRecalculationJobNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            trigger_type=obj.trigger_type,
            scope_type=obj.scope_type,
            scope_id=obj.scope_id,
            from_datetime=obj.from_datetime.isoformat() if obj.from_datetime else "",
            to_datetime=obj.to_datetime.isoformat() if obj.to_datetime else "",
            status=obj.status,
            error_message=obj.error_message,
            created_at=_iso(obj.created_at),
            started_at=_iso(obj.started_at),
            completed_at=_iso(obj.completed_at),
        )


@strawberry.type
class LaborRequirementNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    resource_group_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceGroupId", default=None)
    routing_step_id: typing.Optional[strawberry.ID] = strawberry.field(name="routingStepId", default=None)
    product_model_id: typing.Optional[strawberry.ID] = strawberry.field(name="productModelId", default=None)
    operators_required: int = strawberry.field(name="operatorsRequired")
    labor_minutes_per_unit: float = strawberry.field(name="laborMinutesPerUnit")
    skill_required_id: typing.Optional[strawberry.ID] = strawberry.field(name="skillRequiredId", default=None)
    is_active: bool = strawberry.field(name="isActive")
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "LaborRequirementNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            resource_group_id=strawberry.ID(str(obj.resource_group_id)) if obj.resource_group_id else None,
            routing_step_id=strawberry.ID(str(obj.routing_step_id)) if obj.routing_step_id else None,
            product_model_id=strawberry.ID(str(obj.product_model_id)) if obj.product_model_id else None,
            operators_required=obj.operators_required,
            labor_minutes_per_unit=obj.labor_minutes_per_unit,
            skill_required_id=strawberry.ID(str(obj.skill_required_id)) if obj.skill_required_id else None,
            is_active=obj.is_active,
            effective_from=obj.effective_from.isoformat() if obj.effective_from else "",
            effective_to=obj.effective_to.isoformat() if obj.effective_to else None,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class OperatorAssignmentNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    operator_id: strawberry.ID = strawberry.field(name="operatorId")
    resource_group_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceGroupId", default=None)
    resource_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceId", default=None)
    schedule_assignment_id: strawberry.ID = strawberry.field(name="scheduleAssignmentId")
    skill_id: typing.Optional[strawberry.ID] = strawberry.field(name="skillId", default=None)
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "OperatorAssignmentNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            operator_id=strawberry.ID(str(obj.operator_id)),
            resource_group_id=strawberry.ID(str(obj.resource_group_id)) if obj.resource_group_id else None,
            resource_id=strawberry.ID(str(obj.resource_id)) if obj.resource_id else None,
            schedule_assignment_id=strawberry.ID(str(obj.schedule_assignment_id)),
            skill_id=strawberry.ID(str(obj.skill_id)) if obj.skill_id else None,
            effective_from=obj.effective_from.isoformat() if obj.effective_from else "",
            effective_to=obj.effective_to.isoformat() if obj.effective_to else None,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


# ── Work Schedule Payloads ──

@strawberry.type
class WorkSchedulePayload:
    ok: bool
    schedule: typing.Optional[WorkScheduleNode] = None
    recalculation_job: typing.Optional[CapacityRecalculationJobNode] = strawberry.field(name="recalculationJob", default=None)
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class WorkShiftPayload:
    ok: bool
    shift: typing.Optional[WorkShiftNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class CapacityProfilePayload:
    ok: bool
    profile: typing.Optional[CapacityProfileNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class CapacityRecalculationPayload:
    ok: bool
    jobs: typing.Optional[list[CapacityRecalculationJobNode]] = None
    snapshot: typing.Optional[CapacitySnapshotNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class LaborRequirementPayload:
    ok: bool
    labor_requirement: typing.Optional[LaborRequirementNode] = strawberry.field(name="laborRequirement", default=None)
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class OperatorAssignmentPayload:
    ok: bool
    operator_assignment: typing.Optional[OperatorAssignmentNode] = strawberry.field(name="operatorAssignment", default=None)
    errors: typing.Optional[list[MutationError]] = None


# ── Work Schedule Inputs ──

@strawberry.input
class WorkScheduleInput:
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    name: str
    timezone: str = "UTC"
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)


@strawberry.input
class WorkScheduleUpdateInput:
    name: typing.Optional[str] = None
    timezone: typing.Optional[str] = None
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=None)


@strawberry.input
class WorkShiftInput:
    schedule_id: str = strawberry.field(name="scheduleId")
    name: str
    weekday: int
    start_time: str = strawberry.field(name="startTime")
    end_time: str = strawberry.field(name="endTime")
    paid_minutes: int = strawberry.field(name="paidMinutes")
    break_minutes: int = 0


@strawberry.input
class WorkShiftUpdateInput:
    name: typing.Optional[str] = None
    weekday: typing.Optional[int] = None
    start_time: typing.Optional[str] = strawberry.field(name="startTime", default=None)
    end_time: typing.Optional[str] = strawberry.field(name="endTime", default=None)
    paid_minutes: typing.Optional[int] = strawberry.field(name="paidMinutes", default=None)
    break_minutes: typing.Optional[int] = None


@strawberry.input
class CapacityProfileInput:
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    capacity_mode: typing.Optional[str] = strawberry.field(name="capacityMode", default="INHERITED")
    manual_capacity: typing.Optional[float] = strawberry.field(name="manualCapacity", default=None)
    capacity_uom: typing.Optional[str] = strawberry.field(name="capacityUom", default="")
    efficiency_factor: typing.Optional[float] = strawberry.field(name="efficiencyFactor", default=1.0)
    oee_factor: typing.Optional[float] = strawberry.field(name="oeeFactor", default=None)
    takt_factor: typing.Optional[float] = strawberry.field(name="taktFactor", default=None)


@strawberry.input
class CapacityProfileUpdateInput:
    capacity_mode: typing.Optional[str] = strawberry.field(name="capacityMode", default=None)
    manual_capacity: typing.Optional[float] = strawberry.field(name="manualCapacity", default=None)
    capacity_uom: typing.Optional[str] = strawberry.field(name="capacityUom", default=None)
    efficiency_factor: typing.Optional[float] = strawberry.field(name="efficiencyFactor", default=None)
    oee_factor: typing.Optional[float] = strawberry.field(name="oeeFactor", default=None)
    takt_factor: typing.Optional[float] = strawberry.field(name="taktFactor", default=None)


@strawberry.input
class CapacityRecalculationInput:
    scope_type: str = strawberry.field(name="scopeType")
    scope_id: str = strawberry.field(name="scopeId")
    from_datetime: str = strawberry.field(name="fromDatetime")
    to_datetime: str = strawberry.field(name="toDatetime")
    trigger_type: typing.Optional[str] = strawberry.field(name="triggerType", default="SCHEDULE_CHANGED")


@strawberry.input
class LaborRequirementInput:
    plant_id: str = strawberry.field(name="plantId")
    resource_group_id: typing.Optional[str] = strawberry.field(name="resourceGroupId", default=None)
    routing_step_id: typing.Optional[str] = strawberry.field(name="routingStepId", default=None)
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId", default=None)
    operators_required: int = strawberry.field(name="operatorsRequired")
    labor_minutes_per_unit: float = strawberry.field(name="laborMinutesPerUnit")
    skill_required_id: typing.Optional[str] = strawberry.field(name="skillRequiredId", default=None)
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)


@strawberry.input
class LaborRequirementUpdateInput:
    operators_required: typing.Optional[int] = strawberry.field(name="operatorsRequired", default=None)
    labor_minutes_per_unit: typing.Optional[float] = strawberry.field(name="laborMinutesPerUnit", default=None)
    skill_required_id: typing.Optional[str] = strawberry.field(name="skillRequiredId", default=None)
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=None)


@strawberry.input
class OperatorAssignmentInput:
    plant_id: str = strawberry.field(name="plantId")
    operator_id: str = strawberry.field(name="operatorId")
    resource_group_id: typing.Optional[str] = strawberry.field(name="resourceGroupId", default=None)
    resource_id: typing.Optional[str] = strawberry.field(name="resourceId", default=None)
    schedule_assignment_id: str = strawberry.field(name="scheduleAssignmentId")
    skill_id: typing.Optional[str] = strawberry.field(name="skillId", default=None)
    effective_from: str = strawberry.field(name="effectiveFrom")
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)


@strawberry.input
class OperatorAssignmentUpdateInput:
    skill_id: typing.Optional[str] = strawberry.field(name="skillId", default=None)
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=None)


# ── Document / Standard Framework Types ──


@strawberry.type
class StructureDocumentNode:
    id: strawberry.ID
    document_type: str = strawberry.field(name="documentType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    title: str
    code: str
    content: str
    revision: str
    status: str
    owner: str
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    review_date: typing.Optional[str] = strawberry.field(name="reviewDate", default=None)
    change_reason: str = strawberry.field(name="changeReason", default="")
    is_controlled_copy: bool = strawberry.field(name="isControlledCopy", default=True)
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, doc) -> "StructureDocumentNode":
        return cls(
            id=strawberry.ID(str(doc.id)),
            document_type=doc.document_type,
            target_type=doc.target_type,
            target_id=doc.target_id,
            title=doc.title,
            code=doc.code,
            content=doc.content,
            revision=doc.revision,
            status=doc.status,
            owner=doc.owner,
            effective_from=doc.effective_from.isoformat() if doc.effective_from else None,
            effective_to=doc.effective_to.isoformat() if doc.effective_to else None,
            review_date=doc.review_date.isoformat() if doc.review_date else None,
            change_reason=doc.change_reason or "",
            is_controlled_copy=doc.is_controlled_copy,
            is_active=doc.is_active,
            created_at=doc.created_at.isoformat() if doc.created_at else "",
            updated_at=doc.updated_at.isoformat() if doc.updated_at else "",
        )


@strawberry.type
class StructureDocumentTreeNode:
    id: str
    node_type: str = strawberry.field(name="nodeType")
    name: str
    parent_id: typing.Optional[str] = strawberry.field(name="parentId", default=None)
    children: list["StructureDocumentTreeNode"] = strawberry.field(default_factory=list)
    document_status: str = strawberry.field(name="documentStatus")
    local_document_id: typing.Optional[str] = strawberry.field(name="localDocumentId", default=None)
    inherited_document_id: typing.Optional[str] = strawberry.field(name="inheritedDocumentId", default=None)

    @classmethod
    def from_dict(cls, data: dict) -> "StructureDocumentTreeNode":
        return cls(
            id=data["id"],
            node_type=data["nodeType"],
            name=data["name"],
            parent_id=data.get("parentId"),
            children=[cls.from_dict(c) for c in data.get("children", [])],
            document_status=data["documentStatus"],
            local_document_id=data.get("localDocumentId"),
            inherited_document_id=data.get("inheritedDocumentId"),
        )


@strawberry.type
class StructureDocumentPayload:
    ok: bool
    document: typing.Optional[StructureDocumentNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.input
class StructureDocumentInput:
    document_type: str = strawberry.field(name="documentType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    title: str
    code: str
    content: typing.Optional[str] = ""
    revision: typing.Optional[str] = "1.0"
    owner: typing.Optional[str] = ""
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)


@strawberry.input
class StructureDocumentUpdateInput:
    title: typing.Optional[str] = None
    content: typing.Optional[str] = None
    revision: typing.Optional[str] = None
    owner: typing.Optional[str] = None
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)


# ── Document Control Types ──


@strawberry.type
class DocumentRevisionHistoryNode:
    id: strawberry.ID
    document_id: str = strawberry.field(name="documentId")
    document_type: str = strawberry.field(name="documentType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    code: str
    title: str
    revision: str
    status_from: typing.Optional[str] = strawberry.field(name="statusFrom", default=None)
    status_to: str = strawberry.field(name="statusTo")
    content_snapshot: str = strawberry.field(name="contentSnapshot")
    change_reason: str = strawberry.field(name="changeReason")
    changed_by: str = strawberry.field(name="changedBy")
    lifecycle_action: str = strawberry.field(name="lifecycleAction")
    changed_at: str = strawberry.field(name="changedAt")

    @classmethod
    def from_db(cls, h) -> "DocumentRevisionHistoryNode":
        return cls(
            id=strawberry.ID(str(h.id)),
            document_id=str(h.document_id),
            document_type=h.document_type,
            target_type=h.target_type,
            target_id=h.target_id,
            code=h.code,
            title=h.title,
            revision=h.revision,
            status_from=h.status_from,
            status_to=h.status_to,
            content_snapshot=h.content_snapshot,
            change_reason=h.change_reason,
            changed_by=h.changed_by,
            lifecycle_action=h.lifecycle_action,
            changed_at=h.changed_at.isoformat() if h.changed_at else "",
        )


@strawberry.type
class DocumentAuditTrailNode:
    id: strawberry.ID
    document_id: str = strawberry.field(name="documentId")
    action: str
    actor: str
    occurred_at: str = strawberry.field(name="occurredAt")
    metadata: str = strawberry.field(name="metadata")
    reason: str

    @classmethod
    def from_db(cls, a) -> "DocumentAuditTrailNode":
        import json
        return cls(
            id=strawberry.ID(str(a.id)),
            document_id=str(a.document_id),
            action=a.action,
            actor=a.actor,
            occurred_at=a.occurred_at.isoformat() if a.occurred_at else "",
            metadata=json.dumps(a.metadata),
            reason=a.reason,
        )


@strawberry.input
class CreateRevisionInput:
    document_id: str = strawberry.field(name="documentId")
    new_revision: str = strawberry.field(name="newRevision")
    change_reason: typing.Optional[str] = strawberry.field(name="changeReason", default="")


@strawberry.input
class ArchiveDocumentInput:
    document_id: str = strawberry.field(name="documentId")
    reason: str = ""


@strawberry.input
class ControlledCopyInput:
    document_id: str = strawberry.field(name="documentId")
    is_controlled_copy: bool = strawberry.field(name="isControlledCopy")
    reason: typing.Optional[str] = ""


@strawberry.type
class DocumentControlPayload:
    ok: bool
    document: typing.Optional[StructureDocumentNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class AuditTrailPayload:
    ok: bool
    entries: list[DocumentAuditTrailNode] = strawberry.field(default_factory=list)
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class RevisionHistoryPayload:
    ok: bool
    entries: list[DocumentRevisionHistoryNode] = strawberry.field(default_factory=list)
    errors: list[MutationError] = strawberry.field(default_factory=list)


# ── Audit Template Types ──


@strawberry.type
class AuditTemplateQuestionNode:
    id: strawberry.ID
    category_id: strawberry.ID = strawberry.field(name="categoryId")
    code: str
    question: str
    response_type: str = strawberry.field(name="responseType", default="SCORE_1_5")
    is_required: bool = strawberry.field(name="isRequired", default=True)
    weight: int = 1
    sequence: int
    help_text: str = strawberry.field(name="helpText", default="")
    max_score: int = strawberry.field(name="maxScore")
    allow_na: bool = strawberry.field(name="allowNa")
    is_active: bool = strawberry.field(name="isActive")

    @classmethod
    def from_db(cls, obj) -> "AuditTemplateQuestionNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            category_id=strawberry.ID(str(obj.category_id)),
            code=obj.code,
            question=obj.question,
            response_type=obj.response_type,
            is_required=obj.is_required,
            weight=obj.weight,
            sequence=obj.sequence,
            help_text=obj.help_text or "",
            max_score=obj.max_score,
            allow_na=obj.allow_na,
            is_active=obj.is_active,
        )


@strawberry.type
class AuditTemplateCategoryNode:
    id: strawberry.ID
    template_id: strawberry.ID = strawberry.field(name="templateId")
    code: str
    name: str
    sequence: int
    is_required: bool = strawberry.field(name="isRequired")
    questions: list[AuditTemplateQuestionNode] = strawberry.field(default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj, questions: typing.Optional[list] = None) -> "AuditTemplateCategoryNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            template_id=strawberry.ID(str(obj.template_id)),
            code=obj.code,
            name=obj.name,
            sequence=obj.sequence,
            is_required=obj.is_required,
            questions=[AuditTemplateQuestionNode.from_db(q) for q in (questions or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class AuditTemplateNode:
    id: strawberry.ID
    code: str
    name: str
    audit_type: str = strawberry.field(name="auditType")
    module_scope: str = strawberry.field(name="moduleScope", default="PRODUCTION_CONTROL")
    target_types: list[str] = strawberry.field(name="targetTypes", default_factory=list)
    version: int
    status: str = "ACTIVE"
    is_default: bool = strawberry.field(name="isDefault", default=False)
    is_active: bool = strawberry.field(name="isActive")
    categories: list[AuditTemplateCategoryNode] = strawberry.field(default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj, categories: typing.Optional[list] = None) -> "AuditTemplateNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            code=obj.code,
            name=obj.name,
            audit_type=obj.audit_type,
            module_scope=obj.module_scope or "PRODUCTION_CONTROL",
            target_types=obj.target_types or [],
            version=obj.version,
            status=obj.status or "ACTIVE",
            is_default=obj.is_default,
            is_active=obj.status == "ACTIVE",
            categories=[AuditTemplateCategoryNode.from_db(c, list(c.questions.all())) for c in (categories or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.input
class CreateAuditFromTemplateInput:
    template_id: int = strawberry.field(name="templateId")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    title: str
    auditor: typing.Optional[str] = ""
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    notes: typing.Optional[str] = ""
    control_area: typing.Optional[str] = strawberry.field(name="controlArea", default="PRODUCTION")


# ── Audit Types ──


@strawberry.type
class AuditChecklistItemNode:
    id: strawberry.ID
    audit_id: strawberry.ID = strawberry.field(name="auditId")
    question: str
    score: typing.Optional[int] = None
    is_na: bool = strawberry.field(name="isNa")
    result: typing.Optional[str] = None
    comment: str = ""
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "AuditChecklistItemNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            audit_id=strawberry.ID(str(obj.audit_id)),
            question=obj.question,
            score=obj.score,
            is_na=obj.is_na,
            result=obj.result,
            comment=obj.comment or "",
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class AuditFindingNode:
    id: strawberry.ID
    audit_id: strawberry.ID = strawberry.field(name="auditId")
    description: str
    severity: str
    status: str
    owner: str = ""
    due_date: typing.Optional[str] = strawberry.field(name="dueDate", default=None)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "AuditFindingNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            audit_id=strawberry.ID(str(obj.audit_id)),
            description=obj.description,
            severity=obj.severity,
            status=obj.status,
            owner=obj.owner or "",
            due_date=obj.due_date.isoformat() if obj.due_date else None,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class AuditAnswerNode:
    id: strawberry.ID
    audit_id: strawberry.ID = strawberry.field(name="auditId")
    question_id: strawberry.ID = strawberry.field(name="questionId")
    answer_value: str = strawberry.field(name="answerValue", default="")
    comment: str = ""
    evidence_url: str = strawberry.field(name="evidenceUrl", default="")
    finding_required: bool = strawberry.field(name="findingRequired", default=False)
    question: typing.Optional[AuditTemplateQuestionNode] = None
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj, question: typing.Optional[object] = None) -> "AuditAnswerNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            audit_id=strawberry.ID(str(obj.audit_id)),
            question_id=strawberry.ID(str(obj.template_question_id)),
            answer_value=obj.answer_value or "",
            comment=obj.comment or "",
            evidence_url=obj.evidence_url or "",
            finding_required=obj.finding_required,
            question=AuditTemplateQuestionNode.from_db(question or obj.template_question) if (question or obj.template_question_id) else None,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.input
class SaveAuditAnswerInput:
    audit_id: int = strawberry.field(name="auditId")
    question_id: int = strawberry.field(name="questionId")
    answer_value: str = strawberry.field(name="answerValue", default="")
    comment: str = ""
    evidence_url: typing.Optional[str] = strawberry.field(name="evidenceUrl", default=None)


@strawberry.input
class BulkSaveAuditAnswerItem:
    question_id: int = strawberry.field(name="questionId")
    answer_value: str = strawberry.field(name="answerValue", default="")
    comment: str = ""


@strawberry.input
class SaveAuditAnswersBulkInput:
    audit_id: int = strawberry.field(name="auditId")
    answers: list[BulkSaveAuditAnswerItem]


@strawberry.type
class SaveAuditAnswersBulkPayload:
    ok: bool
    audit: typing.Optional["AuditNode"] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.input
class CreateAuditFindingFromAnswerInput:
    audit_id: int = strawberry.field(name="auditId")
    answer_id: int = strawberry.field(name="answerId")
    description: str
    severity: str = "MEDIUM"
    owner: str = ""
    due_date: typing.Optional[str] = strawberry.field(name="dueDate", default=None)


@strawberry.type
class AuditNode:
    id: strawberry.ID
    control_area: str = strawberry.field(name="controlArea")
    audit_type: str = strawberry.field(name="auditType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    title: str
    auditor: str = ""
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    status: str
    score: typing.Optional[float] = None
    notes: str = ""
    template_id: typing.Optional[strawberry.ID] = strawberry.field(name="templateId", default=None)
    checklist_items: list[AuditChecklistItemNode] = strawberry.field(name="checklistItems", default_factory=list)
    findings: list[AuditFindingNode] = strawberry.field(default_factory=list)
    answers: list[AuditAnswerNode] = strawberry.field(default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj, checklist: typing.Optional[list] = None, findings: typing.Optional[list] = None, answers: typing.Optional[list] = None) -> "AuditNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            control_area=obj.control_area,
            audit_type=obj.audit_type,
            target_type=obj.target_type,
            target_id=obj.target_id,
            title=obj.title,
            auditor=obj.auditor or "",
            audit_date=obj.audit_date.isoformat() if obj.audit_date else None,
            status=obj.status,
            score=obj.score,
            notes=obj.notes or "",
            template_id=strawberry.ID(str(obj.template_id)) if obj.template_id else None,
            checklist_items=[AuditChecklistItemNode.from_db(i) for i in (checklist or [])],
            findings=[AuditFindingNode.from_db(f) for f in (findings or [])],
            answers=[AuditAnswerNode.from_db(a) for a in (answers or [])],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class AuditPayload:
    ok: bool
    audit: typing.Optional[AuditNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)




@strawberry.type
class AuditChecklistItemPayload:
    ok: bool
    item: typing.Optional[AuditChecklistItemNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class AuditFindingPayload:
    ok: bool
    finding: typing.Optional[AuditFindingNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.input
class AuditInput:
    control_area: str = strawberry.field(name="controlArea", default="PRODUCTION")
    audit_type: str = strawberry.field(name="auditType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    title: str
    auditor: typing.Optional[str] = ""
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    notes: typing.Optional[str] = ""


@strawberry.input
class AuditUpdateInput:
    title: typing.Optional[str] = None
    auditor: typing.Optional[str] = None
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    notes: typing.Optional[str] = None
    status: typing.Optional[str] = None


@strawberry.input
class AuditChecklistItemInput:
    question: str
    score: typing.Optional[int] = None
    is_na: typing.Optional[bool] = strawberry.field(name="isNa", default=False)
    result: typing.Optional[str] = None
    comment: typing.Optional[str] = ""


@strawberry.input
class AuditChecklistItemUpdateInput:
    question: typing.Optional[str] = None
    score: typing.Optional[int] = None
    is_na: typing.Optional[bool] = strawberry.field(name="isNa", default=None)
    result: typing.Optional[str] = None
    comment: typing.Optional[str] = None


@strawberry.input
class AuditFindingInput:
    description: str
    severity: str
    owner: typing.Optional[str] = ""
    due_date: typing.Optional[str] = strawberry.field(name="dueDate", default=None)


@strawberry.input
class AuditFindingUpdateInput:
    description: typing.Optional[str] = None
    severity: typing.Optional[str] = None
    status: typing.Optional[str] = None
    owner: typing.Optional[str] = None
    due_date: typing.Optional[str] = strawberry.field(name="dueDate", default=None)



# --- Audit Template CRUD Inputs ---

@strawberry.input
class AuditTemplateCreateInput:
    code: str
    name: str
    audit_type: str = strawberry.field(name="auditType")
    module_scope: typing.Optional[str] = strawberry.field(name="moduleScope", default="PRODUCTION_CONTROL")
    target_types: typing.Optional[list[str]] = strawberry.field(name="targetTypes", default=None)

@strawberry.input
class AuditTemplateUpdateInput:
    name: typing.Optional[str] = None
    module_scope: typing.Optional[str] = strawberry.field(name="moduleScope", default=None)
    target_types: typing.Optional[list[str]] = strawberry.field(name="targetTypes", default=None)

@strawberry.input
class AuditTemplateCategoryInput:
    code: str
    name: str
    sequence: typing.Optional[int] = 0
    is_required: typing.Optional[bool] = strawberry.field(name="isRequired", default=True)

@strawberry.input
class AuditTemplateCategoryUpdateInput:
    code: typing.Optional[str] = None
    name: typing.Optional[str] = None
    sequence: typing.Optional[int] = None
    is_required: typing.Optional[bool] = strawberry.field(name="isRequired", default=None)

@strawberry.input
class AuditTemplateQuestionInput:
    code: str
    question: str
    response_type: typing.Optional[str] = strawberry.field(name="responseType", default="PASS_FAIL_NA")
    is_required: typing.Optional[bool] = strawberry.field(name="isRequired", default=True)
    weight: typing.Optional[int] = 1
    sequence: typing.Optional[int] = 0
    help_text: typing.Optional[str] = strawberry.field(name="helpText", default="")

@strawberry.input
class AuditTemplateQuestionUpdateInput:
    code: typing.Optional[str] = None
    question: typing.Optional[str] = None
    response_type: typing.Optional[str] = strawberry.field(name="responseType", default=None)
    is_required: typing.Optional[bool] = strawberry.field(name="isRequired", default=None)
    weight: typing.Optional[int] = None
    sequence: typing.Optional[int] = None
    help_text: typing.Optional[str] = strawberry.field(name="helpText", default=None)

@strawberry.type
class AuditAnswerPayload:
    ok: bool
    answer: typing.Optional[AuditAnswerNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class AuditInstallTemplatesPayload:
    ok: bool
    message: str = ""
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class AuditTemplatePayload:
    ok: bool
    template: typing.Optional[AuditTemplateNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


# ── Audit Execution Form Types ──

@strawberry.type
class AuditExecutionQuestion:
    id: strawberry.ID
    question_text: str = strawberry.field(name="questionText")
    response_type: str = strawberry.field(name="responseType")
    is_required: bool = strawberry.field(name="isRequired")
    help_text: str = strawberry.field(name="helpText", default="")
    sequence: int
    weight: int = 1
    answer_id: typing.Optional[strawberry.ID] = strawberry.field(name="answerId", default=None)
    answer_value: str = strawberry.field(name="answerValue", default="")
    comment: str = ""
    evidence_url: str = strawberry.field(name="evidenceUrl", default="")
    is_nonconforming: bool = strawberry.field(name="isNonconforming", default=False)
    finding_required: bool = strawberry.field(name="findingRequired", default=False)


@strawberry.type
class AuditExecutionSection:
    id: strawberry.ID
    title: str
    sequence: int
    questions: list[AuditExecutionQuestion]


@strawberry.type
class AuditTemplateInfo:
    id: strawberry.ID
    code: str
    name: str
    version: int


@strawberry.type
class AuditExecutionSummary:
    answered_count: int = strawberry.field(name="answeredCount")
    total_questions: int = strawberry.field(name="totalQuestions")
    required_missing_count: int = strawberry.field(name="requiredMissingCount")
    findings_count: int = strawberry.field(name="findingsCount")
    last_saved_at: typing.Optional[str] = strawberry.field(name="lastSavedAt", default=None)
    score: typing.Optional[float] = None


@strawberry.type
class AuditExecutionForm:
    id: strawberry.ID
    title: str
    status: str
    score: typing.Optional[float] = None
    auditor: str = ""
    audit_date: typing.Optional[str] = strawberry.field(name="auditDate", default=None)
    notes: str = ""
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    target_display_name: str = strawberry.field(name="targetDisplayName", default="")
    template: AuditTemplateInfo
    sections: list[AuditExecutionSection]
    findings: list[AuditFindingNode]
    summary: AuditExecutionSummary
