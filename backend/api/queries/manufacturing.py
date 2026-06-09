import strawberry
from collections import Counter, defaultdict
from typing import Optional
from django.db.models import Count
from django.db.models import Q
from django.contrib.auth.models import User

# Legacy types for backward compat
import typing
import strawberry as strawberry_decorator
from strawberry.types import Info

from manufacturing.domain.routing_service import RoutingService
from manufacturing.domain.department_service import DepartmentService, DepartmentServiceError
from manufacturing.domain.capacity_service import CapacityPlanService
from manufacturing.domain.reference_table_service import TABLE_TYPE_TO_CATEGORY as REF_TABLE_TYPE_TO_CATEGORY

from api.types.manufacturing import (
    AuditExecutionForm, AuditExecutionSection, AuditExecutionQuestion, AuditTemplateInfo, AuditExecutionSummary,
    ManufacturingSnapshot, CompanyNode,
    StructureDocumentNode, StructureDocumentTreeNode,
    DocumentRevisionHistoryNode, DocumentAuditTrailNode,
    PlantNode, ProductionLineNode, DepartmentNode,
    ResourceGroupNode, ResourceGroupFlowUsageNode, ResourceNode,
    ProductionStructureTree, StructureChildNode,
    ScheduleNode, ShiftNode, ScheduleAssignmentNode,
    ReferenceCategoryNode, ReferenceValueNode, ResourceTypeNode, VisualIdentityNode,
    ReferenceTableNode, ReferenceTableCatalogGroupNode, ReferenceTableCatalogEntryNode,
    ProductFamilyNode, ProductModelNode, ProductVariantNode, PartNumberNode,
    ProductModelByFamilyNode, ProcessFlowNode, ProcessStepNode, BOMNode,
    PaginatedReferenceCategoryResponse, PaginatedReferenceValueResponse,
    PaginatedShiftResponse, PaginatedScheduleAssignmentResponse,
    PaginatedVisualIdentityResponse, PaginatedProductFamilyResponse, PaginatedProductModelResponse,
    PaginatedProductVariantResponse, PaginatedPartNumberResponse, PaginatedBOMResponse,
    PaginatedProcessFlowResponse, PaginatedProcessStepResponse,
    ProfileNode, WorkHistoryEntry, EducationEntry,
    RoutingNode, RoutingSummaryNode, RoutingStepNode, StepCapacityNode, YamazumiAnalysisNode, YamazumiStepNode,
    ProductionLineFlowContextNode, MaterialNode, MaterialBinNode, InventoryLocationNode,
    WarehouseNode,
    CapacityPlanNode, CapacityPlanInputNode, CapacityPlanResultNode, CapacityYamazumiNode, CapacityScenarioNode,
    CapacityResultNode, CapacitySnapshotNode, PaginatedCapacitySnapshotResponse, WorkScheduleNode, CapacityProfileNode, CapacityRecalculationJobNode,
    AuditFindingNode, AuditNode, AuditTemplateNode, AuditTemplateCategoryNode, AuditTemplateQuestionNode,
)


from manufacturing.models import (
    Plant, Department, ProductionLine, ResourceGroup, Resource, Company,
    Schedule, Shift, ScheduleAssignment,
)
from api.services.tree_builder import build_plant_tree, build_org_tree, build_flow_tree
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


# Backward-compatible re-exports from split domain files
from api.queries.reference_queries import LegacyReferenceItemNode


