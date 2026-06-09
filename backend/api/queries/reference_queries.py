import strawberry
import typing
import strawberry as strawberry_decorator
from collections import Counter, defaultdict
from typing import Optional
from django.db.models import Q
from django.contrib.auth.models import User

from manufacturing.models import (
    Company, Plant, Department, ProductionLine, ResourceGroup, Resource,
    UserRole, ReferenceCategory, ReferenceValue, ResourceType, VisualIdentity,
)
from manufacturing.domain.reference_table_service import TABLE_TYPE_TO_CATEGORY as REF_TABLE_TYPE_TO_CATEGORY
from api.types.manufacturing import (
    ReferenceCategoryNode, ReferenceValueNode, ResourceTypeNode, VisualIdentityNode,
    ReferenceTableNode, ReferenceTableCatalogGroupNode, ReferenceTableCatalogEntryNode,
    PaginatedReferenceCategoryResponse, PaginatedReferenceValueResponse,
    PaginatedVisualIdentityResponse,
)


def _validate_pagination(limit, offset):
    limit = limit or 50
    limit = min(limit, 500)
    limit = max(limit, 1)
    offset = offset or 0
    offset = max(offset, 0)
    return limit, offset


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


# Imported from reference_table_service (single source of truth):
#   TABLE_TYPE_TO_CATEGORY as REF_TABLE_TYPE_TO_CATEGORY
TABLE_TYPE_TO_CATEGORY = REF_TABLE_TYPE_TO_CATEGORY

# ── Reference Table Catalog (group structure, labels, descriptions) ──
# Mirrors the frontend's TYPE_GROUPS / GROUP_LABELS constants.
# This is the single source of truth for which tables belong to which group.

REFERENCE_TABLE_GROUPS: list[tuple[str, str, list[str]]] = [
    ("organization", "Organization", ["production_calendar", "shift_pattern", "language", "timezone", "industry_type"]),
    ("manufacturing", "Manufacturing", ["manufacturing_type", "work_center_type", "machine_type", "operation_code", "routing_type", "product_model", "production_family"]),
    ("material_flow", "Material Flow", ["material_category", "inventory_type", "kanban_type", "container_type", "unit_type"]),
    ("lean_quality", "Lean / Quality", ["downtime_code", "defect_code", "scrap_reason", "kaizen_category", "priority", "label_badge", "maintenance_type", "material_flow_type", "process_type"]),
    ("people", "People", ["skill_type", "role", "admin_department", "shift_team", "staff_user", "staff_assignment"]),
]

REFERENCE_TABLE_LABELS: dict[str, str] = {
    "production_calendar": "Production Calendars",
    "shift_pattern": "Shift Patterns",
    "language": "Languages",
    "timezone": "Timezones",
    "industry_type": "Industry Types",
    "manufacturing_type": "Manufacturing Types",
    "work_center_type": "Work Centers",
    "machine_type": "Machine Types",
    "operation_code": "Operation Codes",
    "routing_type": "Routing Types",
    "product_model": "Product Models",
    "production_family": "Production Families",
    "material_category": "Material Categories",
    "inventory_type": "Inventory Types",
    "kanban_type": "Kanban Types",
    "container_type": "Container Types",
    "unit_type": "Unit Types",
    "downtime_code": "Downtime Reasons",
    "defect_code": "Quality Defect Types",
    "scrap_reason": "Scrap Reasons",
    "kaizen_category": "Lean / Quality Values",
    "priority": "Priorities",
    "label_badge": "Labels / Badges",
    "maintenance_type": "Maintenance Types",
    "material_flow_type": "Material Flow Types",
    "process_type": "Process Types",
    "skill_type": "Skill Types",
    "role": "Roles",
    "admin_department": "Administrative Departments",
    "shift_team": "Shift Teams",
    "staff_user": "Staff Users",
    "staff_assignment": "Staff Assignments",
}

