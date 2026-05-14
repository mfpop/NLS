from django.db.models import Prefetch
from manufacturing.models import ProductionLine, Department, ResourceGroup, Resource, ProductionLineDepartmentAssignment
from api.types.manufacturing import StructureChildNode


def _matches_search(value: str, term: str) -> bool:
    return term in (value or "").lower()


def _matches_status(value: str, status: str | None) -> bool:
    if not status or status == "all":
        return True
    return (value or "").lower() == status.lower()


def build_plant_tree(plant, status=None, search=None):
    """Build the full production tree: Plant → ProductionLines → Departments → ResourceGroups → Resources."""
    lines_qs = ProductionLine.objects.filter(plant=plant).prefetch_related(
        Prefetch(
            "department_assignments",
            queryset=ProductionLineDepartmentAssignment.objects.select_related("department").order_by("sequence", "id"),
        )
    )

    if status and status != "all":
        lines_qs = lines_qs.filter(status__iexact=status)

    # Scope departments to this plant through line assignments.
    all_depts = list(
        Department.objects.filter(line_assignments__production_line__plant=plant)
        .distinct()
        .prefetch_related(
            Prefetch(
                "resource_groups",
                queryset=ResourceGroup.objects.prefetch_related("resources"),
            )
        )
    )

    dept_by_id = {dept.id: dept for dept in all_depts}

    rg_by_dept_id = {}
    for dept in all_depts:
        rg_by_dept_id[dept.id] = list(dept.resource_groups.all())

    # Check if explicit assignments exist
    has_assignments = ProductionLineDepartmentAssignment.objects.filter(
        production_line__plant=plant
    ).exists()

    search_term = (search or "").strip().lower()

    tree_children = []
    for line in lines_qs:
        if has_assignments:
            assigned_depts = []
            for assignment in line.department_assignments.all():
                if assignment.department_id and assignment.department_id in dept_by_id:
                    assigned_depts.append(dept_by_id[assignment.department_id])
        else:
            assigned_depts = all_depts

        if search_term and not _matches_search(line.name, search_term) and not _matches_search(line.code, search_term):
            dept_match_found = False
            for dept in assigned_depts:
                if _matches_search(dept.name, search_term) or _matches_search(dept.code, search_term):
                    dept_match_found = True
                    break
            if not dept_match_found:
                continue

        dept_nodes = []
        for dept in assigned_depts:
            if not _matches_status(dept.status, status):
                continue
            rgs = rg_by_dept_id.get(dept.id, [])

            if search_term and not _matches_search(dept.name, search_term) and not _matches_search(dept.code, search_term):
                rg_match_found = False
                for rg in rgs:
                    if _matches_search(rg.name, search_term) or _matches_search(rg.code, search_term):
                        rg_match_found = True
                        break
                if not rg_match_found:
                    continue

            rg_nodes = []
            for rg in rgs:
                if not _matches_status(rg.status, status):
                    continue
                resources = [r for r in rg.resources.all() if _matches_status(r.status, status)]
                if search_term and not _matches_search(rg.name, search_term) and not _matches_search(rg.code, search_term):
                    resources = [
                        r
                        for r in resources
                        if _matches_search(r.name, search_term) or _matches_search(r.code, search_term)
                    ]
                    if not resources:
                        continue

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

                rg_nodes.append({
                    "id": str(rg.id),
                    "type": "resourceGroup",
                    "name": rg.name,
                    "code": rg.code,
                    "status": rg.status,
                    "childCount": len(res_children),
                    "children": res_children,
                    "scheduleStatus": "Missing Schedule",
                })

            if search_term and not rg_nodes and not _matches_search(dept.name, search_term) and not _matches_search(dept.code, search_term):
                continue

            dept_nodes.append({
                "id": str(dept.id),
                "type": "department",
                "name": dept.name,
                "code": dept.code,
                "status": dept.status,
                "childCount": len(rg_nodes),
                "children": rg_nodes,
                "scheduleStatus": "Missing Schedule",
            })

        if search_term and not dept_nodes and not _matches_search(line.name, search_term) and not _matches_search(line.code, search_term):
            continue

        tree_children.append({
            "id": str(line.id),
            "type": "productionLine",
            "name": line.name,
            "code": line.code,
            "status": line.status,
            "childCount": len(dept_nodes),
            "children": dept_nodes,
            "scheduleStatus": "Missing Schedule",
        })

    return [StructureChildNode.from_tree(c) for c in tree_children]


