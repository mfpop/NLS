import strawberry
import typing

from manufacturing.models import (
    Plant, Department, ProductionLine,
    ResourceGroup, Resource, ReferenceTable, Profile, Company,
)


# ── Plant ──

@strawberry.type
class PlantNode:
    id: strawberry.ID
    code: str
    name: str
    status: str
    building: str
    address: str
    timezone: str
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId")
    default_schedule_id: typing.Optional[str] = strawberry.field(name="defaultScheduleId")
    manager_name: str = strawberry.field(name="managerName")
    manager_email: str = strawberry.field(name="managerEmail")
    description: str
    line_count: int = strawberry.field(name="lineCount")
    department_count: int = strawberry.field(name="departmentCount")
    group_count: int = strawberry.field(name="groupCount")
    resource_count: int = strawberry.field(name="resourceCount")
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, plant: Plant) -> "PlantNode":
        return cls(
            id=strawberry.ID(str(plant.id)),
            code=plant.code,
            name=plant.name,
            status=plant.status,
            building=plant.building,
            address=plant.address,
            timezone=plant.timezone,
            default_calendar_id=plant.default_calendar_id,
            default_schedule_id=plant.default_schedule_id,
            manager_name=plant.manager_name,
            manager_email=plant.manager_email,
            description=plant.description,
            line_count=plant.line_count,
            department_count=plant.department_count,
            group_count=plant.group_count,
            resource_count=plant.resource_count,
            is_active=plant.is_active,
            created_at=plant.created_at.isoformat() if plant.created_at else "",
            updated_at=plant.updated_at.isoformat() if plant.updated_at else "",
        )


@strawberry.input
class PlantInput:
    name: str
    code: str
    status: str = "active"
    building: typing.Optional[str] = None
    address: typing.Optional[str] = None
    timezone: typing.Optional[str] = None
    default_calendar_id: typing.Optional[str] = strawberry.field(name="defaultCalendarId", default=None)
    default_schedule_id: typing.Optional[str] = strawberry.field(name="defaultScheduleId", default=None)
    manager_name: typing.Optional[str] = strawberry.field(name="managerName", default=None)
    manager_email: typing.Optional[str] = strawberry.field(name="managerEmail", default=None)
    description: typing.Optional[str] = None


@strawberry.type
class PlantMutationResult:
    plant: typing.Optional[PlantNode] = None
    errors: typing.Optional[typing.List["FieldError"]] = None


@strawberry.type
class DeletePlantResult:
    success: bool
    in_use: bool = strawberry.field(name="inUse")
    message: str
    errors: typing.Optional[typing.List["FieldError"]] = None


@strawberry.type
class FieldError:
    field: str
    message: str


# ── Department (reusable master data — no plant FK) ──

@strawberry.type
class DepartmentNode:
    id: strawberry.ID
    code: str
    name: str
    status: str
    manager: str
    employees: int
    group_count: int = strawberry.field(name="groupCount")
    resource_count: int = strawberry.field(name="resourceCount")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, dept: Department) -> "DepartmentNode":
        return cls(
            id=strawberry.ID(str(dept.id)),
            code=dept.code,
            name=dept.name,
            status=dept.status,
            manager=dept.manager,
            employees=dept.employees,
            group_count=dept.group_count,
            resource_count=dept.resource_count,
            created_at=dept.created_at.isoformat() if dept.created_at else "",
            updated_at=dept.updated_at.isoformat() if dept.updated_at else "",
        )


# ── Department Input & Mutation Result ──

@strawberry.input
class DepartmentInput:
    name: str
    code: str
    status: str = "active"
    manager: typing.Optional[str] = None
    employees: typing.Optional[int] = None


@strawberry.type
class DepartmentMutationResult:
    department: typing.Optional[DepartmentNode] = None
    errors: typing.Optional[typing.List[FieldError]] = None


@strawberry.type
class DeleteDepartmentResult:
    success: bool
    in_use: bool = strawberry.field(name="inUse")
    message: str
    errors: typing.Optional[typing.List[FieldError]] = None