REFERENCE_TABLE_LABELS_SINGULAR: dict[str, str] = {
    "production_calendar": "Production Calendar",
    "shift_pattern": "Shift Pattern",
    "language": "Language",
    "timezone": "Timezone",
    "industry_type": "Industry Type",
    "manufacturing_type": "Manufacturing Type",
    "work_center_type": "Work Center",
    "machine_type": "Machine Type",
    "operation_code": "Operation Code",
    "routing_type": "Routing Type",
    "product_model": "Product Model",
    "production_family": "Product Family",
    "material_category": "Material Category",
    "inventory_type": "Inventory Type",
    "kanban_type": "Kanban Type",
    "container_type": "Container Type",
    "unit_type": "Unit Type",
    "downtime_code": "Downtime Reason",
    "defect_code": "Quality Defect Type",
    "scrap_reason": "Scrap Reason",
    "kaizen_category": "Lean / Quality Value",
    "priority": "Priority",
    "label_badge": "Label / Badge",
    "maintenance_type": "Maintenance Type",
    "material_flow_type": "Material Flow Type",
    "process_type": "Process Type",
    "skill_type": "Skill Type",
    "role": "Role",
    "admin_department": "Administrative Department",
    "shift_team": "Shift Team",
    "staff_user": "Staff User",
    "staff_assignment": "Staff Assignment",
}

REFERENCE_TABLE_DESCRIPTIONS: dict[str, str] = {
    "production_calendar": "Production calendar templates for scheduling",
    "shift_pattern": "Shift pattern definitions for production scheduling",
    "language": "Language options for UI and documentation",
    "timezone": "Timezone definitions for plants and lines",
    "industry_type": "Industry classification for company setup",
    "manufacturing_type": "Manufacturing process types for plant setup",
    "work_center_type": "Work center / department type classification",
    "machine_type": "Machine and equipment type classification",
    "operation_code": "Operation codes for resource capabilities and routings",
    "routing_type": "Routing type definitions for production flow",
    "product_model": "Product model definitions for production scope",
    "production_family": "Product family definitions for product models",
    "material_category": "Material categories for material flow setup",
    "inventory_type": "Inventory type classification for resource groups",
    "kanban_type": "Kanban type definitions for lean flow",
    "container_type": "Container type definitions for material handling",
    "unit_type": "Unit of measure definitions for capacity and scheduling",
    "downtime_code": "Downtime reason codes for production loss tracking",
    "defect_code": "Quality defect type codes for defect tracking",
    "scrap_reason": "Scrap reason codes for waste reporting",
    "kaizen_category": "Kaizen / improvement categories",
    "priority": "Priority levels for tasks and actions",
    "label_badge": "Label and badge definitions for visual tagging",
    "maintenance_type": "Maintenance type classification",
    "material_flow_type": "Material flow type classification",
    "process_type": "Process type classification",        "skill_type": "Skill and certification definitions for resources",
        "role": "Role definitions for permissions and assignments",
        "admin_department": "Administrative departments for user organization and access scoping",
        "shift_team": "Shift team / crew definitions",
        "staff_user": "Staff/user records sourced from the backend user workflow",
        "staff_assignment": "Relationship between staff, role, plant and department that feeds staffing and ownership readiness",
    }

REFERENCE_TABLE_SCOPE: dict[str, str] = {
    "production_calendar": "GLOBAL", "shift_pattern": "GLOBAL", "language": "GLOBAL",
    "timezone": "GLOBAL", "industry_type": "GLOBAL", "manufacturing_type": "GLOBAL",
    "work_center_type": "GLOBAL", "machine_type": "GLOBAL", "operation_code": "GLOBAL",
    "routing_type": "GLOBAL", "product_model": "GLOBAL", "production_family": "GLOBAL",
    "material_category": "GLOBAL", "inventory_type": "GLOBAL", "kanban_type": "GLOBAL",
    "container_type": "GLOBAL", "unit_type": "GLOBAL", "downtime_code": "GLOBAL",
    "defect_code": "GLOBAL", "scrap_reason": "GLOBAL", "kaizen_category": "GLOBAL",
    "priority": "GLOBAL", "label_badge": "GLOBAL", "maintenance_type": "GLOBAL",
    "material_flow_type": "GLOBAL", "process_type": "GLOBAL", "skill_type": "GLOBAL",
    "role": "GLOBAL", "admin_department": "GLOBAL", "shift_team": "PLANT", "staff_user": "PLANT", "staff_assignment": "PLANT",
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
    "admin_department": "Used by user profiles and role assignments for organizational scoping",
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
    "admin_department": "admin_department",
    "shift_team": "shift_team",
    "container_type": "container_type",
}


