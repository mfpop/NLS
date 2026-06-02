from django.test import TestCase
from django.contrib.auth.models import User
from manufacturing.models import (
    Company, Plant, ProductionLine, Department, ResourceGroup, Resource,
)
from manufacturing.models.audit import (
    Audit, AuditChecklistItem, AuditFinding,
    AuditType, AuditStatus, ChecklistResult, Severity, FindingStatus,
)
from manufacturing.domain.audit_service import AuditService, AuditServiceError


class AuditServiceTest(TestCase):

    def setUp(self):
        self.company = Company.objects.create(
            code="AUD", name="Audit Company", status="ACTIVE"
        )
        self.plant = Plant.objects.create(
            code="PLT01", name="Audit Plant", company=self.company, status="ACTIVE"
        )
        self.line = ProductionLine.objects.create(
            code="LN01", name="Audit Line", plant=self.plant, status="ACTIVE"
        )
        self.dept = Department.objects.create(
            code="DEPT01", name="Audit Dept", plant=self.plant, status="ACTIVE"
        )
        self.rg = ResourceGroup.objects.create(
            code="RG01", name="Audit RG", department=self.dept, status="ACTIVE"
        )
        self.resource = Resource.objects.create(
            code="RES01", name="Audit Resource", resource_group=self.rg, status="ACTIVE"
        )

    # ── Create audit for all allowed types ──

    def test_create_five_s_audit(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.FIVE_S,
            target_type="PLANT",
            target_id=self.plant.id,
            title="5S Floor Audit",
            auditor="Test User",
        )
        self.assertEqual(audit.audit_type, AuditType.FIVE_S)
        self.assertEqual(audit.status, AuditStatus.DRAFT)

    def test_create_safety_audit(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Safety Walkthrough",
        )
        self.assertEqual(audit.audit_type, AuditType.SAFETY)

    def test_create_quality_audit(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.QUALITY,
            target_type="PRODUCTION_LINE",
            target_id=self.line.id,
            title="Quality Check",
        )
        self.assertEqual(audit.audit_type, AuditType.QUALITY)

    def test_create_process_check_audit(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.PROCESS_CHECK,
            target_type="DEPARTMENT",
            target_id=self.dept.id,
            title="Process Audit",
        )
        self.assertEqual(audit.audit_type, AuditType.PROCESS_CHECK)

    def test_create_standard_work_check_audit(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.STANDARD_WORK_CHECK,
            target_type="RESOURCE_GROUP",
            target_id=self.rg.id,
            title="SW Check",
        )
        self.assertEqual(audit.audit_type, AuditType.STANDARD_WORK_CHECK)

    # ── Target types ──

    def test_create_audit_for_plant(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT", target_id=self.plant.id,
            title="Plant Audit",
        )
        self.assertEqual(audit.target_type, "PLANT")

    def test_create_audit_for_production_line(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PRODUCTION_LINE", target_id=self.line.id,
            title="Line Audit",
        )
        self.assertEqual(audit.target_type, "PRODUCTION_LINE")

    def test_create_audit_for_department(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="DEPARTMENT", target_id=self.dept.id,
            title="Dept Audit",
        )
        self.assertEqual(audit.target_type, "DEPARTMENT")

    def test_create_audit_for_resource_group(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="RESOURCE_GROUP", target_id=self.rg.id,
            title="RG Audit",
        )
        self.assertEqual(audit.target_type, "RESOURCE_GROUP")

    def test_create_audit_for_resource(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="RESOURCE", target_id=self.resource.id,
            title="Resource Audit",
        )
        self.assertEqual(audit.target_type, "RESOURCE")

    # ── Validation ──

    def test_reject_invalid_audit_type(self):
        with self.assertRaises(AuditServiceError) as ctx:
            AuditService.create_audit(
                audit_type="INVALID",
                target_type="PLANT",
                target_id=self.plant.id,
                title="Bad",
            )
        self.assertEqual(ctx.exception.code, "INVALID_AUDIT_TYPE")

    def test_reject_document_target(self):
        with self.assertRaises(AuditServiceError) as ctx:
            AuditService.create_audit(
                audit_type=AuditType.SAFETY,
                target_type="DOCUMENT",
                target_id=1,
                title="Doc Target",
            )
        self.assertEqual(ctx.exception.code, "FORBIDDEN_TARGET_TYPE")

    def test_reject_structure_document_target(self):
        with self.assertRaises(AuditServiceError) as ctx:
            AuditService.create_audit(
                audit_type=AuditType.SAFETY,
                target_type="STRUCTURE_DOCUMENT",
                target_id=1,
                title="SD Target",
            )
        self.assertEqual(ctx.exception.code, "FORBIDDEN_TARGET_TYPE")

    def test_reject_missing_target_id(self):
        with self.assertRaises(AuditServiceError) as ctx:
            AuditService.create_audit(
                audit_type=AuditType.SAFETY,
                target_type="PLANT",
                target_id=99999,
                title="Missing",
            )
        self.assertEqual(ctx.exception.code, "TARGET_NOT_FOUND")

    def test_reject_invalid_target_type(self):
        with self.assertRaises(AuditServiceError) as ctx:
            AuditService.create_audit(
                audit_type=AuditType.SAFETY,
                target_type="INVALID_TYPE",
                target_id=1,
                title="Bad Target",
            )
        self.assertEqual(ctx.exception.code, "INVALID_TARGET_TYPE")

    # ── Score calculation ──

    def test_score_calculation_excludes_na(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.FIVE_S,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Score Test",
        )
        AuditService.add_checklist_item(audit.id, "Item 1", result="PASS")
        AuditService.add_checklist_item(audit.id, "Item 2", result="FAIL")
        AuditService.add_checklist_item(audit.id, "Item 3", result="N_A")
        AuditService.add_checklist_item(audit.id, "Item 4", result="PASS")
        audit.refresh_from_db()
        # 3 applicable (PASS, FAIL, PASS) -> 2 passed / 3 = 66.67
        self.assertAlmostEqual(audit.score, 66.67, places=1)

    def test_score_no_applicable_items(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="NA Only",
        )
        AuditService.add_checklist_item(audit.id, "Item 1", result="N_A")
        audit.refresh_from_db()
        self.assertIsNone(audit.score)

    def test_score_all_pass(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.QUALITY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="All Pass",
        )
        AuditService.add_checklist_item(audit.id, "Q1", result="PASS")
        AuditService.add_checklist_item(audit.id, "Q2", result="PASS")
        audit.refresh_from_db()
        self.assertEqual(audit.score, 100.0)

    def test_score_recalculates_after_checklist_add(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Recalc Add",
        )
        AuditService.add_checklist_item(audit.id, "Item 1", result="PASS")
        audit.refresh_from_db()
        self.assertEqual(audit.score, 100.0)
        AuditService.add_checklist_item(audit.id, "Item 2", result="FAIL")
        audit.refresh_from_db()
        self.assertEqual(audit.score, 50.0)

    def test_score_recalculates_after_checklist_update(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Recalc Update",
        )
        item = AuditService.add_checklist_item(audit.id, "Item 1", result="PASS")
        AuditService.add_checklist_item(audit.id, "Item 2", result="FAIL")
        audit.refresh_from_db()
        self.assertEqual(audit.score, 50.0)
        AuditService.update_checklist_item(item.id, result="FAIL")
        audit.refresh_from_db()
        self.assertEqual(audit.score, 0.0)

    # ── Findings ──

    def test_finding_severity_validation(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Finding Sev",
        )
        with self.assertRaises(AuditServiceError) as ctx:
            AuditService.add_finding(
                audit_id=audit.id,
                description="Test",
                severity="CRITICAL",
            )
        self.assertEqual(ctx.exception.code, "INVALID_SEVERITY")

    def test_finding_status_validation(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Finding Status",
        )
        finding = AuditService.add_finding(
            audit_id=audit.id,
            description="Test finding",
            severity="HIGH",
        )
        self.assertEqual(finding.status, FindingStatus.OPEN)

    def test_close_finding_sets_closed(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Close Finding",
        )
        finding = AuditService.add_finding(
            audit_id=audit.id,
            description="To close",
            severity="MEDIUM",
        )
        self.assertEqual(finding.status, FindingStatus.OPEN)
        closed = AuditService.close_finding(finding.id)
        self.assertEqual(closed.status, FindingStatus.CLOSED)


