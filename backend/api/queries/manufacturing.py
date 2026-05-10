import strawberry
from typing import Optional
from django.db.models import Count, Q
from django.db.models import Prefetch

from api.types.manufacturing import (
    ManufacturingSnapshot, CompanyNode,
    PlantNode, ProductionLineNode, DepartmentNode,
    ResourceGroupNode, ResourceNode,
    ProductionStructureTree, StructureChildNode,
    ScheduleNode, ShiftNode, ScheduleAssignmentNode,
    ReferenceCategoryNode, ReferenceValueNode, ResourceTypeNode, VisualIdentityNode,
    ReferenceTableNode,
    ProductModelNode, ProcessFlowNode, ProcessStepNode,
    PaginatedReferenceCategoryResponse, PaginatedReferenceValueResponse,
    PaginatedShiftResponse, PaginatedScheduleAssignmentResponse,
    PaginatedVisualIdentityResponse, PaginatedProductModelResponse,
    PaginatedProcessFlowResponse, PaginatedProcessStepResponse,
)
from manufacturing.models import (
    Plant, Department, ProductionLine, ResourceGroup, Resource, Company,
    Schedule, Shift, ScheduleAssignment,
    ReferenceCategory, ReferenceValue, ResourceType, VisualIdentity,
    ProductModel, ProcessFlow, ProcessStep,
)
from api.services.tree_builder import build_plant_tree
from manufacturing.domain.structure_service import get_structure_counts, get_system_health


def _validate_pagination(limit: Optional[int], offset: Optional[int]) -> tuple[int, int]:
    """Validate and normalize pagination parameters.
    
    Defaults: limit=50, max=500, offset=0 (minimum)
    """
    limit = limit or 50
    limit = min(limit, 500)  # Max 500 items
    limit = max(limit, 1)     # Min 1 item
    
    offset = offset or 0
    offset = max(offset, 0)   # Min 0
    
    return limit, offset


@strawberry.type
class DataManagementPlantNode:
    id: strawberry.ID
    name: str
    code: str
    status: str

    @classmethod
    def from_db(cls, plant: Plant) -> "DataManagementPlantNode":
        return cls(id=strawberry.ID(str(plant.id)), name=plant.name, code=plant.code, status=plant.status)


@strawberry.type
class DataManagementKpis:
    production_lines: int = strawberry.field(name="productionLines")
    departments: int = strawberry.field(name="departments")
    resource_groups: int = strawberry.field(name="resourceGroups")
    resources: int = strawberry.field(name="resources")
    plant_status: str = strawberry.field(name="plantStatus")


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
    selected_plant: Optional[DataManagementPlantNode] = strawberry.field(name="selectedPlant")
    plants: list[DataManagementPlantNode]
    kpis: DataManagementKpis
    tree: Optional[ProductionStructureTree]
    navigation_counts: DataManagementNavCounts = strawberry.field(name="navigationCounts")
    system_health: DataManagementSystemHealth = strawberry.field(name="systemHealth")


