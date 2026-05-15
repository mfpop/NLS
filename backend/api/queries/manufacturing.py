import strawberry
from collections import Counter, defaultdict
from typing import Optional
from django.db.models import Count
from django.db.models import Q
from django.contrib.auth.models import User

# Legacy types for backward compat
import typing
import strawberry as strawberry_decorator

from manufacturing.domain.routing_service import RoutingService
from manufacturing.domain.department_service import DepartmentService, DepartmentServiceError
from manufacturing.domain.capacity_service import CapacityPlanService

from api.types.manufacturing import (
    ManufacturingSnapshot, CompanyNode,
    PlantNode, ProductionLineNode, DepartmentNode,
    ResourceGroupNode, ResourceGroupFlowUsageNode, ResourceNode,
    ProductionStructureTree, StructureChildNode,
    ScheduleNode, ShiftNode, ScheduleAssignmentNode,
    ReferenceCategoryNode, ReferenceValueNode, ResourceTypeNode, VisualIdentityNode,
    ReferenceTableNode,
    ProductModelNode, ProductModelByFamilyNode, ProcessFlowNode, ProcessStepNode,
    PaginatedReferenceCategoryResponse, PaginatedReferenceValueResponse,
    PaginatedShiftResponse, PaginatedScheduleAssignmentResponse,
    PaginatedVisualIdentityResponse, PaginatedProductModelResponse,
    PaginatedProcessFlowResponse, PaginatedProcessStepResponse,
    ProfileNode, WorkHistoryEntry, EducationEntry,
    RoutingNode, RoutingSummaryNode, RoutingStepNode, StepCapacityNode, YamazumiAnalysisNode, YamazumiStepNode,
    ProductionLineFlowContextNode, MaterialNode, InventoryLocationNode,
    CapacityPlanNode, CapacityPlanInputNode, CapacityPlanResultNode, CapacityYamazumiNode, CapacityScenarioNode,
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
    category_name: str = strawberry.field(name="categoryName", default="")
    data_type: str = strawberry.field(name="dataType", default="Configurable")
    usage_context: str = strawberry.field(name="usageContext", default="")
    usage_impact: str = strawberry.field(name="usageImpact", default="")
    updated_at: str = strawberry.field(name="updatedAt", default="")
    is_system_managed: bool = strawberry.field(name="isSystemManaged", default=False)
    is_configurable: bool = strawberry.field(name="isConfigurable", default=True)
    username: str = ""
    email: str = ""
    role: str = ""
    department: str = ""
    plant: str = ""
    shift_team: str = strawberry.field(name="shiftTeam", default="")

    @classmethod
    def from_ref_value(
        cls,
        rv: ReferenceValue,
        table_type: str,
        scoped_id: bool = False,
        usage_impact: str | None = None,
    ) -> "LegacyReferenceItemNode":
        return cls(
            id=strawberry.ID(f"{table_type}:{rv.id}" if scoped_id else str(rv.id)),
            table_type=table_type,
            code=rv.code,
            name=rv.name,
            description=rv.description,
            is_active=rv.is_active,
            sort_order=rv.sort_order,
            category_name=rv.category.name,
            data_type="System-managed" if rv.is_system_managed else "Configurable",
            usage_context=rv.usage_context,
            usage_impact=usage_impact or default_reference_usage_impact(table_type),
            updated_at=rv.updated_at.isoformat() if rv.updated_at else "",
            is_system_managed=rv.is_system_managed,
            is_configurable=rv.is_configurable,
        )

    @classmethod
    def from_user(cls, user: User) -> "LegacyReferenceItemNode":
        try:
            role_profile = user.role_profile
            role = role_profile.get_role_display()
            department = role_profile.department
            plant = role_profile.plant
        except UserRole.DoesNotExist:
            role = "guest"
            department = ""
            plant = ""
        details = [value for value in (role, department, plant, user.email) if value]
        return cls(
            id=strawberry.ID(f"user:{user.id}"),
            table_type="staff_user",
            code=user.username,
            name=user.get_full_name() or user.username,
            description=" - ".join(details),
            is_active=user.is_active,
            sort_order=user.id,
            category_name="People",
            data_type="Managed by workflow",
            usage_context="Managed by staff/user workflow",
            usage_impact="Used by manager and supervisor assignments",
            updated_at=user.last_login.isoformat() if user.last_login else user.date_joined.isoformat(),
            is_system_managed=True,
            is_configurable=False,
            username=user.username,
            email=user.email,
            role=role,
            department=department,
            plant=plant,
            shift_team="",
        )

    @classmethod
    def from_user_role(cls, role: "UserRole") -> "LegacyReferenceItemNode":
        user = role.user
        department = role.department or "Unassigned department"
        plant = role.plant or "Unassigned plant"
        return cls(
            id=strawberry.ID(f"user_role:{role.id}"),
            table_type="staff_assignment",
            code=user.username,
            name=user.get_full_name() or user.username,
            description=f"{role.get_role_display()} - {department} - {plant}",
            is_active=user.is_active,
            sort_order=role.id,
            category_name="People",
            data_type="Managed by workflow",
            usage_context="Managed by staff assignment workflow",
            usage_impact=f"Feeds ownership, staffing and employee counts for {department} / {plant}",
            updated_at=user.last_login.isoformat() if user.last_login else user.date_joined.isoformat(),
            is_system_managed=True,
            is_configurable=False,
            username=user.username,
            email=user.email,
            role=role.get_role_display(),
            department=department,
            plant=plant,
            shift_team="",
        )


def default_reference_usage_impact(table_type: str) -> str:
    if table_type == "skill_type":
        return "Available for new resource capability assignments"
    if table_type == "role":
        return "Available for new staff assignments"
    return "Available for new production structure records"


def _increment_usage(counter: dict[int, Counter], ref_id: int | None, label: str, seen: set[tuple[int, str, int]], object_id: int):
    if not ref_id:
        return
    key = (ref_id, label, object_id)
    if key in seen:
        return
    seen.add(key)
    counter[ref_id][label] += 1


def _format_reference_usage(ref_id: int, table_type: str, usage_counts: dict[int, Counter]) -> str:
    if table_type == "role":
        count = usage_counts.get(ref_id, Counter()).get("staff assignment", 0)
        return f"Used by {count} staff assignment{'s' if count != 1 else ''}" if count else default_reference_usage_impact(table_type)
    if table_type == "skill_type":
        count = usage_counts.get(ref_id, Counter()).get("resource", 0)
        return f"Used by {count} resource{'s' if count != 1 else ''}" if count else default_reference_usage_impact(table_type)

    labels = (
        ("company", "companies"),
        ("plant", "plants"),
        ("line", "lines"),
        ("department", "departments"),
        ("resource group", "resource groups"),
        ("resource", "resources"),
    )
    usage = [
        f"{count} {plural if count != 1 else singular}"
        for singular, plural in labels
        if (count := usage_counts.get(ref_id, Counter()).get(singular, 0))
    ]
    return "Used in " + ", ".join(usage) if usage else default_reference_usage_impact(table_type)


def build_reference_usage_counts(reference_ids: set[int]) -> dict[int, Counter]:
    usage: dict[int, Counter] = defaultdict(Counter)
    seen: set[tuple[int, str, int]] = set()
    if not reference_ids:
        return usage

    for company in Company.objects.only(
        "id", "status_id", "industry_type_id", "default_timezone_id", "default_language_id",
        "default_calendar_id", "default_shift_model_id", "week_start_day_id",
    ).prefetch_related("product_line_refs", "lean_methodology_refs"):
        for ref_id in (
            company.status_id_id, company.industry_type_id_id, company.default_timezone_id_id,
            company.default_language_id_id, company.default_calendar_id_id,
            company.default_shift_model_id_id, company.week_start_day_id_id,
        ):
            _increment_usage(usage, ref_id, "company", seen, company.id)
        for ref in company.product_line_refs.all():
            _increment_usage(usage, ref.id, "company", seen, company.id)
        for ref in company.lean_methodology_refs.all():
            _increment_usage(usage, ref.id, "company", seen, company.id)

    for plant in Plant.objects.only(
        "id", "status_id", "country_id", "timezone_id", "plant_type_id", "default_calendar_id",
        "default_shift_model_id", "week_start_day_id", "default_schedule_id",
    ).prefetch_related("manufacturing_focus_refs"):
        for ref_id in (
            plant.status_id_id, plant.country_id_id, plant.timezone_id_id, plant.plant_type_id_id,
            plant.default_calendar_id_id, plant.default_shift_model_id_id, plant.week_start_day_id_id,
            plant.default_schedule_id_id,
        ):
            _increment_usage(usage, ref_id, "plant", seen, plant.id)
        for ref in plant.manufacturing_focus_refs.all():
            _increment_usage(usage, ref.id, "plant", seen, plant.id)

    for line in ProductionLine.objects.only(
        "id", "status_id", "line_type_id", "shift_pattern_id", "default_calendar_id",
        "week_start_day_id", "timezone_id", "capacity_uom_id",
    ):
        for ref_id in (
            line.status_id_id, line.line_type_id_id, line.shift_pattern_id_id,
            line.default_calendar_id_id, line.week_start_day_id_id, line.timezone_id_id,
            line.capacity_uom_id_id,
        ):
            _increment_usage(usage, ref_id, "line", seen, line.id)

    for department in Department.objects.only("id", "status_id", "department_type_id"):
        _increment_usage(usage, department.status_id_id, "department", seen, department.id)
        _increment_usage(usage, department.department_type_id_id, "department", seen, department.id)

    for group in ResourceGroup.objects.only("id", "status_id", "group_type_id"):
        _increment_usage(usage, group.status_id_id, "resource group", seen, group.id)
        _increment_usage(usage, group.group_type_id_id, "resource group", seen, group.id)

    for resource in Resource.objects.only("id", "status_id", "resource_type_id").prefetch_related("capabilities"):
        _increment_usage(usage, resource.status_id_id, "resource", seen, resource.id)
        _increment_usage(usage, resource.resource_type_id_id, "resource", seen, resource.id)
        for ref in resource.capabilities.all():
            _increment_usage(usage, ref.id, "resource", seen, resource.id)

    role_choices = dict(UserRole.RoleType.choices)
    role_counts = Counter(UserRole.objects.values_list("role", flat=True))
    for ref in ReferenceValue.objects.filter(id__in=reference_ids, category__code="role").only("id", "code", "name"):
        role_values = {ref.code, ref.name}
        role_values.update(value for value, label in role_choices.items() if label.lower() == ref.name.lower())
        usage[ref.id]["staff assignment"] += sum(role_counts.get(value, 0) for value in role_values)

    return usage


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
    "downtime_code": "downtime_reason",
    "defect_code": "defect_type",
    "scrap_reason": "scrap_reason",
    "kaizen_category": "lean_value",
    "priority": "priority",
    "label_badge": "label_badge",
    "maintenance_type": "maintenance_type",
    "material_flow_type": "material_flow_type",
    "process_type": "process_type",
    "skill_type": "skill_type",
    "role": "role",
    "shift_team": "shift_team",
    "staff_user": "__staff_user__",
    "staff_assignment": "__staff_assignment__",
    "product_model": "product_model",
    "production_family": "production_family",
}

