import strawberry
from typing import Optional

from api.types.manufacturing import (
    StructureDocumentNode, StructureDocumentTreeNode,
    DocumentRevisionHistoryNode, DocumentAuditTrailNode,
)


@strawberry.type
class DocumentQuery:

        @strawberry.field(name="structureDocumentTree")
        def structure_document_tree(self, document_type: str) -> list[StructureDocumentTreeNode]:
            from manufacturing.domain.structure_document_service import StructureDocumentService
            raw_tree = StructureDocumentService.build_structure_document_tree(document_type)
            return [StructureDocumentTreeNode.from_dict(node) for node in raw_tree]
    
        @strawberry.field(name="structureDocument")
        def structure_document(
            self, target_type: str, target_id: int, document_type: str
        ) -> Optional[StructureDocumentNode]:
            from manufacturing.domain.structure_document_service import StructureDocumentService
            resolved = StructureDocumentService.resolve_selected_node_document_status(target_type, target_id, document_type)
            if resolved.document:
                return StructureDocumentNode.from_db(resolved.document)
            return None
    
        @strawberry.field(name="structureDocuments")
        def structure_documents(
            self, document_type: str, status: Optional[str] = None, target_type: Optional[str] = None, target_id: Optional[int] = None
        ) -> list[StructureDocumentNode]:
            from manufacturing.models import StructureDocument
            qs = StructureDocument.objects.all()
            if document_type:
                qs = qs.filter(document_type=document_type)
            if status:
                qs = qs.filter(status=status)
            if target_type:
                qs = qs.filter(target_type=target_type)
            if target_id is not None:
                qs = qs.filter(target_id=target_id)
            return [StructureDocumentNode.from_db(doc) for doc in qs.order_by("-updated_at")]
    
        @strawberry.field(name="structureDocumentHistory")
        def structure_document_history(self, target_type: str, target_id: int, document_type: str) -> list[StructureDocumentNode]:
            from manufacturing.domain.structure_document_service import StructureDocumentService
            docs = StructureDocumentService.get_document_history(target_type, target_id, document_type)
            return [StructureDocumentNode.from_db(doc) for doc in docs]
    
        # ── Document Control Queries ──
    
        @strawberry.field(name="structureDocumentRevisionHistory")
        def structure_document_revision_history(self, document_id: str) -> list[DocumentRevisionHistoryNode]:
            from manufacturing.domain.structure_document_control_service import StructureDocumentControlService
            entries = StructureDocumentControlService.get_revision_history(int(document_id))
            return [DocumentRevisionHistoryNode.from_db(e) for e in entries]
    
        @strawberry.field(name="structureDocumentAuditTrail")
        def structure_document_audit_trail(self, document_id: str) -> list[DocumentAuditTrailNode]:
            from manufacturing.domain.structure_document_control_service import StructureDocumentControlService
            entries = StructureDocumentControlService.get_audit_trail(int(document_id))
            return [DocumentAuditTrailNode.from_db(e) for e in entries]