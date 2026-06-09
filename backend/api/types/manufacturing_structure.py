"""Manufacturing structure GraphQL types - Company, Plant, Department, ResourceGroup, Resource, ProductionLine, Profile, Reference values."""

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

from api.common.errors import MutationError

# ── Inputs ──
from api.inputs.users_roles import WorkHistoryInput, EducationInput, ProfileInput
from api.inputs.manufacturing import (
    CompanyInput, PlantInput, ProductionLineInput,
    DepartmentInput, ResourceGroupInput, ResourceInput,
    AssignDepartmentInput, AssignDepartmentToLinesInput,
)
from api.common.pagination import PaginationInput

# ── Import forward-referenced types from domain modules ──
# These are used as string forward references (e.g. "ProductFamilyAssignmentNode")
# that Strawberry needs to resolve at schema build time.
from api.types.product_master import (  # noqa: F401
    ProductFamilyAssignmentNode, ProductModelAssignmentNode,
)
from api.types.planning import CapacitySnapshotNode  # noqa: F401

# ── Types ──

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


# ── Payloads ──

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
class ProductionLineAssignmentPayload:
    ok: bool
    production_line: typing.Optional[ProductionLineNode] = strawberry.field(name="productionLine", default=None)
    assigned_resource_groups: typing.Optional[list[AssignedResourceGroupNode]] = strawberry.field(name="assignedResourceGroups", default=None)
    errors: list[MutationError] = strawberry.field(default_factory=list)

# ── Paginated response types ──

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

# ── Unused pagination inputs (kept for backward compat) ──

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
class ReferenceListInput:
    limit: typing.Optional[int] = 50
    offset: typing.Optional[int] = 0


def _iso(dt: typing.Optional[datetime]) -> str:
    return dt.isoformat() if dt else ""

def _ref_val(obj) -> typing.Optional["ReferenceValueNode"]:
    if obj is None:
        return None
    return ReferenceValueNode.from_db(obj)