# ── Production Line ──

@strawberry.type
class ProductionLineNode:
    id: strawberry.ID
    code: str
    name: str
    status: str
    plant_name: str = strawberry.field(name="plantName")
    plant_id: str = strawberry.field(name="plantId")
    models_produced: typing.List[str] = strawberry.field(name="modelsProduced")
    shift_pattern: str = strawberry.field(name="shiftPattern")
    is_constraint: bool = strawberry.field(name="isConstraint")
    department_count: int = strawberry.field(name="departmentCount")
    group_count: int = strawberry.field(name="groupCount")
    resource_count: int = strawberry.field(name="resourceCount")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, line: ProductionLine) -> "ProductionLineNode":
        models = [m.strip() for m in line.models_produced.split(",") if m.strip()] if line.models_produced else []
        return cls(
            id=strawberry.ID(str(line.id)),
            code=line.code,
            name=line.name,
            status=line.status,
            plant_name=line.plant.name if line.plant else "",
            plant_id=str(line.plant_id) if line.plant_id else "",
            models_produced=models,
            shift_pattern=line.shift_pattern,
            is_constraint=line.is_constraint,
            department_count=line.department_count,
            group_count=line.group_count,
            resource_count=line.resource_count,
            created_at=line.created_at.isoformat() if line.created_at else "",
            updated_at=line.updated_at.isoformat() if line.updated_at else "",
        )


# ── Paginated Production Line ──

@strawberry.type
class ProductionLinePage:
    items: typing.List[ProductionLineNode]
    total_count: int = strawberry.field(name="totalCount")
    page: int
    page_size: int = strawberry.field(name="pageSize")
    total_pages: int = strawberry.field(name="totalPages")


# ── Resource Group ──

@strawberry.type
class ResourceGroupNode:
    id: strawberry.ID
    code: str
    name: str
    group_type: str = strawberry.field(name="groupType")
    status: str
    members: int
    leader: str
    department_name: str = strawberry.field(name="departmentName")
    department_id: typing.Optional[str] = strawberry.field(name="departmentId")
    plant_name: str = strawberry.field(name="plantName")
    plant_id: typing.Optional[str] = strawberry.field(name="plantId")
    resource_count: int = strawberry.field(name="resourceCount")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, group: ResourceGroup) -> "ResourceGroupNode":
        return cls(
            id=strawberry.ID(str(group.id)),
            code=group.code,
            name=group.name,
            group_type=group.group_type,
            status=group.status,
            members=group.members,
            leader=group.leader,
            department_name=group.department.name if group.department else "",
            department_id=str(group.department_id) if group.department_id else None,
            plant_name=group.plant.name if group.plant else "",
            plant_id=str(group.plant_id) if group.plant_id else None,
            resource_count=group.resource_count,
            created_at=group.created_at.isoformat() if group.created_at else "",
            updated_at=group.updated_at.isoformat() if group.updated_at else "",
        )


# ── Resource ──

@strawberry.type
class ResourceNode:
    id: strawberry.ID
    name: str
    code: str
    resource_type: str = strawberry.field(name="resourceType")
    status: str
    op_status: str = strawberry.field(name="opStatus")
    utilization: float
    shift: str
    last_activity: str = strawberry.field(name="lastActivity")
    flow_position: str = strawberry.field(name="flowPosition")
    group_name: str = strawberry.field(name="groupName")
    group_id: typing.Optional[str] = strawberry.field(name="groupId")
    department_name: str = strawberry.field(name="departmentName")
    department_id: typing.Optional[str] = strawberry.field(name="departmentId")
    plant_name: str = strawberry.field(name="plantName")
    plant_id: typing.Optional[str] = strawberry.field(name="plantId")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, res: Resource) -> "ResourceNode":
        return cls(
            id=strawberry.ID(str(res.id)),
            name=res.name,
            code=res.code,
            resource_type=res.resource_type,
            status=res.status,
            op_status=res.op_status,
            utilization=res.utilization,
            shift=res.shift,
            last_activity=res.last_activity,
            flow_position=res.flow_position,
            group_name=res.resource_group.name if res.resource_group else "",
            group_id=str(res.resource_group_id) if res.resource_group_id else None,
            department_name=res.resource_group.department.name if res.resource_group and res.resource_group.department else "",
            department_id=str(res.resource_group.department_id) if res.resource_group and res.resource_group.department_id else None,
            plant_name=res.resource_group.plant.name if res.resource_group and res.resource_group.plant else "",
            plant_id=str(res.resource_group.plant_id) if res.resource_group and res.resource_group.plant_id else None,
            created_at=res.created_at.isoformat() if res.created_at else "",
            updated_at=res.updated_at.isoformat() if res.updated_at else "",
        )


