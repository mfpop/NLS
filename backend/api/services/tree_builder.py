from itertools import groupby
from django.db.models import Prefetch
from manufacturing.models import ProductionLine, Department, ResourceGroup, Resource, ProductionLineDepartmentAssignment
from api.types.manufacturing import StructureChildNode


def build_plant_tree(plant, status=None):
    """Build the full production tree: Plant → ProductionLines → Departments → ResourceGroups → Resources."""
    lines_qs = ProductionLine.objects.filter(plant=plant)
    if status and status != "all":
        lines_qs = lines_qs.filter(status=status)

    # Prefetch all data for this plant
    all_depts = list(Department.objects.filter(
        resource_groups__isnull=False
    ).distinct().prefetch_related(
        Prefetch("resource_groups", queryset=ResourceGroup.objects.prefetch_related("resources"))
    ))

    all_rgs = list(ResourceGroup.objects.filter(
        department__in=all_depts
    ).prefetch_related("resources"))

    # Check if explicit assignments exist
    has_assignments = ProductionLineDepartmentAssignment.objects.filter(
        production_line__plant=plant
    ).exists()

    tree_children = []
    for line in lines_qs:
        if has_assignments:
            assigned_depts = [
                a.department for a in line.department_assignments.select_related("department").all()
                if a.department
            ]
        else:
            assigned_depts = all_depts

        dept_nodes = []
        for dept in assigned_depts:
            rgs = [rg for rg in all_rgs if rg.department_id == dept.id]
            rg_nodes = []
            for rg in rgs:
                res_children = [
                    {
                        "id": str(r.id), "type": "resource",
                        "name": r.name, "code": r.code, "status": r.status,
                        "childCount": 0, "children": [],
                        "scheduleStatus": "Missing Schedule",
                    }
                    for r in rg.resources.all()
                ]
                rg_nodes.append({
                    "id": str(rg.id), "type": "resourceGroup",
                    "name": rg.name, "code": rg.code, "status": rg.status,
                    "childCount": len(res_children), "children": res_children,
                    "scheduleStatus": "Missing Schedule",
                })
            dept_nodes.append({
                "id": str(dept.id), "type": "department",
                "name": dept.name, "code": dept.code, "status": dept.status,
                "childCount": len(rg_nodes), "children": rg_nodes,
                "scheduleStatus": "Missing Schedule",
            })
        tree_children.append({
            "id": str(line.id), "type": "productionLine",
            "name": line.name, "code": line.code, "status": line.status,
            "childCount": len(dept_nodes), "children": dept_nodes,
            "scheduleStatus": "Missing Schedule",
        })
    return [StructureChildNode.from_tree(c) for c in tree_children]
