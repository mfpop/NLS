from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional

from django.db import transaction

from manufacturing.models.structure_document import (
    StructureDocument,
    StructureDocumentRevisionHistory,
    StructureDocumentAuditTrail,
    DocumentStatus,
    LifecycleAction,
)
from manufacturing.domain.structure_document_service import (
    StructureDocumentService,
    StructureDocumentError,
)


@dataclass
class DocumentControlError(Exception):
    field: Optional[str]
    code: str
    message: str


class StructureDocumentControlService:
    """Lifecycle governance over StructureDocument.

    Owns: revision creation, approval workflow, audit trail, controlled copy flag.
    Does NOT duplicate: target validation, inheritance resolution, tree building.
    """

    # ──────────────────────────────────────────────
    #  CREATE
    # ──────────────────────────────────────────────

    @classmethod
    @transaction.atomic
    def create_controlled_document(
        cls,
        document_type: str,
        target_type: str,
        target_id: int,
        title: str,
        code: str,
        content: str = "",
        revision: str = "1.0",
        owner: str = "",
        change_reason: str = "",
        user: str = "",
    ) -> StructureDocument:
        doc = StructureDocumentService.create_document(
            document_type=document_type,
            target_type=target_type,
            target_id=target_id,
            title=title,
            code=code,
            content=content,
            revision=revision,
            owner=owner,
        )
        cls._record_history(doc, LifecycleAction.CREATED, None, change_reason, user)
        cls._record_audit(doc, LifecycleAction.CREATED, user, change_reason)
        return doc

    # ──────────────────────────────────────────────
    #  UPDATE
    # ──────────────────────────────────────────────

    @classmethod
    @transaction.atomic
    def update_controlled_document(
        cls,
        document_id: int,
        title: Optional[str] = None,
        content: Optional[str] = None,
        revision: Optional[str] = None,
        owner: Optional[str] = None,
        effective_from: Optional[str] = None,
        effective_to: Optional[str] = None,
        change_reason: str = "",
        user: str = "",
    ) -> StructureDocument:
        doc = cls._get_locked(document_id)
        if doc.status == DocumentStatus.APPROVED:
            raise DocumentControlError(
                field="status",
                code="CANNOT_EDIT_APPROVED",
                message="Approved documents cannot be edited directly. Create a new revision.",
            )
        if doc.status == DocumentStatus.ARCHIVED:
            raise DocumentControlError(
                field="status",
                code="CANNOT_EDIT_ARCHIVED",
                message="Archived documents cannot be edited.",
            )

        old_status = doc.status
        old_content = doc.content
        doc = StructureDocumentService.update_document(
            document_id=document_id,
            title=title,
            content=content,
            revision=revision,
            owner=owner,
            effective_from=effective_from,
            effective_to=effective_to,
        )
        cls._record_history(doc, LifecycleAction.UPDATED, old_status, change_reason, user, content_snapshot=old_content)
        cls._record_audit(doc, LifecycleAction.UPDATED, user, change_reason)
        return doc

    # ──────────────────────────────────────────────
    #  REVISION
    # ──────────────────────────────────────────────

    @classmethod
    @transaction.atomic
    def create_revision(
        cls,
        document_id: int,
        new_revision: str,
        change_reason: str = "",
        user: str = "",
    ) -> StructureDocument:
        doc = cls._get_locked(document_id)
        if doc.status != DocumentStatus.APPROVED:
            raise DocumentControlError(
                field="status",
                code="REVISION_REQUIRES_APPROVED",
                message="Revisions can only be created from an approved document.",
            )

        old_status = doc.status
        # Create new DRAFT document copying approved content
        new_doc = StructureDocument.objects.create(
            document_type=doc.document_type,
            target_type=doc.target_type,
            target_id=doc.target_id,
            title=doc.title,
            code=doc.code,
            content=doc.content,
            revision=new_revision,
            status=DocumentStatus.DRAFT,
            owner=doc.owner,
            effective_from=None,
            effective_to=None,
            review_date=None,
            change_reason=change_reason,
            is_controlled_copy=doc.is_controlled_copy,
            is_active=True,
        )
        cls._record_history(new_doc, LifecycleAction.REVISION_CREATED, old_status, change_reason, user)
        cls._record_audit(new_doc, LifecycleAction.REVISION_CREATED, user, change_reason)
        return new_doc

    # ──────────────────────────────────────────────
    #  APPROVAL
    # ──────────────────────────────────────────────

    @classmethod
    @transaction.atomic
    def approve_document(cls, document_id: int, user: str = "") -> StructureDocument:
        doc = cls._get_locked(document_id)
        if doc.status != DocumentStatus.DRAFT:
            raise DocumentControlError(
                field="status",
                code="APPROVE_REQUIRES_DRAFT",
                message="Only draft documents can be approved.",
            )

        old_status = doc.status
        doc = StructureDocumentService.approve_document(document_id)
        doc.review_date = date.today()
        doc.save(update_fields=["review_date"])

        cls._record_history(doc, LifecycleAction.APPROVED, old_status, "", user)
        cls._record_audit(doc, LifecycleAction.APPROVED, user, "")
        return doc

    # ──────────────────────────────────────────────
    #  ARCHIVE
    # ──────────────────────────────────────────────

    @classmethod
    @transaction.atomic
    def archive_document(
        cls, document_id: int, reason: str = "", user: str = ""
    ) -> StructureDocument:
        if not reason:
            raise DocumentControlError(
                field="reason",
                code="REASON_REQUIRED",
                message="A reason is required to archive a document.",
            )

        doc = cls._get_locked(document_id)
        if doc.status == DocumentStatus.ARCHIVED:
            raise DocumentControlError(
                field="status",
                code="ALREADY_ARCHIVED",
                message="Document is already archived.",
            )

        old_status = doc.status
        doc = StructureDocumentService.archive_document(document_id)

        cls._record_history(doc, LifecycleAction.ARCHIVED, old_status, reason, user)
        cls._record_audit(doc, LifecycleAction.ARCHIVED, user, reason)
        return doc

    # ──────────────────────────────────────────────
    #  CONTROLLED COPY
    # ──────────────────────────────────────────────

    @classmethod
    @transaction.atomic
    def set_controlled_copy(
        cls,
        document_id: int,
        is_controlled_copy: bool,
        reason: str = "",
        user: str = "",
    ) -> StructureDocument:
        doc = cls._get_locked(document_id)
        doc.is_controlled_copy = is_controlled_copy
        doc.save(update_fields=["is_controlled_copy"])

        cls._record_history(
            doc, LifecycleAction.CONTROLLED_COPY_CHANGED, None, reason, user
        )
        cls._record_audit(doc, LifecycleAction.CONTROLLED_COPY_CHANGED, user, reason)
        return doc

    # ──────────────────────────────────────────────
    #  READ-ONLY HISTORY / AUDIT
    # ──────────────────────────────────────────────

    @classmethod
    def get_revision_history(
        cls, document_id: int
    ) -> list[StructureDocumentRevisionHistory]:
        return list(
            StructureDocumentRevisionHistory.objects.filter(document_id=document_id)
        )

    @classmethod
    def get_audit_trail(
        cls, document_id: int
    ) -> list[StructureDocumentAuditTrail]:
        return list(
            StructureDocumentAuditTrail.objects.filter(document_id=document_id)
        )

    # ──────────────────────────────────────────────
    #  INTERNAL HELPERS
    # ──────────────────────────────────────────────

    @classmethod
    def _get_locked(cls, document_id: int) -> StructureDocument:
        try:
            return StructureDocument.objects.select_for_update().get(id=document_id)
        except StructureDocument.DoesNotExist:
            raise DocumentControlError(
                field="id",
                code="NOT_FOUND",
                message=f"Document with id {document_id} not found.",
            )

    @classmethod
    def _record_history(
        cls,
        doc: StructureDocument,
        action: str,
        status_from: Optional[str],
        change_reason: str,
        user: str,
        content_snapshot: Optional[str] = None,
    ) -> StructureDocumentRevisionHistory:
        return StructureDocumentRevisionHistory.objects.create(
            document=doc,
            document_type=doc.document_type,
            target_type=doc.target_type,
            target_id=doc.target_id,
            code=doc.code,
            title=doc.title,
            revision=doc.revision,
            status_from=status_from,
            status_to=doc.status,
            content_snapshot=content_snapshot if content_snapshot is not None else doc.content,
            change_reason=change_reason,
            changed_by=user,
            lifecycle_action=action,
        )

    @classmethod
    def _record_audit(
        cls,
        doc: StructureDocument,
        action: str,
        user: str,
        reason: str,
    ) -> StructureDocumentAuditTrail:
        return StructureDocumentAuditTrail.objects.create(
            document=doc,
            action=action,
            actor=user,
            reason=reason,
            metadata={
                "document_type": doc.document_type,
                "target_type": doc.target_type,
                "target_id": doc.target_id,
                "code": doc.code,
                "revision": doc.revision,
                "status": doc.status,
            },
        )