REFERENCE_USAGE_CONTEXT: dict[str, str] = {
    "production_calendar": "Used in schedules, plants, resource groups",
    "shift_pattern": "Used by production lines and schedules",
    "language": "Used by company and user preferences",
    "timezone": "Used by company, plants and production lines",
    "industry_type": "Used by company setup",
    "manufacturing_type": "Used by plant setup",
    "work_center_type": "Used by departments",
    "machine_type": "Used by resources",
    "operation_code": "Used by resource capabilities and routings",
    "routing_type": "Used by routing setup",
    "material_category": "Used by material flow setup",
    "inventory_type": "Used by resource groups",
    "kanban_type": "Used by lean flow setup",
    "container_type": "Used by material handling setup",
    "unit_type": "Used by capacity and schedule values",
    "downtime_code": "Used by production loss tracking",
    "defect_code": "Used by quality tracking",
    "scrap_reason": "Used by scrap reporting",
    "kaizen_category": "Used by improvement workflows",
    "skill_type": "Reusable skills/certifications used by resources, staff and training",
    "role": "Feeds permissions, ownership, approvals and manager/supervisor selections",
    "shift_team": "Production crews used by schedules, execution and staff assignments",
    "priority": "Used by task, problem and action prioritization",
    "label_badge": "Used by visual tagging across operational workflows",
    "maintenance_type": "Used by maintenance planning and execution",
    "material_flow_type": "Used by material flow and inventory staging",
    "process_type": "Used by routing, resource and process classification",
    "product_model": "Used by production line product scope",
    "production_family": "Used by product models and production lines",
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
    "downtime_reason": "downtime_code",
    "defect_type": "defect_code",
    "scrap_reason": "scrap_reason",
    "lean_value": "kaizen_category",
    "priority": "priority",
    "label_badge": "label_badge",
    "maintenance_type": "maintenance_type",
    "material_flow_type": "material_flow_type",
    "process_type": "process_type",
    "product_model": "product_model",
    "production_family": "production_family",
    "skill_type": "skill_type",
    "role": "role",
    "shift_team": "shift_team",
}

