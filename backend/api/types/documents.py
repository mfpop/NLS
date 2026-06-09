import typing
import strawberry

from api.common.errors import MutationError

@strawberry.type
class StructureDocumentNode:
    id: strawberry.ID
    document_type: str = strawberry.field(name="documentType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    title: str
    code: str
    content: str
    revision: str
    status: str
    owner: str
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    review_date: typing.Optional[str] = strawberry.field(name="reviewDate", default=None)
    change_reason: str = strawberry.field(name="changeReason", default="")
    is_controlled_copy: bool = strawberry.field(name="isControlledCopy", default=True)
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, doc) -> "StructureDocumentNode":
        return cls(
            id=strawberry.ID(str(doc.id)),
            document_type=doc.document_type,
            target_type=doc.target_type,
            target_id=doc.target_id,
            title=doc.title,
            code=doc.code,
            content=doc.content,
            revision=doc.revision,
            status=doc.status,
            owner=doc.owner,
            effective_from=doc.effective_from.isoformat() if doc.effective_from else None,
            effective_to=doc.effective_to.isoformat() if doc.effective_to else None,
            review_date=doc.review_date.isoformat() if doc.review_date else None,
            change_reason=doc.change_reason or "",
            is_controlled_copy=doc.is_controlled_copy,
            is_active=doc.is_active,
            created_at=doc.created_at.isoformat() if doc.created_at else "",
            updated_at=doc.updated_at.isoformat() if doc.updated_at else "",
        )


@strawberry.type
class StructureDocumentTreeNode:
    id: str
    node_type: str = strawberry.field(name="nodeType")
    name: str
    parent_id: typing.Optional[str] = strawberry.field(name="parentId", default=None)
    children: list["StructureDocumentTreeNode"] = strawberry.field(default_factory=list)
    document_status: str = strawberry.field(name="documentStatus")
    local_document_id: typing.Optional[str] = strawberry.field(name="localDocumentId", default=None)
    inherited_document_id: typing.Optional[str] = strawberry.field(name="inheritedDocumentId", default=None)

    @classmethod
    def from_dict(cls, data: dict) -> "StructureDocumentTreeNode":
        return cls(
            id=data["id"],
            node_type=data["nodeType"],
            name=data["name"],
            parent_id=data.get("parentId"),
            children=[cls.from_dict(c) for c in data.get("children", [])],
            document_status=data["documentStatus"],
            local_document_id=data.get("localDocumentId"),
            inherited_document_id=data.get("inheritedDocumentId"),
        )


@strawberry.type
class StructureDocumentPayload:
    ok: bool
    document: typing.Optional[StructureDocumentNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class DocumentRevisionHistoryNode:
    id: strawberry.ID
    document_id: str = strawberry.field(name="documentId")
    document_type: str = strawberry.field(name="documentType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    code: str
    title: str
    revision: str
    status_from: typing.Optional[str] = strawberry.field(name="statusFrom", default=None)
    status_to: str = strawberry.field(name="statusTo")
    content_snapshot: str = strawberry.field(name="contentSnapshot")
    change_reason: str = strawberry.field(name="changeReason")
    changed_by: str = strawberry.field(name="changedBy")
    lifecycle_action: str = strawberry.field(name="lifecycleAction")
    changed_at: str = strawberry.field(name="changedAt")

    @classmethod
    def from_db(cls, h) -> "DocumentRevisionHistoryNode":
        return cls(
            id=strawberry.ID(str(h.id)),
            document_id=str(h.document_id),
            document_type=h.document_type,
            target_type=h.target_type,
            target_id=h.target_id,
            code=h.code,
            title=h.title,
            revision=h.revision,
            status_from=h.status_from,
            status_to=h.status_to,
            content_snapshot=h.content_snapshot,
            change_reason=h.change_reason,
            changed_by=h.changed_by,
            lifecycle_action=h.lifecycle_action,
            changed_at=h.changed_at.isoformat() if h.changed_at else "",
        )


@strawberry.type
class DocumentAuditTrailNode:
    id: strawberry.ID
    document_id: str = strawberry.field(name="documentId")
    action: str
    actor: str
    occurred_at: str = strawberry.field(name="occurredAt")
    metadata: str = strawberry.field(name="metadata")
    reason: str

    @classmethod
    def from_db(cls, a) -> "DocumentAuditTrailNode":
        import json
        return cls(
            id=strawberry.ID(str(a.id)),
            document_id=str(a.document_id),
            action=a.action,
            actor=a.actor,
            occurred_at=a.occurred_at.isoformat() if a.occurred_at else "",
            metadata=json.dumps(a.metadata),
            reason=a.reason,
        )


# ── Re-export manufacturing structure types ──
from api.types.manufacturing_structure import (  # noqa: F401
    AssignDepartmentInput,
    AssignDepartmentToLinesInput,
    AssignedResourceGroupNode,
    AssignmentPayload,
    CompanyInput,
    CompanyNode,
    CompanyPayload,
    DeletePayload,
    DepartmentInput,
    DepartmentListInput,
    DepartmentNode,
    DepartmentPayload,
    DepartmentProductionLineNode,
    DepartmentResourceGroupNode,
    EducationEntry,
    EducationInput,
    ManufacturingSnapshot,
    PaginatedReferenceCategoryResponse,
    PaginatedReferenceValueResponse,
    PaginationInput,
    PersonRefNode,
    PlantInput,
    PlantNode,
    PlantPaginationInput,
    PlantPayload,
    ProductionLineAssignmentPayload,
    ProductionLineDepartmentAssignmentNode,
    ProductionLineDepartmentLinkNode,
    ProductionLineInput,
    ProductionLineListInput,
    ProductionLineNode,
    ProductionLinePayload,
    ProductionLineResourceGroupOptionNode,
    ProductionStructureTree,
    ProfileInput,
    ProfileNode,
    ProfilePayload,
    ReferenceCategoryNode,
    ReferenceListInput,
    ReferenceTableCatalogEntryNode,
    ReferenceTableCatalogGroupNode,
    ReferenceTableNode,
    ReferenceValueNode,
    ResolvedScheduleNode,
    ResourceGroupFlowUsageNode,
    ResourceGroupInput,
    ResourceGroupListInput,
    ResourceGroupNode,
    ResourceGroupPayload,
    ResourceInput,
    ResourceListInput,
    ResourceNode,
    ResourcePayload,
    StructureChildNode,
    WorkHistoryEntry,
    WorkHistoryInput,
    _iso,
)

@strawberry.type
class DocumentControlPayload:
    ok: bool
    document: typing.Optional[StructureDocumentNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class AuditTrailPayload:
    ok: bool
    entries: list[DocumentAuditTrailNode] = strawberry.field(default_factory=list)
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class RevisionHistoryPayload:
    ok: bool
    entries: list[DocumentRevisionHistoryNode] = strawberry.field(default_factory=list)
    errors: list[MutationError] = strawberry.field(default_factory=list)


# ── Audit Template Types ──

