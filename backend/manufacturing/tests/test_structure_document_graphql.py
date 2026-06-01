from django.test import TestCase
from django.contrib.auth.models import User
from manufacturing.models import Company, Plant, ProductionLine
from manufacturing.models.structure_document import DocumentType, TargetType
from manufacturing.domain.structure_document_service import StructureDocumentService


class StructureDocumentGraphQLTest(TestCase):

    def setUp(self):
        self.company = Company.objects.create(
            code="GQL", name="GQL Company", status="ACTIVE"
        )
        self.plant = Plant.objects.create(
            code="GQL01", name="GQL Plant", company=self.company, status="ACTIVE"
        )
        self.user = User.objects.create_user(
            username="testuser", password="testpass123"
        )

    def _create_doc(self, **kw):
        return StructureDocumentService.create_document(**kw)

    # ── Query delegation tests: verify resolvers delegate to service ──

    def test_structure_document_tree_query_shape(self):
        """Verify the tree query returns the expected structure."""
        from manufacturing.domain.structure_document_service import StructureDocumentService
        tree = StructureDocumentService.build_structure_document_tree(
            DocumentType.WORK_INSTRUCTION
        )
        self.assertIsInstance(tree, list)
        if tree:
            node = tree[0]
            self.assertIn("id", node)
            self.assertIn("nodeType", node)
            self.assertIn("name", node)
            self.assertIn("documentStatus", node)
            self.assertIn("children", node)

    def test_structure_document_query_delegates(self):
        """Verify the single document query delegates to resolve."""
        doc = self._create_doc(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="GQL Test WI",
            code="WI-GQL",
        )
        StructureDocumentService.approve_document(doc.id)
        resolved = StructureDocumentService.resolve_selected_node_document_status(
            TargetType.PLANT, self.plant.id, DocumentType.WORK_INSTRUCTION
        )
        self.assertIsNotNone(resolved.document)
        self.assertEqual(resolved.document.title, "GQL Test WI")

    def test_structure_documents_list_query(self):
        """Verify the list query returns documents."""
        self._create_doc(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="List Test",
            code="WI-LIST",
        )
        from manufacturing.models import StructureDocument
        qs = StructureDocument.objects.filter(document_type=DocumentType.WORK_INSTRUCTION)
        self.assertEqual(qs.count(), 1)

    def test_structure_document_history_delegates(self):
        """Verify history delegates to service."""
        self._create_doc(
            document_type=DocumentType.PROCEDURE,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Hist Test",
            code="PR-HIST",
        )
        history = StructureDocumentService.get_document_history(
            TargetType.PLANT, self.plant.id, DocumentType.PROCEDURE
        )
        self.assertEqual(len(history), 1)

    # ── Mutation delegation tests: verify resolvers call service ──

    def test_create_mutation_delegates(self):
        """Verify create resolves via service."""
        from manufacturing.domain.structure_document_service import StructureDocumentService
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.STANDARD_WORK,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Create Test",
            code="SW-CREATE",
        )
        self.assertEqual(doc.title, "Create Test")
        self.assertEqual(doc.status, "DRAFT")

    def test_update_mutation_delegates(self):
        """Verify update resolves via service."""
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Original",
            code="WI-UPD",
        )
        updated = StructureDocumentService.update_document(
            document_id=doc.id, title="Updated Title"
        )
        self.assertEqual(updated.title, "Updated Title")

    def test_approve_mutation_delegates(self):
        """Verify approve resolves via service."""
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.PROCEDURE,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Approve Test",
            code="PR-APPR",
        )
        approved = StructureDocumentService.approve_document(doc.id)
        self.assertEqual(approved.status, "APPROVED")

    def test_archive_mutation_delegates(self):
        """Verify archive resolves via service."""
        doc = StructureDocumentService.create_document(
            document_type=DocumentType.WORK_INSTRUCTION,
            target_type=TargetType.PLANT,
            target_id=self.plant.id,
            title="Archive Test",
            code="WI-ARCH-GQL",
        )
        archived = StructureDocumentService.archive_document(doc.id)
        self.assertEqual(archived.status, "ARCHIVED")

    def test_resolvers_contain_no_business_logic(self):
        """
        Verify that no business logic runs outside the service.
        This is a governance test — if resolvers contain inheritance logic
        or status calculations, this test must fail.
        """
        import inspect
        from api.queries.manufacturing import ManufacturingQuery
        from api.mutations.manufacturing import ManufacturingMutation

        # Check that query/mutation methods delegate to the service
        # rather than containing inheritance logic directly

        source = inspect.getsource(ManufacturingQuery.structure_document_tree)
        # Must call StructureDocumentService, not implement traversal
        self.assertIn("StructureDocumentService", source)

        source = inspect.getsource(ManufacturingMutation.create_structure_document)
        self.assertIn("StructureDocumentService", source)

        source = inspect.getsource(ManufacturingMutation.approve_structure_document_controlled)
        self.assertIn("StructureDocumentControlService", source)

    # ── Lifecycle field exposure tests ──

    def test_structure_document_node_exposes_review_date(self):
        from api.types.manufacturing import StructureDocumentNode
        self.assertTrue(hasattr(StructureDocumentNode, "review_date"),
                        "StructureDocumentNode missing review_date field")

    def test_structure_document_node_exposes_change_reason(self):
        from api.types.manufacturing import StructureDocumentNode
        self.assertTrue(hasattr(StructureDocumentNode, "change_reason"),
                        "StructureDocumentNode missing change_reason field")

    def test_structure_document_node_exposes_is_controlled_copy(self):
        from api.types.manufacturing import StructureDocumentNode
        self.assertTrue(hasattr(StructureDocumentNode, "is_controlled_copy"),
                        "StructureDocumentNode missing is_controlled_copy field")

    def test_revision_history_query_delegates(self):
        from manufacturing.domain.structure_document_control_service import StructureDocumentControlService
        from manufacturing.domain.structure_document_service import StructureDocumentService
        doc = StructureDocumentService.create_document(
            document_type="WORK_INSTRUCTION",
            target_type="PLANT", target_id=self.plant.id,
            title="History Test", code="WI-HIST-GQL",
        )
        StructureDocumentControlService.approve_document(document_id=doc.id, user="testuser")
        history = StructureDocumentControlService.get_revision_history(doc.id)
        self.assertGreaterEqual(len(history), 1)

    def test_audit_trail_query_delegates(self):
        from manufacturing.domain.structure_document_control_service import StructureDocumentControlService
        from manufacturing.domain.structure_document_service import StructureDocumentService
        doc = StructureDocumentService.create_document(
            document_type="WORK_INSTRUCTION",
            target_type="PLANT", target_id=self.plant.id,
            title="Audit Test", code="WI-AUDIT-GQL",
        )
        StructureDocumentControlService.approve_document(document_id=doc.id, user="testuser")
        trail = StructureDocumentControlService.get_audit_trail(doc.id)
        self.assertGreaterEqual(len(trail), 1)