@strawberry.type
class ReferenceQuery:

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
    
        # ── Reference Table Catalog (Issue #1: backend-driven groups & counts) ──
    
        @strawberry.field(name="referenceTableCatalog")
        def reference_table_catalog(self) -> list["ReferenceTableCatalogGroupNode"]:
            """Return the reference table catalog with groups, table definitions, and real record counts.
            Replaces the previously frontend-hardcoded TYPE_GROUPS structure.
            """
            result = []
            for group_code, group_label, table_types in REFERENCE_TABLE_GROUPS:
                entries = []
                for tt in table_types:
                    cat_code = TABLE_TYPE_TO_CATEGORY.get(tt, tt)
    
                    # Count records: standard reference values, staff users, or staff assignments
                    if tt == "staff_user":
                        count = User.objects.filter(is_active=True).count()
                    elif tt == "staff_assignment":
                        count = UserRole.objects.filter(user__is_active=True).count()
                    else:
                        count = ReferenceValue.objects.filter(
                            category__code=cat_code, is_active=True
                        ).count()
    
                    entries.append(ReferenceTableCatalogEntryNode(
                        code=tt,
                        label=REFERENCE_TABLE_LABELS.get(tt, tt),
                        label_singular=REFERENCE_TABLE_LABELS_SINGULAR.get(tt, tt),
                        description=REFERENCE_TABLE_DESCRIPTIONS.get(tt, ""),
                        usage_context=REFERENCE_USAGE_CONTEXT.get(tt, ""),
                        record_count=count,
                        is_configurable=tt not in {"staff_user", "staff_assignment"},
                        category_code=cat_code,
                        scope=REFERENCE_TABLE_SCOPE.get(tt, "GLOBAL"),
                    ))
                result.append(ReferenceTableCatalogGroupNode(
                    code=group_code, label=group_label, tables=entries,
                ))
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
        def reference_items(
            self,
            table_type: typing.Optional[str] = None,
            active_only: typing.Optional[bool] = None,
            plant_id: typing.Optional[str] = None,
            production_line_id: typing.Optional[str] = None,
        ) -> list[LegacyReferenceItemNode]:
            """Legacy: returns ReferenceItem-style results from new ReferenceValue data.
            Supports plant/line context filtering for scoped reference types.
            - PLANT-scoped types: staff_user, staff_assignment, shift_team
            - LINE-scoped types: (reserved for future line-specific references)
            - GLOBAL types: all others (ignores plant/line filters)
            """
            from django.contrib.auth.models import User
            from manufacturing.models import UserRole
            result = []
            include_staff_users = table_type in (None, "staff_user")
            include_staff_assignments = table_type in (None, "staff_assignment")
    
            if include_staff_users:
                users = User.objects.select_related("role_profile").order_by("username")
                if active_only:
                    users = users.filter(is_active=True)
                if plant_id and table_type in (None, "staff_user"):
                    users = users.filter(role_profile__plant__icontains=plant_id)
                result.extend(LegacyReferenceItemNode.from_user(user) for user in users)
    
            if include_staff_assignments:
                roles = UserRole.objects.select_related("user").order_by("user__username")
                if active_only:
                    roles = roles.filter(user__is_active=True)
                if plant_id and table_type in (None, "staff_assignment"):
                    roles = roles.filter(plant__icontains=plant_id)
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