@strawberry.type
class ManufacturingQuery:
    @strawberry.field
    def data_management_overview(
        self, plant_id: Optional[str] = None, search: Optional[str] = None, status: Optional[str] = None,
    ) -> DataManagementOverview:
        all_plants = Plant.objects.all()
        selected_plant = None
        if plant_id:
            try:
                selected_plant = Plant.objects.get(id=plant_id)
            except Plant.DoesNotExist:
                pass

        tree = None
        if selected_plant:
            children = build_plant_tree(selected_plant, status)
            tree = ProductionStructureTree(
                id=strawberry.ID(str(selected_plant.id)), type="plant",
                name=selected_plant.name, code=selected_plant.code,
                status=selected_plant.status,
                child_count=len(children), children=children,
                schedule_status="Scheduled" if selected_plant.id else "Missing Schedule",
            )
        else:
            # Show all plants as top-level tree nodes
            company = Company.objects.first()
            company_name = company.name if company else "Company"
            all_children = []
            for p in all_plants:
                p_children = build_plant_tree(p, status)
                all_children.append(StructureChildNode(
                    id=strawberry.ID(str(p.id)), type="plant",
                    name=p.name, code=p.code, status=p.status,
                    child_count=len(p_children), children=p_children,
                    schedule_status="Scheduled" if p.id else "Missing Schedule",
                ))
            tree = ProductionStructureTree(
                id=strawberry.ID("root"), type="company",
                name=company_name, code="", status="ACTIVE",
                child_count=len(all_children), children=all_children,
                schedule_status="Scheduled",
            )

        counts = get_structure_counts()
        health_data = get_system_health()
        health = DataManagementSystemHealth(
            running_lines=health_data["running_lines"],
            resources_down=health_data["resources_down"],
            high_utilization_resources=health_data["high_utilization_resources"],
        )

        kpis = DataManagementKpis(
            production_lines=counts["lines"],
            departments=counts["depts"],
            resource_groups=counts["groups"],
            resources=counts["resources"],
            plant_status=selected_plant.status if selected_plant else "unknown",
        )

        nav_counts = DataManagementNavCounts(
            plants=counts["plants"],
            production_lines=counts["lines"],
            departments=counts["depts"],
            resource_groups=counts["groups"],
            resources=counts["resources"],
            reference_tables=0,
        )

        return DataManagementOverview(
            selected_plant=DataManagementPlantNode.from_db(selected_plant) if selected_plant else None,
            plants=[DataManagementPlantNode.from_db(p) for p in all_plants],
            kpis=kpis,
            tree=tree,
            navigation_counts=nav_counts,
            system_health=health,
        )

    # ── Company ──
    @strawberry.field
    def company(self, id: Optional[str] = None) -> Optional[CompanyNode]:
        qs = Company.objects.all()
        if id:
            qs = qs.filter(id=id)
        obj = qs.first()
        return CompanyNode.from_db(obj) if obj else None

    # ── Plant ──
    @strawberry.field
    def plants(self, status: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[PlantNode]:
        qs = Plant.objects.all()
        if status and status != "all":
            qs = qs.filter(status=status)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [PlantNode.from_db(p) for p in qs]

    @strawberry.field
    def plant(self, id: str) -> Optional[PlantNode]:
        try:
            return PlantNode.from_db(Plant.objects.get(id=id))
        except Plant.DoesNotExist:
            return None

    # ── ProductionLine ──
    @strawberry.field
    def production_lines(self, plant_id: Optional[str] = None, status: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[ProductionLineNode]:
        qs = ProductionLine.objects.select_related("plant").all()
        if plant_id:
            qs = qs.filter(plant_id=plant_id)
        if status and status != "all":
            qs = qs.filter(status=status)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [ProductionLineNode.from_db(l) for l in qs]

    @strawberry.field
    def production_line(self, id: str) -> Optional[ProductionLineNode]:
        try:
            return ProductionLineNode.from_db(ProductionLine.objects.select_related("plant").get(id=id))
        except ProductionLine.DoesNotExist:
            return None

    # ── Department ──
    @strawberry.field
    def departments(self, production_line_id: Optional[str] = None, status: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[DepartmentNode]:
        qs = Department.objects.all()
        if production_line_id:
            qs = qs.filter(line_assignments__production_line_id=production_line_id)
        if status and status != "all":
            qs = qs.filter(status=status)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [DepartmentNode.from_db(d) for d in qs]

    @strawberry.field
    def department(self, id: str) -> Optional[DepartmentNode]:
        try:
            return DepartmentNode.from_db(Department.objects.get(id=id))
        except Department.DoesNotExist:
            return None

    # ── ResourceGroup ──
    @strawberry.field
    def resource_groups(self, department_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[ResourceGroupNode]:
        qs = ResourceGroup.objects.select_related("department").all()
        if department_id:
            qs = qs.filter(department_id=department_id)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [ResourceGroupNode.from_db(g) for g in qs]

    @strawberry.field
    def resource_group(self, id: str) -> Optional[ResourceGroupNode]:
        try:
            return ResourceGroupNode.from_db(ResourceGroup.objects.select_related("department").get(id=id))
        except ResourceGroup.DoesNotExist:
            return None

    # ── Resource ──
    @strawberry.field
    def resources(self, resource_group_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[ResourceNode]:
        qs = Resource.objects.select_related("resource_group").all()
        if resource_group_id:
            qs = qs.filter(resource_group_id=resource_group_id)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [ResourceNode.from_db(r) for r in qs]

    @strawberry.field
    def resource(self, id: str) -> Optional[ResourceNode]:
        try:
            return ResourceNode.from_db(Resource.objects.select_related("resource_group").get(id=id))
        except Resource.DoesNotExist:
            return None

    # ── Schedule ──
    @strawberry.field
    def schedules(self, status: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[ScheduleNode]:
        qs = Schedule.objects.all()
        if status and status != "all":
            qs = qs.filter(status=status)
        if limit:
            limit, offset = _validate_pagination(limit, offset)
            qs = qs[offset:offset + limit]
        return [ScheduleNode.from_db(s) for s in qs]

    @strawberry.field
    def shifts(self, schedule_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> PaginatedShiftResponse:
        qs = Shift.objects.all()
        if schedule_id:
            qs = qs.filter(schedule_id=schedule_id)
        
        total = qs.count()
        limit, offset = _validate_pagination(limit, offset)
        items = [ShiftNode.from_db(s) for s in qs[offset:offset + limit]]
        has_more = (offset + limit) < total
        
        return PaginatedShiftResponse(items=items, total=total, has_more=has_more)

    @strawberry.field
    def schedule_assignments(self, entity_type: Optional[str] = None, entity_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> PaginatedScheduleAssignmentResponse:
        qs = ScheduleAssignment.objects.all()
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if entity_id:
            qs = qs.filter(entity_id=entity_id)
        
        total = qs.count()
        limit, offset = _validate_pagination(limit, offset)
        items = [ScheduleAssignmentNode.from_db(a) for a in qs[offset:offset + limit]]
        has_more = (offset + limit) < total
        
        return PaginatedScheduleAssignmentResponse(items=items, total=total, has_more=has_more)

    # ── New Reference Tables Resolver (replaces legacy) ──
    @strawberry.field
    def reference_tables(self, category: str) -> Optional[ReferenceTableNode]:
        """Fetch a complete reference table by category code with all values."""
        try:
            cat = ReferenceCategory.objects.get(code=category)
            values = ReferenceValue.objects.filter(category=cat).order_by("sort_order")
            return ReferenceTableNode.from_category(cat, list(values))
        except ReferenceCategory.DoesNotExist:
            return None

    # ── Reference Data ──
    @strawberry.field
    def reference_categories(self, limit: Optional[int] = None, offset: Optional[int] = None) -> PaginatedReferenceCategoryResponse:
        qs = ReferenceCategory.objects.all()
        total = qs.count()
        limit, offset = _validate_pagination(limit, offset)
        items = [ReferenceCategoryNode.from_db(c) for c in qs[offset:offset + limit]]
        has_more = (offset + limit) < total
        
        return PaginatedReferenceCategoryResponse(items=items, total=total, has_more=has_more)

    @strawberry.field
    def reference_values(self, category_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> PaginatedReferenceValueResponse:
        qs = ReferenceValue.objects.all()
        if category_id:
            qs = qs.filter(category_id=category_id)
        
        total = qs.count()
        limit, offset = _validate_pagination(limit, offset)
        items = [ReferenceValueNode.from_db(v) for v in qs[offset:offset + limit]]
        has_more = (offset + limit) < total
        
        return PaginatedReferenceValueResponse(items=items, total=total, has_more=has_more)

    @strawberry.field
    def resource_types(self, limit: Optional[int] = None, offset: Optional[int] = None) -> list[ResourceTypeNode]:
        qs = ResourceType.objects.all()
        if limit:
            limit, offset = _validate_pagination(limit, offset)
            qs = qs[offset:offset + limit]
        return [ResourceTypeNode.from_db(rt) for rt in qs]

    @strawberry.field
    def visual_identities(self, entity_type: Optional[str] = None, entity_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> PaginatedVisualIdentityResponse:
        qs = VisualIdentity.objects.all()
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if entity_id:
            qs = qs.filter(entity_id=entity_id)
        
        total = qs.count()
        limit, offset = _validate_pagination(limit, offset)
        items = [VisualIdentityNode.from_db(v) for v in qs[offset:offset + limit]]
        has_more = (offset + limit) < total
        
        return PaginatedVisualIdentityResponse(items=items, total=total, has_more=has_more)

    # ── Product Routing ──
    @strawberry.field
    def product_models(self, limit: Optional[int] = None, offset: Optional[int] = None) -> PaginatedProductModelResponse:
        qs = ProductModel.objects.all()
        total = qs.count()
        limit, offset = _validate_pagination(limit, offset)
        items = [ProductModelNode.from_db(m) for m in qs[offset:offset + limit]]
        has_more = (offset + limit) < total
        
        return PaginatedProductModelResponse(items=items, total=total, has_more=has_more)

    @strawberry.field
    def process_flows(self, product_model_id: Optional[str] = None, production_line_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> PaginatedProcessFlowResponse:
        qs = ProcessFlow.objects.all()
        if product_model_id:
            qs = qs.filter(product_model_id=product_model_id)
        if production_line_id:
            qs = qs.filter(production_line_id=production_line_id)
        
        total = qs.count()
        limit, offset = _validate_pagination(limit, offset)
        items = [ProcessFlowNode.from_db(f) for f in qs[offset:offset + limit]]
        has_more = (offset + limit) < total
        
        return PaginatedProcessFlowResponse(items=items, total=total, has_more=has_more)

    @strawberry.field
    def process_steps(self, process_flow_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> PaginatedProcessStepResponse:
        qs = ProcessStep.objects.all()
        if process_flow_id:
            qs = qs.filter(process_flow_id=process_flow_id)
        
        total = qs.count()
        limit, offset = _validate_pagination(limit, offset)
        items = [ProcessStepNode.from_db(s) for s in qs[offset:offset + limit]]
        has_more = (offset + limit) < total
        
        return PaginatedProcessStepResponse(items=items, total=total, has_more=has_more)

    # ── Read Models ──
    @strawberry.field
    def production_structure_tree(self, plant_id: str) -> Optional[ProductionStructureTree]:
        try:
            plant = Plant.objects.get(id=plant_id)
        except Plant.DoesNotExist:
            return None
        children = build_plant_tree(plant)
        return ProductionStructureTree(
            id=strawberry.ID(str(plant.id)), type="plant",
            name=plant.name, code=plant.code, status=plant.status,
            child_count=len(children), children=children,
            schedule_status="Scheduled" if plant.id else "Missing Schedule",
        )

    @strawberry.field
    def manufacturing_snapshot(self) -> ManufacturingSnapshot:
        return ManufacturingSnapshot.from_counts(
            plants=Plant.objects.count(),
            lines=ProductionLine.objects.count(),
            departments=Department.objects.count(),
            groups=ResourceGroup.objects.count(),
            resources=Resource.objects.count(),
        )