@strawberry.type
class ManufacturingQuery:
    @strawberry.field
    def data_management_overview(
        self,
        plant_id: Optional[str] = None,
        search: Optional[str] = None,
        status: Optional[str] = None,
        include_tree: bool = True,
        tree_mode: Optional[str] = "org",
    ) -> DataManagementOverview:
        all_plants = Plant.objects.all()
        selected_plant = None
        if plant_id:
            try:
                selected_plant = Plant.objects.get(id=plant_id)
            except Plant.DoesNotExist:
                pass

        tree_fn = build_flow_tree if tree_mode == "flow" else build_org_tree

        tree = None
        if include_tree:
            if selected_plant:
                children = tree_fn(selected_plant, status, search)
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
                    if tree_mode == "flow" and (getattr(p, "plant_type", "") or "").lower() == "warehouse":
                        continue
                    plant_children = tree_fn(p, status, search)
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

    # ── Audit Templates ──
    @strawberry.field
    def audit_templates(self, module_scope: typing.Optional[str] = None, status: typing.Optional[str] = None) -> typing.List["AuditTemplateNode"]:
        from manufacturing.models.audit import AuditTemplate
        qs = AuditTemplate.objects.all().order_by("name")
        if module_scope:
            qs = qs.filter(module_scope=module_scope)
        if status:
            qs = qs.filter(status=status)
        return [AuditTemplateNode.from_db(t, list(t.categories.all().prefetch_related("questions").order_by("sequence"))) for t in qs]

    # ── Audits ──
    @strawberry.field
    def audits(self, control_area: typing.Optional[str] = None, audit_type: typing.Optional[str] = None, status: typing.Optional[str] = None, target_type: typing.Optional[str] = None, target_id: typing.Optional[int] = None, auditor: typing.Optional[str] = None) -> typing.List["AuditNode"]:
        from manufacturing.models.audit import Audit
        qs = Audit.objects.all().order_by("-created_at")
        if control_area:
            qs = qs.filter(control_area=control_area)
        if audit_type:
            qs = qs.filter(audit_type=audit_type)
        if status:
            qs = qs.filter(status=status)
        if target_type:
            qs = qs.filter(target_type=target_type)
        if target_id:
            qs = qs.filter(target_id=target_id)
        if auditor:
            qs = qs.filter(auditor__icontains=auditor)
        return [AuditNode.from_db(a) for a in qs]

    @strawberry.field
    def audit(self, id: str) -> typing.Optional["AuditNode"]:
        from manufacturing.models.audit import Audit, AuditAnswer
        try:
            obj = Audit.objects.get(id=int(id))
            answers = list(AuditAnswer.objects.filter(audit=obj).select_related("template_question").order_by("template_question__sequence"))
            return AuditNode.from_db(obj, answers=answers)
        except (Audit.DoesNotExist, ValueError, TypeError):
            return None

    @strawberry.field(name="auditExecutionForm")
    def audit_execution_form(self, audit_id: str) -> typing.Optional["AuditExecutionForm"]:
        from manufacturing.models.audit import (
            Audit, AuditAnswer,
            AuditTemplate, AuditTemplateCategory, AuditTemplateQuestion,
            AuditFinding,
        )
        from api.utils.converters import _iso
        try:
            obj = Audit.objects.get(id=int(audit_id))
        except (Audit.DoesNotExist, ValueError, TypeError):
            return None
        template = obj.template
        answers = list(AuditAnswer.objects.filter(audit=obj).select_related("template_question__category"))
        findings = list(AuditFinding.objects.filter(audit=obj).order_by("-created_at"))
        ans_map = {a.template_question_id: a for a in answers}

        categories = list(AuditTemplateCategory.objects.filter(template=template).prefetch_related("questions").order_by("sequence"))
        sections = []
        for cat in categories:
            questions_list = list(cat.questions.all().order_by("sequence"))
            exec_qs = []
            for q in questions_list:
                a = ans_map.get(q.id)
                exec_qs.append(AuditExecutionQuestion(
                    id=strawberry.ID(str(q.id)),
                    question_text=q.question,
                    response_type=q.response_type,
                    is_required=q.is_required,
                    help_text=q.help_text or "",
                    sequence=q.sequence,
                    weight=q.weight,
                    answer_id=strawberry.ID(str(a.id)) if a else None,
                    answer_value=a.answer_value if a else "",
                    comment=a.comment if a else "",
                    evidence_url=a.evidence_url if a else "",
                    is_nonconforming=(a.answer_value in ["FAIL", "NO"] if a else False),
                    finding_required=a.finding_required if a else False,
                ))
            sections.append(AuditExecutionSection(
                id=strawberry.ID(str(cat.id)),
                title=cat.name,
                sequence=cat.sequence,
                questions=exec_qs,
            ))

        total_q = sum(len(s.questions) for s in sections)
        answered = sum(1 for s in sections for q in s.questions if q.answer_value)
        required_missing = sum(1 for s in sections for q in s.questions if q.is_required and not q.answer_value)
        last_saved = max((a.updated_at for a in answers if a.updated_at), default=None)

        return AuditExecutionForm(
            id=strawberry.ID(str(obj.id)),
            title=obj.title,
            status=obj.status,
            score=float(round(obj.score, 1)) if obj.score is not None else None,
            auditor=obj.auditor or "",
            audit_date=obj.audit_date.isoformat() if obj.audit_date else None,
            notes=obj.notes or "",
            target_type=obj.target_type,
            target_id=obj.target_id,
            target_display_name=f"{obj.target_type}:{obj.target_id}",
            template=AuditTemplateInfo(
                id=strawberry.ID(str(template.id)),
                code=template.code,
                name=template.name,
                version=template.version,
            ),
            sections=sections,
            findings=[AuditFindingNode.from_db(f) for f in findings],
            summary=AuditExecutionSummary(
                answered_count=answered,
                total_questions=total_q,
                required_missing_count=required_missing,
                findings_count=len(findings),
                last_saved_at=_iso(last_saved) if last_saved else None,
                score=float(round(obj.score, 1)) if obj.score is not None else None,
            ),
        )