# ── Reference Table ──

@strawberry.type
class ReferenceTableNode:
    id: strawberry.ID
    name: str
    status: str
    entry_count: int = strawberry.field(name="entryCount")
    description: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, table: ReferenceTable) -> "ReferenceTableNode":
        return cls(
            id=strawberry.ID(str(table.id)),
            name=table.name,
            status=table.status,
            entry_count=table.entry_count,
            description=table.description,
            created_at=table.created_at.isoformat() if table.created_at else "",
            updated_at=table.updated_at.isoformat() if table.updated_at else "",
        )


# ── Data Management Overview Types ──

@strawberry.type
class DataManagementPlantNode:
    id: strawberry.ID
    name: str
    code: str
    status: str


@strawberry.type
class DataManagementKpis:
    production_lines: int = strawberry.field(name="productionLines")
    departments: int
    resources: int
    plant_status: str = strawberry.field(name="plantStatus")


@strawberry.type
class DataManagementTreeChild:
    id: str
    type: str
    name: str
    code: str
    status: str
    child_count: int = strawberry.field(name="childCount")
    children: typing.List["DataManagementTreeChild"] = strawberry.field(default_factory=list)


@strawberry.type
class DataManagementTreeRoot:
    id: str
    type: str
    name: str
    code: str
    status: str
    child_count: int = strawberry.field(name="childCount")
    children: typing.List[DataManagementTreeChild] = strawberry.field(default_factory=list)


@strawberry.type
class DataManagementNavCounts:
    plants: int
    production_lines: int = strawberry.field(name="productionLines")
    departments: int
    resource_groups: int = strawberry.field(name="resourceGroups")
    resources: int
    reference_tables: int = strawberry.field(name="referenceTables")


@strawberry.type
class DataManagementSystemHealth:
    running_lines: int = strawberry.field(name="runningLines")
    resources_down: int = strawberry.field(name="resourcesDown")
    high_utilization_resources: int = strawberry.field(name="highUtilizationResources")


@strawberry.type
class DataManagementOverview:
    selected_plant: typing.Optional[DataManagementPlantNode] = strawberry.field(name="selectedPlant")
    plants: typing.List[DataManagementPlantNode]
    kpis: DataManagementKpis
    tree: typing.Optional[DataManagementTreeRoot]
    navigation_counts: DataManagementNavCounts = strawberry.field(name="navigationCounts")
    system_health: DataManagementSystemHealth = strawberry.field(name="systemHealth")


# ── Snapshot ──

@strawberry.type
class ManufacturingSnapshot:
    plant_count: int = strawberry.field(name="plantCount")
    department_count: int = strawberry.field(name="departmentCount")
    resource_group_count: int = strawberry.field(name="resourceGroupCount")
    resource_count: int = strawberry.field(name="resourceCount")
    running_count: int = strawberry.field(name="runningCount")
    down_count: int = strawberry.field(name="downCount")
    maintenance_count: int = strawberry.field(name="maintenanceCount")


# ── Production Structure Tree Types ──

@strawberry.type
class ResourceStructureNode:
    id: str
    name: str
    code: str
    status: str


