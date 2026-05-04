import strawberry
from typing import Optional

from api.types.manufacturing import (
    ManufacturingSnapshot, PlantNode, DepartmentNode,
    ProductionLineNode, ResourceGroupNode, ResourceNode, ReferenceTableNode,
)
from manufacturing.models import (
    Plant, Department, ProductionLine,
    ResourceGroup, Resource, ReferenceTable,
)


@strawberry.type
class ManufacturingQuery:
    @strawberry.field
    def plants(self, search: Optional[str] = None, status: Optional[str] = None) -> list[PlantNode]:
        qs = Plant.objects.all()
        if status and status != "all":
            qs = qs.filter(status=status)
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(code__icontains=search)
        return [PlantNode.from_db(p) for p in qs]

    @strawberry.field
    def plant(self, id: str) -> Optional[PlantNode]:
        try:
            plant = Plant.objects.get(id=id)
            return PlantNode.from_db(plant)
        except Plant.DoesNotExist:
            return None

    @strawberry.field
    def departments(self, search: Optional[str] = None, status: Optional[str] = None) -> list[DepartmentNode]:
        qs = Department.objects.all()
        if status and status != "all":
            qs = qs.filter(status=status)
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(code__icontains=search)
        return [DepartmentNode.from_db(d) for d in qs]

    @strawberry.field
    def department(self, id: str) -> Optional[DepartmentNode]:
        try:
            return DepartmentNode.from_db(Department.objects.get(id=id))
        except Department.DoesNotExist:
            return None

    @strawberry.field
    def production_lines(self, search: Optional[str] = None, status: Optional[str] = None) -> list[ProductionLineNode]:
        qs = ProductionLine.objects.all()
        if status and status != "all":
            qs = qs.filter(status=status)
        if search:
            qs = qs.filter(name__icontains=search)
        return [ProductionLineNode.from_db(l) for l in qs]

    @strawberry.field
    def production_line(self, id: str) -> Optional[ProductionLineNode]:
        try:
            return ProductionLineNode.from_db(ProductionLine.objects.get(id=id))
        except ProductionLine.DoesNotExist:
            return None

    @strawberry.field
    def resource_groups(self, search: Optional[str] = None, type: Optional[str] = None) -> list[ResourceGroupNode]:
        qs = ResourceGroup.objects.all()
        if type and type != "all":
            qs = qs.filter(group_type=type)
        if search:
            qs = qs.filter(name__icontains=search)
        return [ResourceGroupNode.from_db(g) for g in qs]

    @strawberry.field
    def resource_group(self, id: str) -> Optional[ResourceGroupNode]:
        try:
            return ResourceGroupNode.from_db(ResourceGroup.objects.get(id=id))
        except ResourceGroup.DoesNotExist:
            return None

    @strawberry.field
    def resources(self, search: Optional[str] = None, status: Optional[str] = None) -> list[ResourceNode]:
        qs = Resource.objects.all()
        if status and status != "all":
            if status in ("Running", "Idle", "Down", "Maintenance"):
                qs = qs.filter(op_status=status)
            else:
                qs = qs.filter(status=status)
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(code__icontains=search)
        return [ResourceNode.from_db(r) for r in qs]

    @strawberry.field
    def resource(self, id: str) -> Optional[ResourceNode]:
        try:
            return ResourceNode.from_db(Resource.objects.get(id=id))
        except Resource.DoesNotExist:
            return None

    @strawberry.field
    def reference_tables(self, search: Optional[str] = None, status: Optional[str] = None) -> list[ReferenceTableNode]:
        qs = ReferenceTable.objects.all()
        if status and status != "all":
            qs = qs.filter(status=status)
        if search:
            qs = qs.filter(name__icontains=search)
        return [ReferenceTableNode.from_db(t) for t in qs]

    @strawberry.field
    def reference_table(self, id: str) -> Optional[ReferenceTableNode]:
        try:
            return ReferenceTableNode.from_db(ReferenceTable.objects.get(id=id))
        except ReferenceTable.DoesNotExist:
            return None

    @strawberry.field
    def manufacturing_snapshot(self) -> ManufacturingSnapshot:
        total_resources = Resource.objects.count()
        return ManufacturingSnapshot(
            plant_count=Plant.objects.count(),
            department_count=Department.objects.count(),
            resource_group_count=ResourceGroup.objects.count(),
            resource_count=total_resources,
            running_count=Resource.objects.filter(op_status="Running").count(),
            down_count=Resource.objects.filter(op_status="Down").count(),
            maintenance_count=Resource.objects.filter(op_status="Maintenance").count(),
        )
