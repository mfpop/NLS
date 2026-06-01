from datetime import date
from django.test import TestCase
from manufacturing.models import (
    Company, Plant, ProductionLine, Department, ResourceGroup, Resource,
    StructureDocument,
)
from manufacturing.models.structure_document import DocumentType, TargetType, DocumentStatus
from manufacturing.domain.structure_document_service import (
    StructureDocumentService,
    StructureDocumentError,
    ResolvedDocument,
)


class StructureDocumentServiceTest(TestCase):

    def setUp(self):
        self.company = Company.objects.create(
            code="TEST", name="Test Company", status="ACTIVE"
        )
        self.plant = Plant.objects.create(
            code="PLT01", name="Test Plant", company=self.company, status="ACTIVE"
        )
        self.line = ProductionLine.objects.create(
            code="LN01", name="Test Line", plant=self.plant, status="ACTIVE"
        )
        self.dept = Department.objects.create(
            code="DEPT01", name="Test Dept", plant=self.plant, status="ACTIVE"
        )
        self.rg = ResourceGroup.objects.create(
            code="RG01", name="Test RG", department=self.dept, status="ACTIVE"
        )
        self.resource = Resource.objects.create(
            code="RES01", name="Test Resource", resource_group=self.rg, status="ACTIVE"
        )

    # ── Create documents for all four types ──

    def test_create_work_instruction(self):
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Safety Protocol",
            code="WI-001",
            content="Follow safety rules",
            owner="Test User",
        )
        self.assertEqual(doc.document_type, DocumentType.WORK_INSTRUCTION)
        self.assertEqual(doc.status, DocumentStatus.DRAFT)

    def test_create_standard_work(self):
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.STANDARD_WORK,
            target_type=TargetType.PRODUCTION_LINE,
            target_id=self.line.id,
            title="Standard Work Sheet",
            code="SW-001",
        )
        self.assertEqual(doc.document_type, DocumentType.STANDARD_WORK)

    def test_create_procedure(self):
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.PROCEDURE,
            target_type=TargetType.DEPARTMENT,
            target_id=self.dept.id,
            title="Cleaning Procedure",
            code="PR-001",
        )
        self.assertEqual(doc.document_type, DocumentType.PROCEDURE)

    def test_create_material_flow_standard(self):
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.MATERIAL_FLOW_STANDARD,
            target_type=TargetType.RESOURCE_GROUP,
            target_id=self.rg.id,
            title="Kanban Standard",
            code="MF-001",
        )
        self.assertEqual(doc.document_type, DocumentType.MATERIAL_FLOW_STANDARD)

    # ── Validation ──

    def test_reject_invalid_target_type(self):
        with self.assertRaises(StructureDocumentError) as ctx:
            StructureDocumentService.create_document(
                document_type=DocumentType.WORK_INSTRUCTION,
                target_type="INVALID",
                target_id=1,
                title="Test",
                code="T-001",
            )
        self.assertEqual(ctx.exception.code, "INVALID_TARGET_TYPE")

    def test_reject_invalid_document_type(self):
        with self.assertRaises(StructureDocumentError) as ctx:
            StructureDocumentService.create_document(
                document_type="INVALID",
                target_type=TargetType.PLANT,
                target_id=self.plant.id,
                title="Test",
                code="T-001",
            )
        self.assertEqual(ctx.exception.code, "INVALID_DOCUMENT_TYPE")

    def test_reject_missing_target_id(self):
        with self.assertRaises(StructureDocumentError) as ctx:
            StructureDocumentService.create_document(
                document_type=DocumentType.WORK_INSTRUCTION,
                target_type=TargetType.PLANT,
                target_id=99999,
                title="Test",
                code="T-001",
            )
        self.assertEqual(ctx.exception.code, "TARGET_NOT_FOUND")

    # ── Approval and archival ──

    def test_approve_document(self):
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Test",
            code="WI-APPROVE",
        )
        approved = StructureDocumentService.approve_document(doc.id)
        self.assertEqual(approved.status, DocumentStatus.APPROVED)

    def test_archive_document(self):
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Test",
            code="WI-ARCHIVE",
        )
        archived = StructureDocumentService.archive_document(doc.id)
        self.assertEqual(archived.status, DocumentStatus.ARCHIVED)

    def test_cannot_approve_archived(self):
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Test",
            code="WI-NOARCH",
        )
        StructureDocumentService.archive_document(doc.id)
        with self.assertRaises(StructureDocumentError):
            StructureDocumentService.approve_document(doc.id)

    # ── Inheritance resolution ──

    def test_local_approved_document_resolves_as_local(self):
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Plant WI",
            code="WI-PLT",
        )
        StructureDocumentService.approve_document(doc.id)

        resolved = StructureDocumentService.resolve_selected_node_document_status(
            TargetType.PLANT, self.plant.id, DocumentType.WORK_INSTRUCTION
        )
        self.assertEqual(resolved.status, "LOCAL")
        self.assertIsNotNone(resolved.document)

    def test_inherited_from_parent(self):
        # Plant has an approved document
        plant_doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Plant WI",
            code="WI-PLT-INH",
        )
        StructureDocumentService.approve_document(plant_doc.id)

        # Line has no document -> should inherit from Plant
        resolved = StructureDocumentService.resolve_selected_node_document_status(
            TargetType.PRODUCTION_LINE, self.line.id, DocumentType.WORK_INSTRUCTION
        )
        self.assertEqual(resolved.status, "INHERITED")
        self.assertEqual(resolved.document.id, plant_doc.id)

    def test_missing_when_no_local_or_parent(self):
        # Resource group with no document and no parent with document
        resolved = StructureDocumentService.resolve_selected_node_document_status(
            TargetType.RESOURCE_GROUP, self.rg.id, DocumentType.WORK_INSTRUCTION
        )
        self.assertEqual(resolved.status, "MISSING")
        self.assertIsNone(resolved.document)

    def test_draft_does_not_override_approved_inherited(self):
        # Plant has approved document
        plant_doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Plant WI",
            code="WI-PLT-DRAFT",
        )
        StructureDocumentService.approve_document(plant_doc.id)

        # Line has a DRAFT document
        StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PRODUCTION_LINE,
            target_id=self.line.id,
            title="Line Draft WI",
            code="WI-LINE-DRAFT",
        )

        # Line should still resolve as INHERITED (draft doesn't override approved inherited)
        resolved = StructureDocumentService.resolve_selected_node_document_status(
            TargetType.PRODUCTION_LINE, self.line.id, DocumentType.WORK_INSTRUCTION
        )
        self.assertEqual(resolved.status, "INHERITED")

    def test_local_approved_overrides_inherited(self):
        # Plant has approved document
        plant_doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Plant WI",
            code="WI-PLT-OVR",
        )
        StructureDocumentService.approve_document(plant_doc.id)

        # Line has its own approved document
        line_doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PRODUCTION_LINE,
            target_id=self.line.id,
            title="Line WI",
            code="WI-LINE-OVR",
        )
        StructureDocumentService.approve_document(line_doc.id)

        resolved = StructureDocumentService.resolve_selected_node_document_status(
            TargetType.PRODUCTION_LINE, self.line.id, DocumentType.WORK_INSTRUCTION
        )
        self.assertEqual(resolved.status, "LOCAL")
        self.assertEqual(resolved.document.id, line_doc.id)

    def test_archived_document_does_not_resolve(self):
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Plant WI",
            code="WI-ARCH-RES",
        )
        StructureDocumentService.approve_document(doc.id)
        StructureDocumentService.archive_document(doc.id)

        resolved = StructureDocumentService.resolve_selected_node_document_status(
            TargetType.PLANT, self.plant.id, DocumentType.WORK_INSTRUCTION
        )
        self.assertEqual(resolved.status, "MISSING")

    def test_one_active_approved_per_target(self):
        doc1 = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="WI v1",
            code="WI-V1",
        )
        StructureDocumentService.approve_document(doc1.id)

        doc2 = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="WI v2",
            code="WI-V2",
        )
        StructureDocumentService.approve_document(doc2.id)

        # Only doc2 should be active/approved now
        active = StructureDocument.objects.filter(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            status=DocumentStatus.APPROVED,
            is_active=True,
        )
        self.assertEqual(active.count(), 1)
        self.assertEqual(active.first().id, doc2.id)

    def test_material_flow_standard_targets_limited(self):
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.MATERIAL_FLOW_STANDARD,
            target_type=TargetType.RESOURCE,
            target_id=self.resource.id,
            title="Res MF",
            code="MF-RES",
        )
        self.assertEqual(doc.document_type, DocumentType.MATERIAL_FLOW_STANDARD)

    def test_get_document_history(self):
        doc1 = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="v1",
            code="WI-HIST",
        )
        doc2 = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="v2",
            code="WI-HIST",
        )
        history = StructureDocumentService.get_document_history(
            TargetType.PLANT, self.plant.id, DocumentType.WORK_INSTRUCTION
        )
        self.assertEqual(len(history), 2)