@strawberry.type
class ResourceGroupStructureNode:
    id: str
    name: str
    code: str
    status: str
    resources: typing.List[ResourceStructureNode]


@strawberry.type
class DepartmentStructureNode:
    id: str
    name: str
    code: str
    status: str
    resource_groups: typing.List[ResourceGroupStructureNode]


@strawberry.type
class ProductionLineStructureNode:
    id: str
    name: str
    code: str
    status: str
    departments: typing.List[DepartmentStructureNode]
    plant_id: str = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")


@strawberry.type
class ProductionStructureNode:
    """Top-level plant wrapper for the production tree."""
    id: str
    name: str
    code: str
    status: str
    production_lines: typing.List[ProductionLineStructureNode]


# ── Work History Entry ──

@strawberry.input
class WorkHistoryInput:
    id: str
    role: str
    company: str
    period: str
    description: str


@strawberry.type
class WorkHistoryEntry:
    id: str
    role: str
    company: str
    period: str
    description: str


# ── Education Entry ──

@strawberry.input
class EducationInput:
    id: str
    degree: str
    school: str
    period: str


@strawberry.type
class EducationEntry:
    id: str
    degree: str
    school: str
    period: str


# ── Profile ──

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
    work_history: typing.List[WorkHistoryEntry] = strawberry.field(name="workHistory")
    education: typing.List[EducationEntry]

    @classmethod
    def from_db(cls, profile: "Profile") -> "ProfileNode":
        return cls(
            id=strawberry.ID(str(profile.id)),
            name=profile.name,
            role=profile.role,
            email=profile.email,
            phone=profile.phone or "",
            location=profile.location or "",
            plant=profile.plant or "",
            department=profile.department or "",
            reports_to=profile.reports_to or "",
            language=profile.language or "",
            about=profile.about or "",
            created_at=profile.created_at.isoformat() if profile.created_at else "",
            updated_at=profile.updated_at.isoformat() if profile.updated_at else "",
            work_history=[WorkHistoryEntry(**w) for w in (profile.work_history or [])],
            education=[EducationEntry(**e) for e in (profile.education or [])],
        )


@strawberry.input
class ProfileInput:
    name: str
    role: str
    email: str
    phone: typing.Optional[str] = None
    location: typing.Optional[str] = None
    plant: typing.Optional[str] = None
    department: typing.Optional[str] = None
    reports_to: typing.Optional[str] = None
    language: typing.Optional[str] = None
    about: typing.Optional[str] = None
    work_history: typing.Optional[typing.List[WorkHistoryInput]] = None
    education: typing.Optional[typing.List[EducationInput]] = None


@strawberry.type
class ProfileMutationResult:
    profile: typing.Optional[ProfileNode] = None
    errors: typing.Optional[typing.List[FieldError]] = None


# ── Company ──

@strawberry.type
class CompanyNode:
    id: strawberry.ID
    code: str
    name: str
    address: str
    phone: str
    email: str
    website: str
    tax_id: str = strawberry.field(name="taxId")
    description: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, company: "Company") -> "CompanyNode":
        return cls(
            id=strawberry.ID(str(company.id)),
            code=company.code,
            name=company.name,
            address=company.address,
            phone=company.phone,
            email=company.email,
            website=company.website,
            tax_id=company.tax_id,
            description=company.description,
            created_at=company.created_at.isoformat() if company.created_at else "",
            updated_at=company.updated_at.isoformat() if company.updated_at else "",
        )


@strawberry.input
class CompanyInput:
    code: str
    name: str
    address: typing.Optional[str] = None
    phone: typing.Optional[str] = None
    email: typing.Optional[str] = None
    website: typing.Optional[str] = None
    tax_id: typing.Optional[str] = None
    description: typing.Optional[str] = None


@strawberry.type
class CompanyMutationResult:
    company: typing.Optional[CompanyNode] = None
    errors: typing.Optional[typing.List[FieldError]] = None