from manufacturing.models import (
    Plant, Department, ProductionLine, ResourceGroup, Resource, Company,
    Schedule, Shift, ScheduleAssignment, UserRole,
    ReferenceCategory, ReferenceValue, ResourceType, VisualIdentity,
    ProductModel, ProcessFlow, ProcessStep, Material, InventoryLocation,
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
                company = Company.objects.first()
                company_name = company.name if company else "Company"
                all_children = []
                for p in all_plants:
                    plant_children = build_plant_tree(p, status, search)
                    search_term = (search or "").strip().lower()
                    plant_matches_search = (
                        not search_term
                        or search_term in (p.name or "").lower()
                        or search_term in (p.code or "").lower()
                    )
                    plant_matches_status = (
                        not status
                        or status == "all"
                        or (p.status or "").lower() == status.lower()
                    )
                    if not plant_matches_search and not plant_children:
                        continue
                    if status and status != "all" and not plant_matches_status and not plant_children:
                        continue
                    all_children.append(StructureChildNode(
                        id=strawberry.ID(str(p.id)),
                        type="plant",
                        name=p.name,
                        code=p.code,
                        status=p.status,
                        child_count=p.production_lines.count(),
                        children=plant_children,
                        schedule_status="Scheduled",
                    ))
                unassigned_lines = ProductionLine.objects.filter(plant__isnull=True)
                if status and status != "all":
                    unassigned_lines = unassigned_lines.filter(status__iexact=status)
                unassigned_children = []
                search_term = (search or "").strip().lower()
                for line in unassigned_lines:
                    if search_term and search_term not in (line.name or "").lower() and search_term not in (line.code or "").lower():
                        continue
                    unassigned_children.append(StructureChildNode.from_tree({
                        "id": str(line.id),
                        "type": "productionLine",
                        "name": line.name,
                        "code": line.code,
                        "status": line.status,
                        "childCount": 0,
                        "children": [],
                        "scheduleStatus": "Missing Schedule",
                    }))
                if unassigned_children:
                    all_children.append(StructureChildNode(
                        id=strawberry.ID("unassigned-lines"),
                        type="lineGroup",
                        name="Unassigned Lines",
                        code="",
                        status="ACTIVE",
                        child_count=len(unassigned_children),
                        children=unassigned_children,
                        schedule_status="Missing Schedule",
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
    def plants(self, company_id: Optional[str] = None, status: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[PlantNode]:
        qs = Plant.objects.select_related("company").all().annotate(
            line_count_annotated=Count("production_lines", distinct=True),
            department_count_annotated=Count("production_lines__department_assignments__department", distinct=True),
            group_count_annotated=Count("production_lines__department_assignments__department__resource_groups", distinct=True),
            resource_count_annotated=Count("production_lines__department_assignments__department__resource_groups__resources", distinct=True),
        )
        if company_id:
            qs = qs.filter(company_id=company_id)
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
                ).select_related("company").get(id=id)
            )
        except Plant.DoesNotExist:
            return None

    # ── ProductionLine ──
    @strawberry.field
    def production_lines(self, plant_id: Optional[str] = None, status: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[ProductionLineNode]:
        qs = ProductionLine.objects.select_related("plant", "plant__company").all()
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
            return ProductionLineNode.from_db(ProductionLine.objects.select_related("plant", "plant__company").get(id=id))
        except ProductionLine.DoesNotExist:
            return None

    @strawberry.field
    def product_models_by_family(self, family_id: str) -> list[ProductModelByFamilyNode]:
        try:
            family = ReferenceValue.objects.get(id=family_id, category__code="production_family")
        except ReferenceValue.DoesNotExist:
            return []
        qs = ReferenceValue.objects.filter(
            category__code="product_model",
            is_active=True,
            metadata__family=family.code,
        ).order_by("sort_order", "name")
        return [ProductModelByFamilyNode.from_reference(model, str(family.id)) for model in qs]

    # ── Department ──
    @strawberry.field
    def departments(self, plant_id: Optional[str] = None, production_line_id: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[DepartmentNode]:
        qs = DepartmentService.list(status=status, search=search, production_line_id=production_line_id)
        if plant_id:
            qs = qs.filter(plant_id=plant_id)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [DepartmentNode.from_db(d) for d in qs]

    @strawberry.field
    def department(self, id: str) -> Optional[DepartmentNode]:
        try:
            return DepartmentNode.from_db(DepartmentService.get(id))
        except DepartmentServiceError:
            return None

    @strawberry.field
    def department_assignments(self, department_id: str) -> Optional[DepartmentNode]:
        try:
            return DepartmentNode.from_db(DepartmentService.get(department_id))
        except DepartmentServiceError:
            return None

    # ── ResourceGroup ──
    @strawberry.field
    def resource_groups(self, department_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[ResourceGroupNode]:
        qs = ResourceGroup.objects.select_related("department", "department__plant").all()
        if department_id:
            qs = qs.filter(department_id=department_id)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [ResourceGroupNode.from_db(g) for g in qs]

    @strawberry.field
    def resource_group(self, id: str) -> Optional[ResourceGroupNode]:
        try:
            return ResourceGroupNode.from_db(ResourceGroup.objects.select_related("department", "department__plant").get(id=id))
        except ResourceGroup.DoesNotExist:
            return None

    @strawberry.field
    def resource_group_flow_usages(self, resource_group_id: str) -> list["ResourceGroupFlowUsageNode"]:
        from manufacturing.models import RoutingStep
        steps = RoutingStep.objects.filter(
            resource_group_id=resource_group_id
        ).select_related(
            "routing", "routing__production_line"
        ).order_by("routing__production_line__name", "routing__version", "sequence")
        return [ResourceGroupFlowUsageNode.from_db(s) for s in steps]

    # ── Resource ──
    @strawberry.field
    def resources(self, resource_group_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[ResourceNode]:
        qs = Resource.objects.select_related("resource_group", "resource_group__department", "resource_group__department__plant").all()
        if resource_group_id:
            qs = qs.filter(resource_group_id=resource_group_id)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [ResourceNode.from_db(r) for r in qs]

    @strawberry.field
    def resource(self, id: str) -> Optional[ResourceNode]:
        try:
            return ResourceNode.from_db(Resource.objects.select_related("resource_group", "resource_group__department", "resource_group__department__plant").get(id=id))
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
        include_staff_users = table_type in (None, "staff_user")
        include_staff_assignments = table_type in (None, "staff_assignment")
        if include_staff_users:
            users = User.objects.select_related("role_profile").order_by("username")
            if active_only:
                users = users.filter(is_active=True)
            result.extend(LegacyReferenceItemNode.from_user(user) for user in users)
        if include_staff_assignments:
            roles = UserRole.objects.select_related("user").order_by("user__username")
            if active_only:
                roles = roles.filter(user__is_active=True)
            result.extend(LegacyReferenceItemNode.from_user_role(role) for role in roles)
        if table_type in ("staff_user", "staff_assignment"):
            return result
        cats_qs = ReferenceCategory.objects.all()
        if table_type:
            category_code = TABLE_TYPE_TO_CATEGORY.get(table_type, table_type)
            cats_qs = cats_qs.filter(code=category_code)
        values_by_category: list[tuple[ReferenceCategory, str, list[ReferenceValue]]] = []
        reference_ids: set[int] = set()
        for cat in cats_qs:
            tt = table_type or CATEGORY_TO_TABLE_TYPE.get(cat.code, cat.code)
            vals = ReferenceValue.objects.filter(category=cat)
            if active_only:
                vals = vals.filter(is_active=True)
            values = list(vals.select_related("category").order_by("sort_order"))
            values_by_category.append((cat, tt, values))
            reference_ids.update(value.id for value in values)
        usage_counts = build_reference_usage_counts(reference_ids)
        for _cat, tt, values in values_by_category:
            for value in values:
                result.append(LegacyReferenceItemNode.from_ref_value(
                    value,
                    tt,
                    usage_impact=_format_reference_usage(value.id, tt, usage_counts),
                ))
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

    # ── Routing ──

    @strawberry.field
    def production_line_routing_summary(self, production_line_id: str) -> RoutingSummaryNode:
        data = RoutingService.get_routing_summary(production_line_id)
        return RoutingSummaryNode(
            routing_id=strawberry.ID(data["routing_id"]) if data["routing_id"] else None,
            status=data["status"],
            version=data["version"],
            routing_scope=data.get("routing_scope"),
            message=data.get("message"),
            sequence_count=data["sequence_count"],
            first_department_name=data["first_department_name"],
            last_department_name=data["last_department_name"],
            bottleneck_step_name=data["bottleneck_step_name"],
            bottleneck_resource_group_name=data["bottleneck_resource_group_name"],
            constraint_status=data["constraint_status"],
            updated_at=data["updated_at"],
        )

    @strawberry.field
    def production_line_flow_context(self, production_line_id: str, product_model_id: Optional[str] = None) -> ProductionLineFlowContextNode:
        return ProductionLineFlowContextNode.from_service(
            RoutingService.get_line_flow_context(production_line_id, product_model_id)
        )

    @strawberry.field
    def materials(self, status: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[MaterialNode]:
        qs = Material.objects.all()
        if status and status != "all":
            qs = qs.filter(status=status)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [MaterialNode.from_db(material) for material in qs]

    @strawberry.field
    def inventory_locations(self, plant_id: Optional[str] = None, status: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[InventoryLocationNode]:
        qs = InventoryLocation.objects.select_related("plant").all()
        if plant_id:
            qs = qs.filter(plant_id=plant_id)
        if status and status != "all":
            qs = qs.filter(status=status)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [InventoryLocationNode.from_db(location) for location in qs]

    @strawberry.field
    def routings(self, production_line_id: Optional[str] = None, product_model_id: Optional[str] = None, product_family_id: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> list[RoutingNode]:
        from manufacturing.models import Routing
        qs = Routing.objects.select_related(
            "production_line", "product_model", "product_family"
        ).prefetch_related("steps__department", "steps__resource_group", "steps__resource", "steps__standard_work").all()
        if production_line_id:
            qs = qs.filter(production_line_id=production_line_id)
        if product_model_id:
            qs = qs.filter(product_model_id=product_model_id)
        if product_family_id:
            qs = qs.filter(product_family_id=product_family_id)
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return [RoutingNode.from_db(r) for r in qs]

    @strawberry.field
    def routing(self, id: str) -> Optional[RoutingNode]:
        from manufacturing.models import Routing
        try:
            r = Routing.objects.select_related(
                "production_line", "product_model", "product_family"
            ).prefetch_related(
                "steps__department", "steps__resource_group", "steps__resource", "steps__standard_work"
            ).get(id=id)
            return RoutingNode.from_db(r)
        except Routing.DoesNotExist:
            return None

    @strawberry.field
    def routing_step_capacities(self, routing_id: str, demand: int = 1000, available_hours: float = 8.0) -> list[StepCapacityNode]:
        from manufacturing.models import RoutingStep
        steps = list(RoutingStep.objects.filter(routing_id=routing_id).select_related("department", "resource_group").order_by("sequence"))
        results = []
        for s in steps:
            cap = RoutingService.calculate_step_capacity(s, demand, available_hours)
            results.append(StepCapacityNode(
                sequence=cap["sequence"],
                department_name=cap["department_name"],
                cycle_time_sec=cap["cycle_time_sec"],
                available_time_sec=cap["available_time_sec"],
                demand_units=cap["demand_units"],
                takt_time_sec=cap["takt_time_sec"],
                capacity_units=cap["capacity_units"],
                load_percent=cap["load_percent"],
                capacity_gap_units=cap["capacity_gap_units"],
                is_bottleneck=cap["is_bottleneck"],
            ))
        return results

    @strawberry.field
    def capacity_plans(
        self,
        plant_id: Optional[str] = None,
        production_line_id: Optional[str] = None,
        product_model_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[CapacityPlanNode]:
        from manufacturing.models import CapacityPlan
        qs = CapacityPlan.objects.select_related(
            "plant", "production_line", "product_model", "routing_version", "created_by", "updated_by"
        ).prefetch_related("inputs", "result__bottleneck_step__standard_work", "result__bottleneck_resource").all()
        if plant_id:
            qs = qs.filter(plant_id=plant_id)
        if production_line_id:
            qs = qs.filter(production_line_id=production_line_id)
        if product_model_id:
            qs = qs.filter(product_model_id=product_model_id)
        if status:
            qs = qs.filter(status=status)
        return [CapacityPlanNode.from_db(plan) for plan in qs[:100]]

    @strawberry.field
    def capacity_plan_detail(self, id: str) -> Optional[CapacityPlanNode]:
        from manufacturing.models import CapacityPlan
        try:
            plan = CapacityPlan.objects.select_related(
                "plant", "production_line", "product_model", "routing_version", "created_by", "updated_by"
            ).prefetch_related("inputs", "result__bottleneck_step__standard_work", "result__bottleneck_resource").get(id=id)
            return CapacityPlanNode.from_db(plan)
        except CapacityPlan.DoesNotExist:
            return None

    @strawberry.field
    def capacity_plan_inputs(self, id: str) -> Optional[CapacityPlanInputNode]:
        from manufacturing.models import CapacityPlanInput
        try:
            return CapacityPlanInputNode.from_db(CapacityPlanInput.objects.get(capacity_plan_id=id))
        except CapacityPlanInput.DoesNotExist:
            return None

    @strawberry.field
    def capacity_plan_results(self, id: str) -> Optional[CapacityPlanResultNode]:
        from manufacturing.models import CapacityPlanResult
        try:
            result = CapacityPlanResult.objects.select_related("bottleneck_step__standard_work", "bottleneck_resource").get(capacity_plan_id=id)
            return CapacityPlanResultNode.from_db(result)
        except CapacityPlanResult.DoesNotExist:
            return None

    @strawberry.field
    def yamazumi_balance(self, capacity_plan_id: str) -> Optional[CapacityYamazumiNode]:
        from manufacturing.models import CapacityPlanResult
        try:
            result = CapacityPlanResult.objects.get(capacity_plan_id=capacity_plan_id)
            return CapacityYamazumiNode.from_dict(result.yamazumi_json or {})
        except CapacityPlanResult.DoesNotExist:
            return None

    @strawberry.field
    def capacity_scenarios(self, capacity_plan_id: str) -> list[CapacityScenarioNode]:
        from manufacturing.models import CapacityScenario
        return [
            CapacityScenarioNode.from_db(scenario)
            for scenario in CapacityScenario.objects.filter(capacity_plan_id=capacity_plan_id)
        ]

    @strawberry.field
    def yamazumi_analysis(
        self,
        routing_id: str,
        planned_quantity: int,
        available_time_min: float,
        break_time_min: float = 0,
        downtime_min: float = 0,
        operators: int = 1,
    ) -> YamazumiAnalysisNode:
        from manufacturing.models import Routing

        try:
            routing = Routing.objects.select_related("production_line", "product_model").prefetch_related(
                "steps__department", "steps__resource_group", "steps__resource", "steps__standard_work"
            ).get(id=routing_id)
        except Routing.DoesNotExist:
            return YamazumiAnalysisNode(
                ok=False,
                message="Complete routing in Production Structure → Flow.",
                planned_quantity=planned_quantity,
                net_available_time_sec=0,
                takt_time_sec=0,
                total_work_content_sec=0,
                balance_loss_percent=0,
                operators_required=0,
            )

        steps = list(routing.steps.all().order_by("sequence"))
        if not steps:
            return YamazumiAnalysisNode(
                ok=False,
                message="Complete routing in Production Structure → Flow.",
                routing_id=strawberry.ID(str(routing.id)),
                routing_status=routing.status,
                routing_version=routing.version,
                production_line_id=strawberry.ID(str(routing.production_line_id)),
                product_model_id=strawberry.ID(str(routing.product_model_id)) if routing.product_model_id else None,
                planned_quantity=planned_quantity,
                net_available_time_sec=0,
                takt_time_sec=0,
                total_work_content_sec=0,
                balance_loss_percent=0,
                operators_required=0,
            )

        net_available_time_sec = max(0.0, (available_time_min - break_time_min - downtime_min) * 60)
        if planned_quantity <= 0 or net_available_time_sec <= 0:
            return YamazumiAnalysisNode(
                ok=False,
                message="Complete capacity planning inputs.",
                routing_id=strawberry.ID(str(routing.id)),
                routing_status=routing.status,
                routing_version=routing.version,
                production_line_id=strawberry.ID(str(routing.production_line_id)),
                product_model_id=strawberry.ID(str(routing.product_model_id)) if routing.product_model_id else None,
                planned_quantity=planned_quantity,
                net_available_time_sec=net_available_time_sec,
                takt_time_sec=0,
                total_work_content_sec=0,
                balance_loss_percent=0,
                operators_required=0,
            )

        takt_time_sec = net_available_time_sec / planned_quantity
        step_nodes: list[YamazumiStepNode] = []
        total_work_content_sec = 0.0
        bottleneck = None
        overloaded: list[str] = []
        total_required_operators = 0

        for step in steps:
            work_content_sec = float(step.cycle_time_sec or 0) + float(step.setup_time_sec or 0) + float(step.changeover_time_sec or 0)
            total_work_content_sec += work_content_sec
            load_percent = (work_content_sec / takt_time_sec * 100) if takt_time_sec else 0
            is_overloaded = load_percent > 100
            required_operators = max(1, int(step.required_operators or 1))
            total_required_operators += required_operators
            if is_overloaded:
                overloaded.append(step.resource.name if step.resource else step.resource_group.name if step.resource_group else f"Step {step.sequence}")
            if bottleneck is None or work_content_sec > bottleneck[1]:
                bottleneck = (step, work_content_sec)
            step_nodes.append(YamazumiStepNode(
                sequence=step.sequence,
                department_name=step.department.name if step.department else None,
                resource_group_name=step.resource_group.name if step.resource_group else None,
                resource_name=step.resource.name if step.resource else None,
                standard_work_name=step.standard_work.name if step.standard_work else None,
                cycle_time_sec=float(step.cycle_time_sec or 0),
                setup_time_sec=float(step.setup_time_sec or 0),
                changeover_time_sec=float(step.changeover_time_sec or 0),
                work_content_sec=work_content_sec,
                takt_time_sec=takt_time_sec,
                load_percent=load_percent,
                required_operators=required_operators,
                is_bottleneck=False,
                is_overloaded=is_overloaded,
            ))

        bottleneck_step = bottleneck[0] if bottleneck else None
        if bottleneck_step:
            for node in step_nodes:
                if node.sequence == bottleneck_step.sequence:
                    node.is_bottleneck = True
                    break
        max_station_work = max((step.work_content_sec for step in step_nodes), default=0)
        ideal_total = max_station_work * len(step_nodes)
        balance_loss_percent = ((ideal_total - total_work_content_sec) / ideal_total * 100) if ideal_total else 0
        operators_required = max(total_required_operators, int((total_work_content_sec / takt_time_sec) + 0.999999))

        return YamazumiAnalysisNode(
            ok=True,
            message="Yamazumi analysis ready.",
            routing_id=strawberry.ID(str(routing.id)),
            routing_status=routing.status,
            routing_version=routing.version,
            production_line_id=strawberry.ID(str(routing.production_line_id)),
            product_model_id=strawberry.ID(str(routing.product_model_id)) if routing.product_model_id else None,
            planned_quantity=planned_quantity,
            net_available_time_sec=net_available_time_sec,
            takt_time_sec=takt_time_sec,
            total_work_content_sec=total_work_content_sec,
            bottleneck_step_name=(
                bottleneck_step.standard_work.name if bottleneck_step and bottleneck_step.standard_work else
                bottleneck_step.resource_group.name if bottleneck_step and bottleneck_step.resource_group else
                f"Step {bottleneck_step.sequence}" if bottleneck_step else ""
            ),
            balance_loss_percent=balance_loss_percent,
            operators_required=operators_required,
            overloaded_resources=overloaded,
            steps=step_nodes,
        )
