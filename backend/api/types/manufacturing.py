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
)

# ── Shared interfaces ──

@strawberry.type
class MutationError:
    field: typing.Optional[str]
    code: str
    message: str


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
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
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
    is_constraint: bool = strawberry.field(name="isConstraint")
    line_count: typing.Optional[int] = strawberry.field(name="lineCount", default=0)
    department_count: typing.Optional[int] = strawberry.field(name="departmentCount", default=0)
    group_count: typing.Optional[int] = strawberry.field(name="groupCount", default=0)
    resource_count: typing.Optional[int] = strawberry.field(name="resourceCount", default=0)
    department_links: list[ProductionLineDepartmentLinkNode] = strawberry.field(name="departmentLinks", default_factory=list)
    models_produced: typing.Optional[list[str]] = strawberry.field(name="modelsProduced", default_factory=list)
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
            is_constraint=obj.is_constraint,
            line_count=1,
            department_count=len(department_links),
            group_count=group_count,
            resource_count=resource_count,
            department_links=department_links,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── ProductionLineDepartmentAssignment ──

@strawberry.type
class ProductionLineDepartmentAssignmentNode:
    id: strawberry.ID
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
class ResourceGroupNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    status_id: typing.Optional[str] = strawberry.field(name="statusId", default=None)
    status_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="statusRef", default=None)
    department_id: typing.Optional[str] = strawberry.field(name="departmentId")
    department_name: str = strawberry.field(name="departmentName")
    members: int
    leader: str
    group_type_id: typing.Optional[str] = strawberry.field(name="groupTypeId", default=None)
    group_type_ref: typing.Optional["ReferenceValueNode"] = strawberry.field(name="groupTypeRef", default=None)
    resource_count: typing.Optional[int] = strawberry.field(name="resourceCount", default=0)
    resource_type: typing.Optional[str] = strawberry.field(name="resourceType", default="")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ResourceGroup) -> "ResourceGroupNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            status_id=str(obj.status_id_id) if obj.status_id_id else None,
            status_ref=_ref_val(obj.status_id) if obj.status_id_id else None,
            department_id=str(obj.department_id) if obj.department_id else None,
            department_name=obj.department.name if obj.department else "",
            members=obj.members, leader=obj.leader,
            group_type_id=str(obj.group_type_id_id) if obj.group_type_id_id else None,
            group_type_ref=_ref_val(obj.group_type_id) if obj.group_type_id_id else None,
            resource_count=0,
            resource_type="",
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
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
    entity_type: str = strawberry.field(name="entityType")
    entity_id: str = strawberry.field(name="entityId")
    schedule_id: strawberry.ID = strawberry.field(name="scheduleId")
    inheritance_mode: str = strawberry.field(name="inheritanceMode")
    valid_from: typing.Optional[str] = strawberry.field(name="validFrom")
    valid_to: typing.Optional[str] = strawberry.field(name="validTo")
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ScheduleAssignment) -> "ScheduleAssignmentNode":
        return cls(
            id=strawberry.ID(str(obj.id)), entity_type=obj.entity_type,
            entity_id=obj.entity_id, schedule_id=strawberry.ID(str(obj.schedule_id)),
            inheritance_mode=obj.inheritance_mode,
            valid_from=obj.valid_from.isoformat() if obj.valid_from else None,
            valid_to=obj.valid_to.isoformat() if obj.valid_to else None,
            status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── Reference Data & Response Types ──

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
    sort_order: int = strawberry.field(name="sortOrder")
    is_active: bool = strawberry.field(name="isActive")
    metadata: typing.Optional[str] = None
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ReferenceValue) -> "ReferenceValueNode":
        return cls(
            id=strawberry.ID(str(obj.id)), category_id=strawberry.ID(str(obj.category_id)),
            code=obj.code, name=obj.name, description=obj.description,
            sort_order=obj.sort_order, is_active=obj.is_active,
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
class ProductModelNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProductModel) -> "ProductModelNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ProcessFlowNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId")
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
    child_count: int = strawberry.field(name="childCount")
    children: list["StructureChildNode"] = strawberry.field(name="children")
    schedule_status: str = strawberry.field(name="scheduleStatus")

    @classmethod
    def from_tree(cls, node: dict) -> "StructureChildNode":
        return cls(
            id=strawberry.ID(str(node["id"])), type=node["type"],
            name=node["name"], code=node["code"], status=node["status"],
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
class AssignmentPayload:
    ok: bool
    assignment: typing.Optional[ProductionLineDepartmentAssignmentNode] = None
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


# ── Mutation inputs ──

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
    group_type_id: typing.Optional[str] = strawberry.field(name="groupTypeId", default=None)

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
    schedule_id: strawberry.ID = strawberry.field(name="scheduleId")
    inheritance_mode: typing.Optional[str] = strawberry.field(name="inheritanceMode", default="NONE")
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


@strawberry.input
class RoutingInput:
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    product_family_id: typing.Optional[str] = strawberry.field(name="productFamilyId", default=None)
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId", default=None)
    version: typing.Optional[str] = "1.0"
    status: typing.Optional[str] = "DRAFT"
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    notes: typing.Optional[str] = ""


@strawberry.input
class RoutingStepInput:
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


def _ref_val(obj) -> typing.Optional["ReferenceValueNode"]:
    if obj is None:
        return None
    return ReferenceValueNode.from_db(obj)