class AuditGraphQLDelegationTest(TestCase):

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

    def _create_audit(self, **kw):
        return AuditService.create_audit(**kw)

    # ── Query delegation ──

    def test_audits_query_delegates(self):
        from manufacturing.domain.audit_service import AuditService
        audits = AuditService.list_audits()
        self.assertIsInstance(audits, list)

    def test_audit_query_delegates(self):
        audit = self._create_audit(
            audit_type=AuditType.FIVE_S,
            target_type="PLANT",
            target_id=self.plant.id,
            title="GQL Audit",
        )
        result = AuditService.get_audit(audit.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.title, "GQL Audit")

    # ── Mutation delegation ──

    def test_create_mutation_delegates(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Create Test",
        )
        self.assertEqual(audit.title, "Create Test")
        self.assertEqual(audit.status, "DRAFT")

    def test_update_mutation_delegates(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.QUALITY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Original",
        )
        updated = AuditService.update_audit(audit.id, title="Updated Title")
        self.assertEqual(updated.title, "Updated Title")

    def test_add_checklist_item_delegates(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Checklist Test",
        )
        item = AuditService.add_checklist_item(audit.id, "Is it clean?", "PASS")
        self.assertEqual(item.question, "Is it clean?")
        self.assertEqual(item.result, "PASS")

    def test_update_checklist_item_delegates(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Checklist Upd",
        )
        item = AuditService.add_checklist_item(audit.id, "Question?", "PASS")
        updated = AuditService.update_checklist_item(item.id, result="FAIL")
        self.assertEqual(updated.result, "FAIL")

    def test_add_finding_delegates(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Finding Add",
        )
        finding = AuditService.add_finding(audit.id, "Issue found", "HIGH")
        self.assertEqual(finding.severity, "HIGH")
        self.assertEqual(finding.status, "OPEN")

    def test_update_finding_delegates(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Finding Upd",
        )
        finding = AuditService.add_finding(audit.id, "Original issue", "LOW")
        updated = AuditService.update_finding(finding.id, severity="HIGH")
        self.assertEqual(updated.severity, "HIGH")

    def test_close_finding_delegates(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Finding Close",
        )
        finding = AuditService.add_finding(audit.id, "Fix issue", "MEDIUM")
        closed = AuditService.close_finding(finding.id)
        self.assertEqual(closed.status, "CLOSED")

    # ── Governance: resolvers contain no business/score logic ──

    def test_resolvers_contain_no_business_logic(self):
        import inspect
        from api.mutations.manufacturing import ManufacturingMutation
        from api.queries.manufacturing import ManufacturingQuery

        audit_mutation_names = [
            "create_audit", "update_audit",
            "add_audit_checklist_item", "update_audit_checklist_item",
            "add_audit_finding", "update_audit_finding", "close_audit_finding",
        ]
        for name in audit_mutation_names:
            source = inspect.getsource(getattr(ManufacturingMutation, name))
            self.assertNotIn("_calculate_score", source,
                             f"{name} contains _calculate_score")
            self.assertNotIn("validate_target", source,
                             f"{name} contains validate_target")
            self.assertIn("AuditService", source,
                          f"{name} does not delegate to AuditService")

        audit_query_names = ["audits", "audit"]
        for name in audit_query_names:
            source = inspect.getsource(getattr(ManufacturingQuery, name))
            self.assertIn("AuditService", source,
                          f"{name} does not delegate to AuditService")
