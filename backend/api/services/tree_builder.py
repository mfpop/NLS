from django.db.models import Prefetch
from manufacturing.models import Department, ProductionLine, ResourceGroup, Resource, ProductionLineResourceGroup
from api.types.manufacturing import StructureChildNode


def _matches_search(value: str, term: str) -> bool:
    return term in (value or "").lower()


def _matches_status(value: str, status: str | None) -> bool:
    if not status or status == "all":
        return True
    return (value or "").lower() == status.lower()


def build_org_tree(plant, status=None, search=None):
    """Build the organizational tree: Plant → Departments → ResourceGroups → Resources.

    Production lines do not appear in this tree. Departments own ResourceGroups.
    """
    dept_qs = Department.objects.filter(plant=plant).prefetch_related(
        Prefetch(
            "resource_groups",
            queryset=ResourceGroup.objects.prefetch_related("resources"),
        )
    )

    if status and status != "all":
        dept_qs = dept_qs.filter(status__iexact=status)

    search_term = (search or "").strip().lower()
    tree_children = []

    for dept in dept_qs:
        rgs = list(dept.resource_groups.all())

        if search_term and not _matches_search(dept.name, search_term) and not _matches_search(dept.code, search_term):
            rg_match_found = any(
                _matches_search(rg.name, search_term) or _matches_search(rg.code, search_term)
                for rg in rgs
            )
            if not rg_match_found:
                continue

        rg_nodes = []
        for rg in rgs:
            if not _matches_status(rg.status, status):
                continue
            resources = [r for r in rg.resources.all() if _matches_status(r.status, status)]

            if search_term and not _matches_search(rg.name, search_term) and not _matches_search(rg.code, search_term):
                matched = [r for r in resources if _matches_search(r.name, search_term) or _matches_search(r.code, search_term)]
                if not matched:
                    continue
                resources = matched

            rg_nodes.append({
                "id": str(rg.id),
                "type": "resourceGroup",
                "name": rg.name,
                "code": rg.code,
                "status": rg.status,
                "childCount": len(resources),
                "children": [{
                    "id": str(r.id),
                    "type": "resource",
                    "name": r.name,
                    "code": r.code,
                    "status": r.status,
                    "childCount": 0,
                    "children": [],
                    "scheduleStatus": "Missing Schedule",
                } for r in resources],
                "scheduleStatus": "Missing Schedule",
            })

        if search_term and not rg_nodes and not _matches_search(dept.name, search_term) and not _matches_search(dept.code, search_term):
            continue

        tree_children.append({
            "id": str(dept.id),
            "type": "department",
            "name": dept.name,
            "code": dept.code,
            "status": dept.status,
            "childCount": len(rg_nodes),
            "children": rg_nodes,
            "scheduleStatus": "Missing Schedule",
        })

    return [StructureChildNode.from_tree(c) for c in tree_children]


def build_flow_tree(plant, status=None, search=None):
    """Build the flow tree: Plant → ProductionLines → Assigned Resource Groups → ResourceGroups → Resources.

    Excludes plants with plant_type='Warehouse'. Shows lines even with zero assigned RGs.
    Department is metadata on Resource Group rows, not a separate tree level.
    """
    if getattr(plant, "plant_type", "").lower() == "warehouse":
        return []

    lines_qs = ProductionLine.objects.filter(plant=plant).prefetch_related(
        Prefetch(
            "assigned_resource_groups",
            queryset=ProductionLineResourceGroup.objects.select_related(
                "resource_group", "resource_group__department",
            ).order_by("sequence", "id"),
        )
    )

    if status and status != "all":
        lines_qs = lines_qs.filter(status__iexact=status)

    search_term = (search or "").strip().lower()

    tree_children = []
    for line in lines_qs:
        assignments = list(line.assigned_resource_groups.all())

        if search_term and not _matches_search(line.name, search_term) and not _matches_search(line.code, search_term):
            rg_match_found = any(
                a.resource_group and (_matches_search(a.resource_group.name, search_term) or _matches_search(a.resource_group.code, search_term))
                for a in assignments
            )
            if not rg_match_found:
                continue

        assigned_group_nodes = []
        for a in assignments:
            rg = a.resource_group
            if not rg or not _matches_status(rg.status, status):
                continue

            resources = list(rg.resources.all()) if rg.id else []
            resources = [r for r in resources if _matches_status(r.status, status)]

            if search_term and not _matches_search(rg.name, search_term) and not _matches_search(rg.code, search_term):
                matched_resources = [
                    r for r in resources
                    if _matches_search(r.name, search_term) or _matches_search(r.code, search_term)
                ]
                if not matched_resources:
                    continue
                resources = matched_resources

            res_children = [
                {
                    "id": str(r.id),
                    "type": "resource",
                    "name": r.name,
                    "code": r.code,
                    "status": r.status,
                    "childCount": 0,
                    "children": [],
                    "scheduleStatus": "Missing Schedule",
                }
                for r in resources
            ]

            dept_name = rg.department.name if rg.department else ""
            assignment_status = "active" if a.is_active else "inactive"

            assigned_group_nodes.append({
                "id": str(rg.id),
                "type": "resourceGroup",
                "name": rg.name,
                "code": rg.code,
                "status": assignment_status,
                "departmentName": dept_name or None,
                "childCount": len(res_children),
                "children": res_children,
                "scheduleStatus": "Missing Schedule",
            })

        container = {
            "id": f"assigned_{line.id}",
            "type": "assignedGroup",
            "name": "Assigned Resource Groups",
            "code": "",
            "status": "active",
            "childCount": len(assigned_group_nodes),
            "children": assigned_group_nodes,
            "scheduleStatus": "Missing Schedule",
        }

        tree_children.append({
            "id": str(line.id),
            "type": "productionLine",
            "name": line.name,
            "code": line.code,
            "status": line.status,
            "childCount": 1,
            "children": [container],
            "scheduleStatus": "Missing Schedule",
        })

    return [StructureChildNode.from_tree(c) for c in tree_children]



def build_plant_tree(plant, status=None, search=None):
    """Legacy wrapper — defaults to flow tree. Use build_flow_tree for flow, build_org_tree for org."""
    return build_flow_tree(plant, status, search)
