import strawberry
from typing import Optional
from django.db.models import Prefetch, Q

from api.types.manufacturing import (
    ManufacturingSnapshot, PlantNode, DepartmentNode,
    ProductionLineNode, ProductionLinePage, ResourceGroupNode, ResourceNode, ReferenceTableNode,
    ProductionStructureNode, ProductionLineStructureNode, DepartmentStructureNode,
    ResourceGroupStructureNode, ResourceStructureNode,
    DataManagementOverview, DataManagementPlantNode, DataManagementKpis,
    DataManagementTreeRoot, DataManagementTreeChild,
    DataManagementNavCounts, DataManagementSystemHealth,
    ProfileNode, CompanyNode, ConfigOptionNode, ReferenceItemNode,
)
from manufacturing.models import (
    Plant, Department, ProductionLine,
    ResourceGroup, Resource, ReferenceTable, Profile, Company,
    ConfigOption, ReferenceItem,
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
    def production_lines(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> ProductionLinePage:
        qs = ProductionLine.objects.all()
        if status and status != "all":
            qs = qs.filter(status=status)
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(code__icontains=search)
        total = qs.count()
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        items = [ProductionLineNode.from_db(l) for l in qs]
        page = (offset // limit) + 1 if limit and offset is not None else 1
        total_pages = max(1, (total + limit - 1) // limit) if limit else 1
        return ProductionLinePage(
            items=items, total_count=total,
            page=page, page_size=limit or total,
            total_pages=total_pages,
        )

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
            qs = qs.filter(name__icontains=search) | qs.filter(code__icontains=search)
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
    def production_structure_tree(
        self,
        plant_id: Optional[str] = None,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Optional[ProductionStructureNode]:
        """Build hierarchy: Plant → ProductionLine → Department (M2M) → ResourceGroup → Resource."""
        # Resolve plant — if None, use first active plant
        if plant_id:
            try:
                plant = Plant.objects.get(id=plant_id)
            except Plant.DoesNotExist:
                return None
        else:
            plant = Plant.objects.filter(status="active").first()
            if not plant:
                return None

        # Build querysets scoped to this plant
        lines_qs = ProductionLine.objects.filter(plant=plant)
        rgs_qs = ResourceGroup.objects.filter(department__production_lines__plant=plant).distinct()
        res_qs = Resource.objects.filter(resource_group__department__production_lines__plant=plant).distinct()

        # Status filtering
        if status and status != "all":
            lines_qs = lines_qs.filter(status=status)
            rgs_qs = rgs_qs.filter(status=status)
            res_qs = res_qs.filter(status=status)

        # Search filtering
        if search:
            lines_qs = lines_qs.filter(
                Q(name__icontains=search) | Q(code__icontains=search)
            )
            rgs_qs = rgs_qs.filter(
                Q(name__icontains=search) | Q(code__icontains=search)
            )
            res_qs = res_qs.filter(
                Q(name__icontains=search) | Q(code__icontains=search)
            )


        # Prefetch full hierarchy per production line
        lines_qs = lines_qs.prefetch_related(
            Prefetch(
                "departments",
                queryset=Department.objects.filter(
                    production_lines__plant=plant
                ).distinct().prefetch_related(
                    Prefetch(
                        "resource_groups",
                        queryset=rgs_qs.prefetch_related(
                            Prefetch("resources", queryset=res_qs)
                        )
                    )
                )
            )
        )

        # Build tree nodes
        line_nodes = []
        for line in lines_qs:
            dept_nodes = []
            for dept in line.departments.all():
                rg_nodes = []
                for rg in dept.resource_groups.all():
                    res_nodes = [
                        ResourceStructureNode(
                            id=str(r.id),
                            name=r.name,
                            code=r.code,
                            status=r.status,
                        )
                        for r in rg.resources.all()
                    ]
                    rg_nodes.append(
                        ResourceGroupStructureNode(
                            id=str(rg.id),
                            name=rg.name,
                            code=rg.code,
                            status=rg.status,
                            resources=res_nodes,
                        )
                    )
                dept_nodes.append(
                    DepartmentStructureNode(
                        id=str(dept.id),
                        name=dept.name,
                        code=dept.code,
                        status=dept.status,
                        resource_groups=rg_nodes,
                    )
                )
            line_nodes.append(
                ProductionLineStructureNode(
                    id=str(line.id),
                    name=line.name,
                    code=line.code,
                    status=line.status,
                    departments=dept_nodes,
                    plant_id=str(plant.id),
                    plant_name=plant.name,
                )
            )

        return ProductionStructureNode(
            id=str(plant.id),
            name=plant.name,
            code=plant.code,
            status=plant.status,
            production_lines=line_nodes,
        )

    @strawberry.field
    def data_management_overview(
        self,
        plant_id: Optional[str] = None,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> DataManagementOverview:
        """Unified overview for Data Management — hierarchy: Plant → Line → Dept → RG → Resource."""
        # 1. All plants (for selector)
        all_plants_qs = Plant.objects.all()
        plants = [
            DataManagementPlantNode(id=str(p.id), name=p.name, code=p.code, status=p.status)
            for p in all_plants_qs
        ]

        # 2. Selected plant
        selected_plant_obj = None
        if plant_id:
            try:
                selected_plant_obj = Plant.objects.get(id=plant_id)
            except Plant.DoesNotExist:
                if plants:
                    selected_plant_obj = all_plants_qs.first()

        selected_plant = None
        if selected_plant_obj:
            selected_plant = DataManagementPlantNode(
                id=str(selected_plant_obj.id),
                name=selected_plant_obj.name,
                code=selected_plant_obj.code,
                status=selected_plant_obj.status,
            )

        # 3. KPI counts
        if plant_id:
            pid = selected_plant_obj
            line_count = ProductionLine.objects.filter(plant=pid).count() if pid else 0
            dept_count = Department.objects.filter(production_lines__plant=pid).distinct().count() if pid else 0
            rg_count = ResourceGroup.objects.filter(department__production_lines__plant=pid).distinct().count() if pid else 0
            res_count = Resource.objects.filter(resource_group__department__production_lines__plant=pid).distinct().count() if pid else 0
        else:
            line_count = ProductionLine.objects.count()
            dept_count = Department.objects.count()
            rg_count = ResourceGroup.objects.count()
            res_count = Resource.objects.count()

        kpis = DataManagementKpis(
            production_lines=line_count,
            departments=dept_count,
            resource_groups=rg_count,
            resources=res_count,
            plant_status=selected_plant_obj.status if selected_plant_obj else "all",
        )

        def _safe_get(obj, field):
            try:
                return getattr(obj, field, None)
            except Exception:
                return None

        def build_plant_tree(plant):
            lines_qs = ProductionLine.objects.filter(plant=plant)
            all_rgs = ResourceGroup.objects.filter(department__production_lines__plant=plant).distinct()
            all_res = Resource.objects.filter(resource_group__department__production_lines__plant=plant).distinct()

            if status and status != "all":
                lines_qs = lines_qs.filter(status=status)
                all_rgs = all_rgs.filter(status=status)
                all_res = all_res.filter(status=status)

            tree_children = []
            for line in lines_qs:
                line_depts = Department.objects.filter(production_lines=line)
                dept_children = []
                for dept in line_depts:
                    dept_rgs = all_rgs.filter(department=dept)
                    rg_children = []
                    for rg in dept_rgs:
                        rg_resources = all_res.filter(resource_group=rg)
                        res_children = [
                            DataManagementTreeChild(
                                id=str(r.id), type="resource", name=r.name,
                                code=r.code, status=r.status, child_count=0, children=[],
                                schedule_status=_safe_get(r, "shift_pattern_id") and "Scheduled" or "Missing schedule",
                                schedule_source="resource",
                                shift_pattern_name=None,
                            )
                            for r in rg_resources
                        ]
                        rg_children.append(
                            DataManagementTreeChild(
                                id=str(rg.id), type="resourceGroup", name=rg.name,
                                code=rg.code, status=rg.status,
                                child_count=len(res_children), children=res_children,
                                schedule_status=_safe_get(rg, "shift_pattern_id") and "Scheduled" or "Missing schedule",
                                schedule_source="resourceGroup",
                                shift_pattern_name=None,
                            )
                        )
                    dept_children.append(
                        DataManagementTreeChild(
                            id=str(dept.id), type="department", name=dept.name,
                            code=dept.code, status=dept.status,
                            child_count=len(rg_children), children=rg_children,
                            schedule_status=_safe_get(dept, "shift_pattern_id") and "Scheduled" or "Missing schedule",
                            schedule_source="department",
                            shift_pattern_name=None,
                        )
                    )
                tree_children.append(
                    DataManagementTreeChild(
                        id=str(line.id), type="productionLine", name=line.name,
                        code=line.code, status=line.status,
                        child_count=len(dept_children), children=dept_children,
                        schedule_status=_safe_get(line, "shift_pattern_id") and "Scheduled" or "Missing schedule",
                        schedule_source="productionLine",
                        shift_pattern_name=None,
                    )
                )
            return tree_children

        # 4. Production tree (hierarchical)
        tree_root = None
        if selected_plant_obj and plant_id:
            # Single-plant tree
            tree_children = build_plant_tree(selected_plant_obj)
            plant_sp = _safe_get(selected_plant_obj, "shift_pattern_id")
            tree_root = DataManagementTreeRoot(
                id=str(selected_plant_obj.id), type="plant",
                name=selected_plant_obj.name, code=selected_plant_obj.code,
                status=selected_plant_obj.status,
                child_count=len(tree_children), children=tree_children,
                schedule_status="Scheduled" if plant_sp else "Missing schedule",
                schedule_source="plant",
                shift_pattern_name=None,
            )
        elif not plant_id:
            # Company-root tree: company as root, all plants as children
            company = Company.objects.first()
            company_id = str(company.id) if company else "company"
            company_name = company.name if company else "Company"
            all_children = []
            for p in all_plants_qs:
                plant_lines = build_plant_tree(p)
                plant_sp = _safe_get(p, "shift_pattern_id")
                all_children.append(
                    DataManagementTreeChild(
                        id=str(p.id), type="plant", name=p.name,
                        code=p.code, status=p.status,
                        child_count=len(plant_lines), children=plant_lines,
                        schedule_status="Scheduled" if plant_sp else "Missing schedule",
                        schedule_source="plant",
                        shift_pattern_name=None,
                    )
                )
            tree_root = DataManagementTreeRoot(
                id=company_id, type="company",
                name=company_name,
                code="", status="active",
                child_count=len(all_children), children=all_children,
            )

        # 5. Navigation counts (global)
        nav_counts = DataManagementNavCounts(
            plants=Plant.objects.count(),
            production_lines=ProductionLine.objects.count(),
            departments=Department.objects.count(),
            resource_groups=ResourceGroup.objects.count(),
            resources=Resource.objects.count(),
            reference_tables=ReferenceTable.objects.count(),
        )

        # 6. System health (global)
        health = DataManagementSystemHealth(
            running_lines=ProductionLine.objects.filter(status="active").count(),
            resources_down=Resource.objects.filter(op_status="Down").count(),
            high_utilization_resources=Resource.objects.filter(utilization__gte=85.0).count(),
        )

        return DataManagementOverview(
            selected_plant=selected_plant,
            plants=plants,
            kpis=kpis,
            tree=tree_root,
            navigation_counts=nav_counts,
            system_health=health,
        )

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

    @strawberry.field
    def profile(self, info: strawberry.types.Info) -> Optional[ProfileNode]:
        user = info.context.user
        if user is None:
            return None
        profile = getattr(user, "profile", None)
        if not profile:
            profile = Profile.objects.create(
                user=user,
                name=user.get_full_name() or user.username,
                role="",
                email=user.email,
            )
        return ProfileNode.from_db(profile)

    @strawberry.field
    def company(self, id: Optional[str] = None) -> Optional[CompanyNode]:
        try:
            if id:
                company = Company.objects.get(id=id)
            else:
                company = Company.objects.first()
            return CompanyNode.from_db(company) if company else None
        except Company.DoesNotExist:
            return None

    @strawberry.field
    def config_options(self, category: Optional[str] = None) -> list[ConfigOptionNode]:
        qs = ConfigOption.objects.all()
        if category:
            qs = qs.filter(category=category)
        return [ConfigOptionNode(
            category=o.category, value=o.value, label=o.label, sort_order=o.sort_order,
        ) for o in qs]

    @strawberry.field
    def reference_items(self, table_type: Optional[str] = None, active_only: Optional[bool] = True) -> list[ReferenceItemNode]:
        qs = ReferenceItem.objects.all()
        if table_type:
            qs = qs.filter(table_type=table_type)
        if active_only:
            qs = qs.filter(is_active=True)
        return [ReferenceItemNode.from_db(i) for i in qs]
