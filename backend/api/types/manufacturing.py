import strawberry
import typing
from datetime import datetime

from manufacturing.models import (
    Plant, Department, ProductionLine,
    ResourceGroup, Resource, ReferenceTable,
)


# ── Plant ──

@strawberry.type
class PlantNode:
    id: str
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
            id=str(plant.id),
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


# ── Department ──

@strawberry.type
class DepartmentNode:
    id: str
    code: str
    name: str
    status: str
    manager: str
    employees: int
    plant_id: typing.Optional[str] = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")
    group_count: int = strawberry.field(name="groupCount")
    resource_count: int = strawberry.field(name="resourceCount")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, dept: Department) -> "DepartmentNode":
        return cls(
            id=str(dept.id),
            code=dept.code,
            name=dept.name,
            status=dept.status,
            manager=dept.manager,
            employees=dept.employees,
            plant_id=str(dept.plant_id) if dept.plant_id else None,
            plant_name=dept.plant.name if dept.plant else "",
            group_count=dept.group_count,
            resource_count=dept.resource_count,
            created_at=dept.created_at.isoformat() if dept.created_at else "",
            updated_at=dept.updated_at.isoformat() if dept.updated_at else "",
        )


# ── Production Line ──

@strawberry.type
class ProductionLineNode:
    id: str
    name: str
    status: str
    plant_name: str = strawberry.field(name="plantName")
    plant_id: typing.Optional[str] = strawberry.field(name="plantId")
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
            id=str(line.id),
            name=line.name,
            status=line.status,
            plant_name=line.plant.name if line.plant else "",
            plant_id=str(line.plant_id) if line.plant_id else None,
            models_produced=models,
            shift_pattern=line.shift_pattern,
            is_constraint=line.is_constraint,
            department_count=line.department_count,
            group_count=line.group_count,
            resource_count=line.resource_count,
            created_at=line.created_at.isoformat() if line.created_at else "",
            updated_at=line.updated_at.isoformat() if line.updated_at else "",
        )


# ── Resource Group ──

@strawberry.type
class ResourceGroupNode:
    id: str
    name: str
    group_type: str = strawberry.field(name="groupType")
    status: str
    members: int
    leader: str
    department: str
    department_id: typing.Optional[str] = strawberry.field(name="departmentId")
    plant_name: str = strawberry.field(name="plantName")
    plant_id: typing.Optional[str] = strawberry.field(name="plantId")
    resource_count: int = strawberry.field(name="resourceCount")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, group: ResourceGroup) -> "ResourceGroupNode":
        return cls(
            id=str(group.id),
            name=group.name,
            group_type=group.group_type,
            status=group.status,
            members=group.members,
            leader=group.leader,
            department=group.department.name if group.department else "",
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
    id: str
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
    line_name: str = strawberry.field(name="lineName")
    line_id: typing.Optional[str] = strawberry.field(name="lineId")
    plant_name: str = strawberry.field(name="plantName")
    plant_id: typing.Optional[str] = strawberry.field(name="plantId")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, res: Resource) -> "ResourceNode":
        return cls(
            id=str(res.id),
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
            department_name=res.department.name if res.department else "",
            department_id=str(res.department_id) if res.department_id else None,
            line_name=res.production_line.name if res.production_line else "",
            line_id=str(res.production_line_id) if res.production_line_id else None,
            plant_name=res.plant.name if res.plant else "",
            plant_id=str(res.plant_id) if res.plant_id else None,
            created_at=res.created_at.isoformat() if res.created_at else "",
            updated_at=res.updated_at.isoformat() if res.updated_at else "",
        )


# ── Reference Table ──

@strawberry.type
class ReferenceTableNode:
    id: str
    name: str
    status: str
    entry_count: int = strawberry.field(name="entryCount")
    description: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, table: ReferenceTable) -> "ReferenceTableNode":
        return cls(
            id=str(table.id),
            name=table.name,
            status=table.status,
            entry_count=table.entry_count,
            description=table.description,
            created_at=table.created_at.isoformat() if table.created_at else "",
            updated_at=table.updated_at.isoformat() if table.updated_at else "",
        )


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
