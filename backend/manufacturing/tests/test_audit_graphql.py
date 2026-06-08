from django.test import TestCase
from django.contrib.auth.models import User
from manufacturing.models import (
    Company, Plant, ProductionLine, Department, ResourceGroup, Resource,
)
from manufacturing.models.audit import (
    Audit, AuditChecklistItem, AuditFinding,
    AuditTemplate, AuditTemplateCategory, AuditTemplateQuestion,
    AuditType, AuditStatus, ChecklistResult, Severity, FindingStatus,
)
from manufacturing.domain.audit_service import AuditService, AuditTemplateService, AuditServiceError


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

    def test_reject_missing_target_id(self):
        with self.assertRaises(AuditServiceError) as ctx:
            AuditService.create_audit(
                audit_type=AuditType.SAFETY,
                target_type="PLANT",
                target_id=99999,
                title="Missing",
            )
        self.assertEqual(ctx.exception.code, "TARGET_NOT_FOUND")

    # ── Score calculation (numeric 0-5) ──

    def test_score_calculation_excludes_na(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.FIVE_S,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Score Test",
        )
        AuditService.add_checklist_item(audit.id, "Item 1", score=3)
        AuditService.add_checklist_item(audit.id, "Item 2", score=1)
        AuditService.add_checklist_item(audit.id, "Item 3", is_na=True)
        AuditService.add_checklist_item(audit.id, "Item 4", score=5)
        audit.refresh_from_db()
        # 3 applicable (3+1+5) / (3*5) * 100 = 9/15*100 = 60.0
        self.assertAlmostEqual(audit.score, 60.0, places=1)

    def test_score_no_applicable_items(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="NA Only",
        )
        AuditService.add_checklist_item(audit.id, "Item 1", is_na=True)
        audit.refresh_from_db()
        self.assertIsNone(audit.score)

    def test_score_all_max(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.QUALITY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="All Max",
        )
        AuditService.add_checklist_item(audit.id, "Q1", score=5)
        AuditService.add_checklist_item(audit.id, "Q2", score=5)
        audit.refresh_from_db()
        self.assertEqual(audit.score, 100.0)

    def test_score_recalculates_after_checklist_add(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Recalc Add",
        )
        AuditService.add_checklist_item(audit.id, "Item 1", score=5)
        audit.refresh_from_db()
        self.assertEqual(audit.score, 100.0)
        AuditService.add_checklist_item(audit.id, "Item 2", score=0)
        audit.refresh_from_db()
        self.assertAlmostEqual(audit.score, 50.0)

    def test_score_recalculates_after_checklist_update(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Recalc Update",
        )
        item1 = AuditService.add_checklist_item(audit.id, "Item 1", score=5)
        AuditService.add_checklist_item(audit.id, "Item 2", score=1)
        audit.refresh_from_db()
        self.assertAlmostEqual(audit.score, 60.0)
        AuditService.update_checklist_item(item1.id, score=0)
        audit.refresh_from_db()
        self.assertAlmostEqual(audit.score, 10.0)

    def test_reject_invalid_score(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Bad Score",
        )
        with self.assertRaises(AuditServiceError) as ctx:
            AuditService.add_checklist_item(audit.id, "Q", score=6)
        self.assertEqual(ctx.exception.code, "INVALID_SCORE")

    # ── Complete audit ──

    def test_complete_audit_succeeds(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.FIVE_S,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Complete Test",
        )
        AuditService.add_checklist_item(audit.id, "Q1", score=4)
        AuditService.add_checklist_item(audit.id, "Q2", score=3)
        completed = AuditService.complete_audit(audit.id)
        self.assertEqual(completed.status, AuditStatus.COMPLETED)
        self.assertIsNotNone(completed.score)

    def test_complete_audit_blocked_unanswered(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.FIVE_S,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Unanswered Test",
        )
        AuditService.add_checklist_item(audit.id, "Q1", score=4)
        AuditService.add_checklist_item(audit.id, "Q2")  # no score, not NA
        with self.assertRaises(AuditServiceError) as ctx:
            AuditService.complete_audit(audit.id)
        self.assertEqual(ctx.exception.code, "UNANSWERED_ITEMS")

    def test_complete_audit_blocked_already_completed(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.FIVE_S,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Already Done",
        )
        AuditService.add_checklist_item(audit.id, "Q1", score=5)
        AuditService.complete_audit(audit.id)
        with self.assertRaises(AuditServiceError) as ctx:
            AuditService.complete_audit(audit.id)
        self.assertEqual(ctx.exception.code, "ALREADY_COMPLETED")

    # ── Add checklist item with score —─

    def test_add_checklist_item_with_score_and_na(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Score Item",
        )
        item = AuditService.add_checklist_item(audit.id, "Question?", score=4)
        self.assertEqual(item.score, 4)
        self.assertFalse(item.is_na)
        na_item = AuditService.add_checklist_item(audit.id, "N/A Q", is_na=True)
        self.assertTrue(na_item.is_na)
        self.assertIsNone(na_item.score)

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


