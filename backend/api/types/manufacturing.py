import strawberry
import typing
from datetime import datetime

from manufacturing.models import (
    Plant, Department, ProductionLine, ResourceGroup, Resource,
    ProductionLineDepartmentAssignment, Company,
    Schedule, Shift, ScheduleAssignment,
    ReferenceCategory, ReferenceValue, ResourceType, VisualIdentity,
    ProductModel, ProcessFlow, ProcessStep,
)

# ── Shared interfaces ──

@strawberry.type
class MutationError:
    field: typing.Optional[str]
    code: str
    message: str


# ── Company ──

@strawberry.type
class CompanyNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    address: str
    phone: str
    email: str
    website: str
    default_timezone: str = strawberry.field(name="defaultTimezone")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Company) -> "CompanyNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            address=obj.address, phone=obj.phone, email=obj.email,
            website=obj.website, default_timezone=obj.default_timezone,
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
    building: str
    address: str
    timezone: str
    manager_name: str = strawberry.field(name="managerName")
    manager_email: str = strawberry.field(name="managerEmail")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Plant) -> "PlantNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            building=obj.building, address=obj.address, timezone=obj.timezone,
            manager_name=obj.manager_name, manager_email=obj.manager_email,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── ProductionLine ──

@strawberry.type
class ProductionLineNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")
    shift_pattern: str = strawberry.field(name="shiftPattern")
    is_constraint: bool = strawberry.field(name="isConstraint")
    line_count: typing.Optional[int] = strawberry.field(name="lineCount", default=0)
    models_produced: typing.Optional[list[str]] = strawberry.field(name="modelsProduced", default_factory=list)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProductionLine) -> "ProductionLineNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            plant_id=strawberry.ID(str(obj.plant_id)),
            plant_name=obj.plant.name if obj.plant else "",
            shift_pattern=obj.shift_pattern, is_constraint=obj.is_constraint,
            line_count=1,
            models_produced=[],
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
class DepartmentNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    manager: str
    employees: int
    group_count: typing.Optional[int] = strawberry.field(name="groupCount", default=0)
    group_name: typing.Optional[str] = strawberry.field(name="groupName", default="")
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Department) -> "DepartmentNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            manager=obj.manager, employees=obj.employees,
            group_count=0,
            group_name="",
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
    department_id: typing.Optional[str] = strawberry.field(name="departmentId")
    department_name: str = strawberry.field(name="departmentName")
    members: int
    leader: str
    resource_count: typing.Optional[int] = strawberry.field(name="resourceCount", default=0)
    resource_type: typing.Optional[str] = strawberry.field(name="resourceType", default="")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ResourceGroup) -> "ResourceGroupNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            department_id=str(obj.department_id) if obj.department_id else None,
            department_name=obj.department.name if obj.department else "",
            members=obj.members, leader=obj.leader,
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
    resource_group_id: strawberry.ID = strawberry.field(name="resourceGroupId")
    resource_group_name: str = strawberry.field(name="resourceGroupName")
    utilization: typing.Optional[float] = strawberry.field(default=0.0)
    op_status: typing.Optional[str] = strawberry.field(name="opStatus", default="Idle")
    last_activity: typing.Optional[str] = strawberry.field(name="lastActivity", default=None)
    shift_pattern: typing.Optional[str] = strawberry.field(name="shiftPattern", default="")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Resource) -> "ResourceNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            resource_group_id=strawberry.ID(str(obj.resource_group_id)),
            resource_group_name=obj.resource_group.name if obj.resource_group else "",
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
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ReferenceValue) -> "ReferenceValueNode":
        return cls(
            id=strawberry.ID(str(obj.id)), category_id=strawberry.ID(str(obj.category_id)),
            code=obj.code, name=obj.name, description=obj.description,
            sort_order=obj.sort_order, is_active=obj.is_active,
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
class PlantInput:
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    building: typing.Optional[str] = ""
    address: typing.Optional[str] = ""
    timezone: typing.Optional[str] = ""
    manager_name: typing.Optional[str] = strawberry.field(name="managerName", default="")
    manager_email: typing.Optional[str] = strawberry.field(name="managerEmail", default="")

@strawberry.input
class ProductionLineInput:
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    shift_pattern: typing.Optional[str] = strawberry.field(name="shiftPattern", default="")
    is_constraint: typing.Optional[bool] = strawberry.field(name="isConstraint", default=False)

@strawberry.input
class DepartmentInput:
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    manager: typing.Optional[str] = ""
    employees: typing.Optional[int] = 0

@strawberry.input
class ResourceGroupInput:
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    code: typing.Optional[str] = ""
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    members: typing.Optional[int] = 0
    leader: typing.Optional[str] = ""

@strawberry.input
class ResourceInput:
    resource_group_id: strawberry.ID = strawberry.field(name="resourceGroupId")
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"

@strawberry.input
class AssignDepartmentInput:
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    department_id: strawberry.ID = strawberry.field(name="departmentId")
    sequence: typing.Optional[int] = 0
    status: typing.Optional[str] = "ACTIVE"

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
