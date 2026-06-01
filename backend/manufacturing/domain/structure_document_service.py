from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional

from django.db import transaction, models as db_models

from manufacturing.models.structure_document import (
    StructureDocument,
    DocumentType,
    TargetType,
    DocumentStatus,
)
from manufacturing.models import (
    Company,
    Plant,
    ProductionLine,
    ProductionLineDepartmentAssignment,
    Department,
    ResourceGroup,
    Resource,
)


# ── Error type ──


@dataclass
class StructureDocumentError(Exception):
    field: Optional[str]
    code: str
    message: str


# ── Type mapping for target_id validation ──

TARGET_MODEL_MAP: dict[str, type[db_models.Model]] = {
    TargetType.COMPANY: Company,
    TargetType.PLANT: Plant,
    TargetType.PRODUCTION_LINE: ProductionLine,
    TargetType.DEPARTMENT: Department,
    TargetType.RESOURCE_GROUP: ResourceGroup,
    TargetType.RESOURCE: Resource,
}

# ── Parent chain for inheritance resolution ──

PARENT_CHAIN: dict[str, Optional[str]] = {
    TargetType.RESOURCE: TargetType.RESOURCE_GROUP,
    TargetType.RESOURCE_GROUP: TargetType.DEPARTMENT,
    TargetType.DEPARTMENT: TargetType.PLANT,
    TargetType.PRODUCTION_LINE: TargetType.PLANT,
    TargetType.PLANT: TargetType.COMPANY,
    TargetType.COMPANY: None,
}

PARENT_FK_MAP: dict[str, tuple[str, str]] = {
    TargetType.RESOURCE: ("resource_group", TargetType.RESOURCE_GROUP),
    TargetType.RESOURCE_GROUP: ("department", TargetType.DEPARTMENT),
    TargetType.DEPARTMENT: ("plant", TargetType.PLANT),
    TargetType.PRODUCTION_LINE: ("plant", TargetType.PLANT),
    TargetType.PLANT: ("company", TargetType.COMPANY),
}


# ── Helper type for resolved document status ──


@dataclass
class ResolvedDocument:
    document: Optional[StructureDocument]
    status: str  # LOCAL | INHERITED | MISSING


# ── Service ──