class AuditTemplateTest(TestCase):

    def setUp(self):
        self.plant = Plant.objects.create(
            code="TPL", name="Template Plant",
            company=Company.objects.create(code="TC", name="Template Co", status="ACTIVE"),
            status="ACTIVE",
        )

    def test_seed_5s_template_creates_correct_count(self):
        template = AuditTemplateService.seed_5s_template()
        self.assertEqual(template.code, "PC_5S_AUDIT")
        self.assertEqual(template.audit_type, AuditType.FIVE_S)
        cats = template.categories.all()
        self.assertEqual(cats.count(), 5)
        total_qs = sum(c.questions.count() for c in cats)
        self.assertEqual(total_qs, 25)

    def test_seed_5s_template_is_idempotent(self):
        t1 = AuditTemplateService.seed_5s_template()
        t2 = AuditTemplateService.seed_5s_template()
        self.assertEqual(t1.id, t2.id)
        self.assertEqual(t2.categories.count(), 5)

    def test_get_active_template(self):
        AuditTemplateService.seed_5s_template()
        t = AuditTemplateService.get_active_template(AuditType.FIVE_S)
        self.assertIsNotNone(t)
        self.assertEqual(t.audit_type, AuditType.FIVE_S)

    def test_create_audit_from_template_initializes_25_items(self):
        AuditTemplateService.seed_5s_template()
        template = AuditTemplateService.get_active_template(AuditType.FIVE_S)
        audit = AuditService.create_audit_from_template(
            template_id=template.id,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Template Audit",
        )
        self.assertEqual(audit.checklist_items.count(), 25)
        self.assertEqual(audit.audit_type, AuditType.FIVE_S)

    def test_create_audit_from_template_scores_work(self):
        AuditTemplateService.seed_5s_template()
        template = AuditTemplateService.get_active_template(AuditType.FIVE_S)
        audit = AuditService.create_audit_from_template(
            template_id=template.id,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Score Template",
        )
        self.assertEqual(audit.checklist_items.count(), 25)
        items = list(audit.checklist_items.all())
        self.assertIsNone(items[0].score)
        self.assertFalse(items[0].is_na)
        # score all items
        for item in items:
            AuditService.update_checklist_item(item.id, score=4)
        audit.refresh_from_db()
        self.assertAlmostEqual(audit.score, 80.0)


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

    # ── Query delegation ──

    def test_audits_query_delegates(self):
        from manufacturing.domain.audit_service import AuditService
        audits = AuditService.list_audits()
        self.assertIsInstance(audits, list)

    def test_audit_query_delegates(self):
        from manufacturing.domain.audit_service import AuditService
        audit = AuditService.create_audit(
            audit_type=AuditType.FIVE_S,
            target_type="PLANT",
            target_id=self.plant.id,
            title="GQL Audit",
        )
        result = AuditService.get_audit(audit.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.title, "GQL Audit")

    def test_audit_template_query_delegates(self):
        template = AuditTemplateService.seed_5s_template()
        result = AuditTemplateService.get_template(template.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.code, "PC_5S_AUDIT")

    def test_audit_templates_query_delegates(self):
        AuditTemplateService.seed_5s_template()
        templates = AuditTemplateService.list_templates()
        self.assertGreaterEqual(len(templates), 1)

    # ── Mutation delegation ──

    def test_create_audit_from_template_delegates(self):
        AuditTemplateService.seed_5s_template()
        template = AuditTemplateService.get_active_template(AuditType.FIVE_S)
        audit = AuditService.create_audit_from_template(
            template_id=template.id,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Template Test",
        )
        self.assertEqual(audit.title, "Template Test")
        self.assertEqual(audit.checklist_items.count(), 25)

    def test_complete_audit_delegates(self):
        audit = AuditService.create_audit(
            audit_type=AuditType.SAFETY,
            target_type="PLANT",
            target_id=self.plant.id,
            title="Complete Delegation",
        )
        item = AuditService.add_checklist_item(audit.id, "Q1", score=5)
        completed = AuditService.complete_audit(audit.id)
        self.assertEqual(completed.status, "COMPLETED")
        self.assertIsNotNone(completed.score)

    # ── Governance: resolvers contain no business/score logic ──

    def test_resolvers_contain_no_business_logic(self):
        import inspect
        from api.mutations.manufacturing import ManufacturingMutation
        from api.queries.manufacturing import ManufacturingQuery

        audit_mutation_names = [
            "create_audit", "update_audit",
            "create_audit_from_template", "complete_audit",
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

        template_query_names = ["audit_templates", "audit_template"]
        for name in template_query_names:
            source = inspect.getsource(getattr(ManufacturingQuery, name))
            self.assertIn("AuditTemplateService", source,
                          f"{name} does not delegate to AuditTemplateService")
