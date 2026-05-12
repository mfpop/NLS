import strawberry
from typing import Optional
from django.db.models import Count, Q
from django.db.models import Prefetch

# Legacy types for backward compat
import typing
import strawberry as strawberry_decorator

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
    ProfileNode, WorkHistoryEntry, EducationEntry,
)


@strawberry_decorator.type
class LegacyReferenceItemNode:
    id: strawberry.ID
    table_type: str = strawberry.field(name="tableType")
    code: str
    name: str
    description: str
    is_active: bool = strawberry.field(name="isActive")
    sort_order: int = strawberry.field(name="sortOrder")

    @classmethod
    def from_ref_value(cls, rv: ReferenceValue, table_type: str) -> "LegacyReferenceItemNode":
        return cls(
            id=strawberry.ID(str(rv.id)),
            table_type=table_type,
            code=rv.code,
            name=rv.name,
            description=rv.description,
            is_active=rv.is_active,
            sort_order=rv.sort_order,
        )


@strawberry_decorator.type
class LegacyConfigOptionNode:
    category: str
    value: str
    label: str
    sort_order: int = strawberry.field(name="sortOrder")

    @classmethod
    def from_ref_value(cls, rv: ReferenceValue, category: str) -> "LegacyConfigOptionNode":
        return cls(
            category=category,
            value=rv.code,
            label=rv.name,
            sort_order=rv.sort_order,
        )


# Map old legacy table types to new category codes
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

# Canonical table type per category for unfiltered listing.
# Keep this explicit to avoid lossy reverse-map collisions where multiple table types
# share the same category (e.g. shift_pattern and shift_team -> shift_model).
CATEGORY_TO_TABLE_TYPE: dict[str, str] = {
    "calendar": "production_calendar",
    "shift_model": "shift_pattern",
    "language": "language",
    "timezone": "timezone",
    "plant_type": "manufacturing_type",
    "department_type": "work_center_type",
    "resource_type": "machine_type",
    "resource_capability": "operation_code",
    "product_line": "routing_type",
    "manufacturing_focus": "material_category",
    "resource_group_type": "inventory_type",
    "lean_methodology": "kanban_type",
    "industry_type": "industry_type",
    "schedule": "unit_type",
    "status": "downtime_code",
}
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
        self,
        plant_id: Optional[str] = None,
        search: Optional[str] = None,
        status: Optional[str] = None,
        include_tree: bool = True,
    ) -> DataManagementOverview:
        all_plants = Plant.objects.all()
        selected_plant = None
        if plant_id:
            try:
                selected_plant = Plant.objects.get(id=plant_id)
            except Plant.DoesNotExist:
                pass

        tree = None
        if include_tree:
            if selected_plant:
                children = build_plant_tree(selected_plant, status, search)
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
                    p_children = build_plant_tree(p, status, search)
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

    # ── Profile ──
    @strawberry.field
    def profile(self) -> Optional["ProfileNode"]:
        from manufacturing.models.profile import Profile as ProfileModel
        obj = ProfileModel.objects.first()
        if not obj:
            return None
        return ProfileNode(
            id=strawberry.ID(str(obj.id)),
            name=obj.name,
            role=obj.role,
            email=obj.email,
            phone=obj.phone or "",
            location=obj.location or "",
            plant=obj.plant or "",
            department=obj.department or "",
            reports_to=obj.reports_to or "",
            language=obj.language or "",
            about=obj.about or "",
            created_at=obj.created_at.isoformat() if obj.created_at else "",
            updated_at=obj.updated_at.isoformat() if obj.updated_at else "",
            work_history=[WorkHistoryEntry(**w) for w in (obj.work_history or [])],
            education=[EducationEntry(**e) for e in (obj.education or [])],
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
        qs = Plant.objects.all().annotate(
            line_count_annotated=Count("production_lines", distinct=True),
            department_count_annotated=Count("production_lines__department_assignments__department", distinct=True),
            group_count_annotated=Count("production_lines__department_assignments__department__resource_groups", distinct=True),
            resource_count_annotated=Count("production_lines__department_assignments__department__resource_groups__resources", distinct=True),
        )
        if status and status != "all":
            qs = qs.filter(status=status)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [PlantNode.from_db(p) for p in qs]

    @strawberry.field
    def plant(self, id: str) -> Optional[PlantNode]:
        try:
            return PlantNode.from_db(
                Plant.objects.annotate(
                    line_count_annotated=Count("production_lines", distinct=True),
                    department_count_annotated=Count("production_lines__department_assignments__department", distinct=True),
                    group_count_annotated=Count("production_lines__department_assignments__department__resource_groups", distinct=True),
                    resource_count_annotated=Count("production_lines__department_assignments__department__resource_groups__resources", distinct=True),
                ).get(id=id)
            )
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

    # ── Reference Options (lightweight dropdown query) ──
    @strawberry.field
    def reference_options(self, types: list[str]) -> list["ReferenceTableNode"]:
        """Fetch reference options for dropdowns by type codes. Returns only active values."""
        result = []
        for cat_code in types:
            try:
                cat = ReferenceCategory.objects.get(code=cat_code)
                values = ReferenceValue.objects.filter(category=cat, is_active=True).order_by("sort_order")
                result.append(ReferenceTableNode.from_category(cat, list(values)))
            except ReferenceCategory.DoesNotExist:
                pass
        return result

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

    @strawberry.field
    def reference_tables_list(self) -> list[ReferenceTableNode]:
        """Fetch all reference tables grouped by category with values."""
        categories = ReferenceCategory.objects.all().order_by("name")
        result = []
        for cat in categories:
            values = ReferenceValue.objects.filter(category=cat, is_active=True).order_by("sort_order")
            result.append(ReferenceTableNode.from_category(cat, list(values)))
        return result

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
    def production_structure_tree(self, plant_id: str, search: Optional[str] = None, status: Optional[str] = None) -> Optional[ProductionStructureTree]:
        try:
            plant = Plant.objects.get(id=plant_id)
        except Plant.DoesNotExist:
            return None
        children = build_plant_tree(plant, status=status, search=search)
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

    # ── Legacy backward-compatible resolvers ──

    @strawberry.field
    def reference_items(self, table_type: typing.Optional[str] = None, active_only: typing.Optional[bool] = None) -> list[LegacyReferenceItemNode]:
        """Legacy: returns ReferenceItem-style results from new ReferenceValue data."""
        result = []
        cats_qs = ReferenceCategory.objects.all()
        if table_type:
            category_code = TABLE_TYPE_TO_CATEGORY.get(table_type, table_type)
            cats_qs = cats_qs.filter(code=category_code)
        for cat in cats_qs:
            tt = table_type or CATEGORY_TO_TABLE_TYPE.get(cat.code, cat.code)
            vals = ReferenceValue.objects.filter(category=cat)
            if active_only:
                vals = vals.filter(is_active=True)
            for v in vals.order_by("sort_order"):
                result.append(LegacyReferenceItemNode.from_ref_value(v, tt))
        return result

    @strawberry.field
    def config_options(self, category: typing.Optional[str] = None) -> list[LegacyConfigOptionNode]:
        """Legacy: returns ConfigOption-style results from new ReferenceValue data."""
        result = []
        cats_qs = ReferenceCategory.objects.all()
        for cat in cats_qs:
            if category and cat.code != category:
                continue
            vals = ReferenceValue.objects.filter(category=cat, is_active=True).order_by("sort_order")
            for v in vals:
                result.append(LegacyConfigOptionNode.from_ref_value(v, cat.code))
        return result
