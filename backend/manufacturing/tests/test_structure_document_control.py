from django.test import TestCase
from manufacturing.models import (
    Company, Plant, StructureDocument,
)
from manufacturing.models.structure_document import (
    DocumentType, TargetType, DocumentStatus, LifecycleAction,
    StructureDocumentRevisionHistory, StructureDocumentAuditTrail,
)
from manufacturing.domain.structure_document_control_service import (
    StructureDocumentControlService,
    DocumentControlError,
)
from manufacturing.domain.structure_document_service import StructureDocumentService


class StructureDocumentControlServiceTest(TestCase):

    def setUp(self):
        self.company = Company.objects.create(
            code="CTRL", name="Control Test Co", status="ACTIVE"
        )
        self.plant = Plant.objects.create(
            code="CTRL01", name="Control Plant", company=self.company, status="ACTIVE"
        )

    def _create_doc(self, **kw):
        defaults = dict(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Test",
            code="CTRL-TEST",
        )
        defaults.update(kw)
        return StructureDocumentService.create_document(**defaults)

    # ── Create controlled document ──

    def test_create_controlled_document_creates_history_and_audit(self):
        doc = StructureDocumentControlService.create_controlled_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Controlled Doc",
            code="CTRL-001",
            user="testuser",
        )
        self.assertEqual(StructureDocumentRevisionHistory.objects.filter(document=doc).count(), 1)
        self.assertEqual(StructureDocumentAuditTrail.objects.filter(document=doc).count(), 1)
        history = StructureDocumentRevisionHistory.objects.get(document=doc)
        self.assertEqual(history.lifecycle_action, LifecycleAction.CREATED)

    # ── Update DRAFT ──

    def test_update_draft_creates_history(self):
        doc = self._create_doc()
        StructureDocumentControlService.update_controlled_document(
            document_id=doc.id, title="Updated", user="testuser",
        )
        self.assertEqual(StructureDocumentRevisionHistory.objects.filter(document=doc).count(), 1)
        doc.refresh_from_db()
        self.assertEqual(doc.title, "Updated")

    # ── Cannot edit approved ──

    def test_cannot_edit_approved(self):
        doc = self._create_doc()
        StructureDocumentService.approve_document(doc.id)
        with self.assertRaises(DocumentControlError) as ctx:
            StructureDocumentControlService.update_controlled_document(
                document_id=doc.id, title="Should fail", user="testuser",
            )
        self.assertEqual(ctx.exception.code, "CANNOT_EDIT_APPROVED")

    # ── Cannot edit archived ──

    def test_cannot_edit_archived(self):
        doc = self._create_doc()
        StructureDocumentControlService.archive_document(
            document_id=doc.id, reason="Testing", user="testuser",
        )
        with self.assertRaises(DocumentControlError) as ctx:
            StructureDocumentControlService.update_controlled_document(
                document_id=doc.id, title="Should fail", user="testuser",
            )
        self.assertEqual(ctx.exception.code, "CANNOT_EDIT_ARCHIVED")

    # ── Create revision from approved ──

    def test_create_revision_from_approved(self):
        doc = self._create_doc()
        StructureDocumentService.approve_document(doc.id)
        new_doc = StructureDocumentControlService.create_revision(
            document_id=doc.id, new_revision="2.0", user="testuser",
        )
        self.assertEqual(new_doc.revision, "2.0")
        self.assertEqual(new_doc.status, DocumentStatus.DRAFT)
        self.assertNotEqual(new_doc.id, doc.id)

    # ── Cannot create revision from draft ──

    def test_create_revision_from_draft_fails(self):
        doc = self._create_doc()
        with self.assertRaises(DocumentControlError) as ctx:
            StructureDocumentControlService.create_revision(
                document_id=doc.id, new_revision="2.0", user="testuser",
            )
        self.assertEqual(ctx.exception.code, "REVISION_REQUIRES_APPROVED")

    # ── Approve ──

    def test_approve_document(self):
        doc = self._create_doc()
        approved = StructureDocumentControlService.approve_document(
            document_id=doc.id, user="testuser",
        )
        self.assertEqual(approved.status, DocumentStatus.APPROVED)
        self.assertIsNotNone(approved.review_date)

    # ── Approve non-draft fails ──

    def test_approve_non_draft_fails(self):
        doc = self._create_doc()
        StructureDocumentService.approve_document(doc.id)
        with self.assertRaises(DocumentControlError) as ctx:
            StructureDocumentControlService.approve_document(
                document_id=doc.id, user="testuser",
            )
        self.assertEqual(ctx.exception.code, "APPROVE_REQUIRES_DRAFT")

    # ── Archive requires reason ──

    def test_archive_requires_reason(self):
        doc = self._create_doc()
        with self.assertRaises(DocumentControlError) as ctx:
            StructureDocumentControlService.archive_document(
                document_id=doc.id, reason="", user="testuser",
            )
        self.assertEqual(ctx.exception.code, "REASON_REQUIRED")

    # ── Archive ──

    def test_archive_document(self):
        doc = self._create_doc()
        archived = StructureDocumentControlService.archive_document(
            document_id=doc.id, reason="Obsolete", user="testuser",
        )
        self.assertEqual(archived.status, DocumentStatus.ARCHIVED)

    # ── Archived cannot be approved ──

    def test_archived_cannot_be_approved(self):
        doc = self._create_doc()
        StructureDocumentControlService.archive_document(
            document_id=doc.id, reason="Test", user="testuser",
        )
        with self.assertRaises(DocumentControlError) as ctx:
            StructureDocumentControlService.approve_document(
                document_id=doc.id, user="testuser",
            )
        self.assertEqual(ctx.exception.code, "APPROVE_REQUIRES_DRAFT")

    # ── Controlled copy flag ──

    def test_controlled_copy_creates_audit(self):
        doc = self._create_doc()
        StructureDocumentControlService.set_controlled_copy(
            document_id=doc.id, is_controlled_copy=False, reason="Test", user="testuser",
        )
        doc.refresh_from_db()
        self.assertFalse(doc.is_controlled_copy)
        self.assertEqual(
            StructureDocumentAuditTrail.objects.filter(document=doc, action=LifecycleAction.CONTROLLED_COPY_CHANGED).count(), 1
        )

    # ── History is append-only ──

    def test_revision_history_append_only(self):
        doc = self._create_doc()
        StructureDocumentControlService.update_controlled_document(
            document_id=doc.id, title="v1", user="testuser",
        )
        StructureDocumentControlService.update_controlled_document(
            document_id=doc.id, title="v2", user="testuser",
        )
        self.assertEqual(StructureDocumentRevisionHistory.objects.filter(document=doc).count(), 2)

    # ── History snapshots preserve old content ──

    def test_revision_snapshot_preserves_content(self):
        doc = self._create_doc(content="original content")
        StructureDocumentControlService.update_controlled_document(
            document_id=doc.id, content="updated content", change_reason="updated", user="testuser",
        )
        history = StructureDocumentRevisionHistory.objects.get(document=doc)
        self.assertEqual(history.content_snapshot, "original content")

    # ── Appoved document still resolves through existing service ──

    def test_approved_resolves_through_existing_service(self):
        from manufacturing.domain.structure_document_service import StructureDocumentService
        doc = self._create_doc()
        StructureDocumentControlService.approve_document(document_id=doc.id, user="testuser")
        resolved = StructureDocumentService.resolve_selected_node_document_status(
            TargetType.PLANT, self.plant.id, DocumentType.WORK_INSTRUCTION
        )
        self.assertEqual(resolved.status, "LOCAL")