class StructureDocumentService:
    """Domain service for the shared Document / Standard Framework.

    Owns all business logic: target validation, inheritance resolution,
    status calculation, versioning, approval, override rules, and permissions.
    """

    # ──────────────────────────────────────────────
    #  VALIDATION
    # ──────────────────────────────────────────────

    @classmethod
    def validate_target_type(cls, target_type: str) -> None:
        if target_type not in TARGET_MODEL_MAP:
            raise StructureDocumentError(
                field="targetType",
                code="INVALID_TARGET_TYPE",
                message=f"Invalid target type '{target_type}'. Allowed: {', '.join(sorted(TARGET_MODEL_MAP))}",
            )

    @classmethod
    def validate_target_id(cls, target_type: str, target_id: int) -> None:
        cls.validate_target_type(target_type)
        model = TARGET_MODEL_MAP[target_type]
        if not model.objects.filter(id=target_id).exists():
            raise StructureDocumentError(
                field="targetId",
                code="TARGET_NOT_FOUND",
                message=f"{TargetType(target_type).label} with id {target_id} not found.",
            )

    @classmethod
    def validate_document_type(cls, document_type: str) -> None:
        valid = {dt.value for dt in DocumentType}
        if document_type not in valid:
            raise StructureDocumentError(
                field="documentType",
                code="INVALID_DOCUMENT_TYPE",
                message=f"Invalid document type '{document_type}'. Allowed: {', '.join(sorted(valid))}",
            )

    # ──────────────────────────────────────────────
    #  WRITE OPERATIONS
    # ──────────────────────────────────────────────

    @classmethod
    @transaction.atomic
    def create_document(
        cls,
        document_type: str,
        target_type: str,
        target_id: int,
        title: str,
        code: str,
        content: str = "",
        revision: str = "1.0",
        owner: str = "",
        effective_from: Optional[str] = None,
        effective_to: Optional[str] = None,
    ) -> StructureDocument:
        cls.validate_document_type(document_type)
        cls.validate_target_id(target_type, target_id)

        doc = StructureDocument.objects.create(
            document_type=document_type,
            target_type=target_type,
            target_id=target_id,
            title=title,
            code=code,
            content=content,
            revision=revision,
            status=DocumentStatus.DRAFT,
            owner=owner,
            effective_from=effective_from,
            effective_to=effective_to,
            is_active=True,
        )
        return doc

    @classmethod
    @transaction.atomic
    def update_document(
        cls,
        document_id: int,
        title: Optional[str] = None,
        content: Optional[str] = None,
        revision: Optional[str] = None,
        owner: Optional[str] = None,
        effective_from: Optional[str] = None,
        effective_to: Optional[str] = None,
    ) -> StructureDocument:
        doc = cls._get_locked(document_id)

        if title is not None:
            doc.title = title
        if content is not None:
            doc.content = content
        if revision is not None:
            doc.revision = revision
        if owner is not None:
            doc.owner = owner
        if effective_from is not None:
            doc.effective_from = effective_from
        if effective_to is not None:
            doc.effective_to = effective_to

        doc.save()
        return doc

    @classmethod
    @transaction.atomic
    def approve_document(cls, document_id: int) -> StructureDocument:
        doc = cls._get_locked(document_id)

        if doc.status == DocumentStatus.ARCHIVED:
            raise StructureDocumentError(
                field="status",
                code="CANNOT_APPROVE_ARCHIVED",
                message="Cannot approve an archived document.",
            )

        # Deactivate any other active approved document for this target+type
        StructureDocument.objects.filter(
            document_type=doc.document_type,
            target_type=doc.target_type,
            target_id=doc.target_id,
            status=DocumentStatus.APPROVED,
            is_active=True,
        ).exclude(id=doc.id).update(is_active=False)

        doc.status = DocumentStatus.APPROVED
        doc.is_active = True
        doc.save()
        return doc

    @classmethod
    @transaction.atomic
    def archive_document(cls, document_id: int) -> StructureDocument:
        doc = cls._get_locked(document_id)
        doc.status = DocumentStatus.ARCHIVED
        doc.is_active = False
        doc.save()
        return doc

    # ──────────────────────────────────────────────
    #  INHERITANCE RESOLUTION
    # ──────────────────────────────────────────────

    @classmethod
    def resolve_local_document(
        cls,
        target_type: str,
        target_id: int,
        document_type: str,
    ) -> Optional[StructureDocument]:
        """Return the active approved local document for the given node, if any."""
        cls.validate_document_type(document_type)
        cls.validate_target_type(target_type)

        return StructureDocument.objects.filter(
            document_type=document_type,
            target_type=target_type,
            target_id=target_id,
            status=DocumentStatus.APPROVED,
            is_active=True,
        ).order_by("-updated_at").first()

    @classmethod
    def resolve_inherited_document(
        cls,
        target_type: str,
        target_id: int,
        document_type: str,
    ) -> Optional[StructureDocument]:
        """Walk the parent chain to find the nearest ancestor with an active approved document."""
        cls.validate_document_type(document_type)
        cls.validate_target_type(target_type)

        current_type = target_type
        current_id = target_id

        # Walk up the parent chain
        while current_type in PARENT_CHAIN:
            parent_type = PARENT_CHAIN[current_type]
            if parent_type is None:
                break

            parent_id = cls._resolve_parent_id(current_type, current_id, parent_type)
            if parent_id is None:
                break

            doc = StructureDocument.objects.filter(
                document_type=document_type,
                target_type=parent_type,
                target_id=parent_id,
                status=DocumentStatus.APPROVED,
                is_active=True,
            ).order_by("-updated_at").first()

            if doc is not None:
                return doc

            current_type = parent_type
            current_id = parent_id

        return None

    @classmethod
    def resolve_selected_node_document_status(
        cls,
        target_type: str,
        target_id: int,
        document_type: str,
    ) -> ResolvedDocument:
        """Resolve the document status for a selected structure node.

        Returns (document, status) where status is one of:
        - LOCAL: node has its own active approved document
        - INHERITED: no local doc, but an ancestor has one
        - MISSING: no local or ancestor document
        """
        local = cls.resolve_local_document(target_type, target_id, document_type)
        if local is not None:
            return ResolvedDocument(document=local, status="LOCAL")

        inherited = cls.resolve_inherited_document(target_type, target_id, document_type)
        if inherited is not None:
            return ResolvedDocument(document=inherited, status="INHERITED")

        return ResolvedDocument(document=None, status="MISSING")

    # ──────────────────────────────────────────────
    #  TREE BUILDING
    # ──────────────────────────────────────────────

    @classmethod
    def build_structure_document_tree(
        cls,
        document_type: str,
    ) -> list[dict]:
        """Build the full structure tree with resolved document status for each node.

        Bulk-loads all entities and documents upfront to eliminate N+1 queries.
        Returns a nested list of dicts with keys:
        id, nodeType, name, parentId, children, documentStatus,
        localDocumentId, inheritedDocumentId
        """
        cls.validate_document_type(document_type)

        # ── 1. Bulk-fetch ALL entities (7 queries total vs hundreds previously) ──
        companies = list(Company.objects.filter(status="ACTIVE").only("id", "name"))
        company_ids = [c.id for c in companies]
        if not company_ids:
            return []

        plants = list(
            Plant.objects.filter(company_id__in=company_ids, status="ACTIVE").only("id", "name", "company_id")
        )
        plant_ids = [p.id for p in plants]

        lines = list(
            ProductionLine.objects.filter(plant_id__in=plant_ids, status="ACTIVE").only("id", "name", "plant_id")
        )
        line_ids = [l.id for l in lines]

        # Department assignments (line → departments)
        dept_assignments = list(
            ProductionLineDepartmentAssignment.objects.filter(production_line_id__in=line_ids).only(
                "production_line_id", "department_id"
            )
        )
        assigned_dept_ids = list({a.department_id for a in dept_assignments})

        depts = list(
            Department.objects.filter(id__in=assigned_dept_ids, status="ACTIVE").only("id", "name", "plant_id")
        )
        dept_ids = [d.id for d in depts]

        rgs = list(
            ResourceGroup.objects.filter(department_id__in=dept_ids, status="ACTIVE").only(
                "id", "name", "department_id"
            )
        )
        rg_ids = [rg.id for rg in rgs]

        resources = list(
            Resource.objects.filter(resource_group_id__in=rg_ids, status="ACTIVE").only(
                "id", "name", "resource_group_id"
            )
        )

        # ── 2. Build parent-child maps in memory ──
        plants_by_company: dict[int, list] = {}
        for p in plants:
            plants_by_company.setdefault(p.company_id, []).append(p)

        lines_by_plant: dict[int, list] = {}
        for l in lines:
            lines_by_plant.setdefault(l.plant_id, []).append(l)

        # Dept IDs by line (only depts still active)
        active_dept_set = set(dept_ids)
        dept_ids_by_line: dict[int, list[int]] = {}
        for da in dept_assignments:
            if da.department_id in active_dept_set:
                dept_ids_by_line.setdefault(da.production_line_id, []).append(da.department_id)

        depts_by_id = {d.id: d for d in depts}

        rgs_by_dept: dict[int, list] = {}
        for rg in rgs:
            rgs_by_dept.setdefault(rg.department_id, []).append(rg)

        resources_by_rg: dict[int, list] = {}
        for r in resources:
            resources_by_rg.setdefault(r.resource_group_id, []).append(r)

        # ── 3. Bulk-fetch ALL approved/active documents for this type ──
        all_target_ids = company_ids + plant_ids + line_ids + dept_ids + rg_ids + [r.id for r in resources]
        all_target_types = [
            TargetType.COMPANY,
            TargetType.PLANT,
            TargetType.PRODUCTION_LINE,
            TargetType.DEPARTMENT,
            TargetType.RESOURCE_GROUP,
            TargetType.RESOURCE,
        ]

        all_docs = list(
            StructureDocument.objects.filter(
                document_type=document_type,
                target_type__in=all_target_types,
                target_id__in=all_target_ids,
                status=DocumentStatus.APPROVED,
                is_active=True,
            ).order_by("-updated_at")
        )

        # Build lookup: (target_type, target_id) -> newest approved document
        doc_lookup: dict[tuple[str, int], StructureDocument] = {}
        for doc in all_docs:
            key = (doc.target_type, doc.target_id)
            if key not in doc_lookup:
                doc_lookup[key] = doc

        # ── 4. Build parent chain maps for in-memory inheritance ──
        parent_lookup: dict[tuple[str, int], int] = {}
        for p in plants:
            parent_lookup[(TargetType.PLANT, p.id)] = p.company_id
        for l in lines:
            parent_lookup[(TargetType.PRODUCTION_LINE, l.id)] = l.plant_id
        for d in depts:
            parent_lookup[(TargetType.DEPARTMENT, d.id)] = d.plant_id
        for rg in rgs:
            parent_lookup[(TargetType.RESOURCE_GROUP, rg.id)] = rg.department_id
        for r in resources:
            parent_lookup[(TargetType.RESOURCE, r.id)] = r.resource_group_id

        child_to_parent_type = {
            TargetType.RESOURCE: TargetType.RESOURCE_GROUP,
            TargetType.RESOURCE_GROUP: TargetType.DEPARTMENT,
            TargetType.DEPARTMENT: TargetType.PLANT,
            TargetType.PRODUCTION_LINE: TargetType.PLANT,
            TargetType.PLANT: TargetType.COMPANY,
            TargetType.COMPANY: None,
        }

        # ── 5. In-memory document status resolution ──
        def resolve_status(
            target_type: str, target_id: int
        ) -> tuple[str, Optional[int], Optional[int]]:
            """Returns (status, local_document_id, inherited_document_id).

            All lookups are against in-memory dicts — zero DB queries.
            """
            doc = doc_lookup.get((target_type, target_id))
            if doc is not None:
                return ("LOCAL", doc.id, None)

            current_type = target_type
            current_id = target_id
            while current_type in child_to_parent_type:
                parent_type = child_to_parent_type[current_type]
                if parent_type is None:
                    break
                parent_id = parent_lookup.get((current_type, current_id))
                if parent_id is None:
                    break
                parent_doc = doc_lookup.get((parent_type, parent_id))
                if parent_doc is not None:
                    return ("INHERITED", None, parent_doc.id)
                current_type = parent_type
                current_id = parent_id

            return ("MISSING", None, None)

        # ── 6. Build tree recursively using only in-memory data ──
        def _make_node(
            node_id: str,
            node_type: str,
            name: str,
            parent_id: Optional[str],
            children: list[dict],
        ) -> dict:
            status, local_id, inherited_id = resolve_status(node_type, int(node_id))
            return {
                "id": node_id,
                "nodeType": node_type,
                "name": name,
                "parentId": parent_id,
                "children": children,
                "documentStatus": status,
                "localDocumentId": str(local_id) if local_id else None,
                "inheritedDocumentId": str(inherited_id) if inherited_id else None,
            }

        def _build_company_node(company) -> dict:
            return _make_node(
                str(company.id),
                "COMPANY",
                company.name,
                None,
                [_build_plant_node(p) for p in plants_by_company.get(company.id, [])],
            )

        def _build_plant_node(plant) -> dict:
            return _make_node(
                str(plant.id),
                "PLANT",
                plant.name,
                str(plant.company_id),
                [_build_line_node(l) for l in lines_by_plant.get(plant.id, [])],
            )

        def _build_line_node(line) -> dict:
            dept_nodes = []
            for dept_id in dept_ids_by_line.get(line.id, []):
                dept = depts_by_id.get(dept_id)
                if dept is not None:
                    dept_nodes.append(_build_dept_node(dept))
            return _make_node(
                str(line.id),
                "PRODUCTION_LINE",
                line.name,
                str(line.plant_id),
                dept_nodes,
            )

        def _build_dept_node(dept) -> dict:
            return _make_node(
                str(dept.id),
                "DEPARTMENT",
                dept.name,
                str(dept.plant_id),
                [_build_rg_node(rg) for rg in rgs_by_dept.get(dept.id, [])],
            )

        def _build_rg_node(rg) -> dict:
            return _make_node(
                str(rg.id),
                "RESOURCE_GROUP",
                rg.name,
                str(rg.department_id),
                [_build_resource_node(r) for r in resources_by_rg.get(rg.id, [])],
            )

        def _build_resource_node(res) -> dict:
            return _make_node(
                str(res.id),
                "RESOURCE",
                res.name,
                str(res.resource_group_id),
                [],
            )

        return [_build_company_node(c) for c in companies]

    # ──────────────────────────────────────────────
    #  HISTORY
    # ──────────────────────────────────────────────

    @classmethod
    def get_document_history(
        cls,
        target_type: str,
        target_id: int,
        document_type: str,
    ) -> list[StructureDocument]:
        cls.validate_document_type(document_type)
        cls.validate_target_type(target_type)

        return list(
            StructureDocument.objects.filter(
                document_type=document_type,
                target_type=target_type,
                target_id=target_id,
            ).order_by("-created_at")
        )

    # ──────────────────────────────────────────────
    #  INTERNAL HELPERS
    # ──────────────────────────────────────────────

    @classmethod
    def _get_locked(cls, document_id: int) -> StructureDocument:
        try:
            return StructureDocument.objects.select_for_update().get(id=document_id)
        except StructureDocument.DoesNotExist:
            raise StructureDocumentError(
                field="id",
                code="NOT_FOUND",
                message=f"Document with id {document_id} not found.",
            )

    @classmethod
    def _resolve_parent_id(
        cls,
        child_type: str,
        child_id: int,
        parent_type: str,
    ) -> Optional[int]:
        """Resolve the parent entity id for a given child instance."""
        if child_type == TargetType.RESOURCE:
            try:
                obj = Resource.objects.get(id=child_id)
                if parent_type == TargetType.RESOURCE_GROUP:
                    return obj.resource_group_id
            except Resource.DoesNotExist:
                return None

        elif child_type == TargetType.RESOURCE_GROUP:
            try:
                obj = ResourceGroup.objects.get(id=child_id)
                if parent_type == TargetType.DEPARTMENT:
                    return obj.department_id
            except ResourceGroup.DoesNotExist:
                return None

        elif child_type == TargetType.DEPARTMENT:
            try:
                obj = Department.objects.get(id=child_id)
                if parent_type == TargetType.PLANT:
                    return obj.plant_id
            except Department.DoesNotExist:
                return None

        elif child_type == TargetType.PRODUCTION_LINE:
            try:
                obj = ProductionLine.objects.get(id=child_id)
                if parent_type == TargetType.PLANT:
                    return obj.plant_id
            except ProductionLine.DoesNotExist:
                return None

        elif child_type == TargetType.PLANT:
            try:
                obj = Plant.objects.get(id=child_id)
                if parent_type == TargetType.COMPANY:
                    return obj.company_id
            except Plant.DoesNotExist:
                return None

        return None
