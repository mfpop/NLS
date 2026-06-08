"""Tests for template-driven audit system."""
from io import StringIO
from django.test import TestCase
from django.core.management import call_command

from manufacturing.models.audit import (
    AuditTemplate, AuditTemplateCategory, AuditTemplateQuestion,
    Audit, AuditAnswer, AuditFinding,
    TemplateStatus, ModuleScope, AuditStatus,
    Severity, FindingStatus,
)
from manufacturing.models import Company, Plant, ProductionLine
from manufacturing.domain.audit_service import AuditTemplateService, AuditService, AuditServiceError


def _create_plant() -> Plant:
    """Helper: create a Company + Plant for target validation."""
    company = Company.objects.create(code="TESTCO", name="Test Company")
    return Plant.objects.create(company=company, code="TESTPL", name="Test Plant")


def _create_production_line(plant: Plant) -> ProductionLine:
    """Helper: create a ProductionLine under the given Plant."""
    return ProductionLine.objects.create(
        plant=plant, code="TESTLN", name="Test Line"
    )


class AuditTemplateServiceTests(TestCase):
    """Test the AuditTemplateService."""

    def setUp(self):
        AuditTemplate.objects.all().delete()

    def test_installs_all_5_templates(self):
        templates = AuditTemplateService.install_default_production_control_templates()
        self.assertEqual(len(templates), 5)
        self.assertEqual(AuditTemplate.objects.count(), 5)

    def test_install_is_idempotent(self):
        AuditTemplateService.install_default_production_control_templates()
        count1 = AuditTemplate.objects.count()
        AuditTemplateService.install_default_production_control_templates()
        count2 = AuditTemplate.objects.count()
        self.assertEqual(count1, count2)

    def test_install_sets_templates_active(self):
        AuditTemplateService.install_default_production_control_templates()
        for t in AuditTemplate.objects.all():
            self.assertEqual(t.status, TemplateStatus.ACTIVE)

    def test_install_creates_sections_and_questions(self):
        AuditTemplateService.install_default_production_control_templates()
        for t in AuditTemplate.objects.all():
            cats = t.categories.all()
            self.assertGreater(cats.count(), 0)
            for c in cats:
                qs = c.questions.all()
                self.assertGreater(qs.count(), 0)

    def test_install_sets_module_scope(self):
        AuditTemplateService.install_default_production_control_templates()
        for t in AuditTemplate.objects.all():
            self.assertEqual(t.module_scope, ModuleScope.PRODUCTION_CONTROL)

    def test_activate_and_archive_template(self):
        AuditTemplateService.install_default_production_control_templates()
        t = AuditTemplate.objects.first()
        AuditTemplateService.archive_template(t.id)
        t.refresh_from_db()
        self.assertEqual(t.status, TemplateStatus.ARCHIVED)
        AuditTemplateService.activate_template(t.id)
        t.refresh_from_db()
        self.assertEqual(t.status, TemplateStatus.ACTIVE)

    def test_clone_template_version(self):
        AuditTemplateService.install_default_production_control_templates()
        t = AuditTemplate.objects.first()
        clone = AuditTemplateService.clone_template_version(t.id)
        self.assertNotEqual(clone.id, t.id)
        self.assertEqual(clone.version, t.version + 1)
        self.assertEqual(clone.categories.count(), t.categories.count())


class ManagementCommandTests(TestCase):
    """Test the management command."""

    def setUp(self):
        AuditTemplate.objects.all().delete()

    def test_command_installs_templates(self):
        out = StringIO()
        call_command("install_production_control_audit_templates", stdout=out)
        output = out.getvalue()
        self.assertEqual(AuditTemplate.objects.count(), 5)
        self.assertTrue(
            "5" in output or "Created" in output or "Active" in output
        )

    def test_command_is_idempotent(self):
        call_command("install_production_control_audit_templates")
        call_command("install_production_control_audit_templates")
        self.assertEqual(AuditTemplate.objects.count(), 5)


class AuditServiceTemplateAuditTests(TestCase):
    """Test AuditService.create_audit_from_template and related flows."""

    def setUp(self):
        AuditTemplate.objects.all().delete()
        Audit.objects.all().delete()
        AuditAnswer.objects.all().delete()
        self.plant = _create_plant()
        self.production_line = _create_production_line(self.plant)
        AuditTemplateService.install_default_production_control_templates()

    def _create_audit(self, template=None, title="Test Audit", target_type=None, target_id=None):
        t = template or AuditTemplate.objects.filter(status=TemplateStatus.ACTIVE).first()
        return AuditService.create_audit_from_template(
            template_id=t.id,
            target_type=target_type or "PRODUCTION_LINE",
            target_id=target_id or self.production_line.id,
            title=title,
        )

    def test_create_audit_from_template_links_template(self):
        t = AuditTemplate.objects.filter(status=TemplateStatus.ACTIVE).first()
        audit = self._create_audit(template=t)
        self.assertEqual(audit.template_id, t.id)
        self.assertEqual(audit.status, AuditStatus.DRAFT)

    def test_create_audit_from_inactive_template_raises_error(self):
        t = AuditTemplate.objects.first()
        AuditTemplateService.archive_template(t.id)
        with self.assertRaises(AuditServiceError):
            AuditService.create_audit_from_template(
                template_id=t.id,
                target_type="PRODUCTION_LINE",
                target_id=self.production_line.id,
                title="Should Fail",
            )

    def test_create_audit_from_template_creates_answers(self):
        t = AuditTemplate.objects.filter(status=TemplateStatus.ACTIVE).first()
        total_questions = AuditTemplateQuestion.objects.filter(category__template=t).count()
        audit = self._create_audit()
        answer_count = AuditAnswer.objects.filter(audit=audit).count()
        self.assertEqual(answer_count, total_questions)

    def test_save_answer_updates_value(self):
        audit = self._create_audit()
        answer = AuditAnswer.objects.filter(audit=audit).first()
        updated = AuditService.save_answer(
            audit_id=audit.id,
            question_id=answer.template_question_id,
            answer_value="PASS",
            comment="Looking good",
        )
        self.assertEqual(updated.answer_value, "PASS")
        self.assertEqual(updated.comment, "Looking good")

    def test_calculate_score_no_answers(self):
        audit = self._create_audit()
        score = AuditService.calculate_score(audit.id)
        self.assertIsNone(score)

    def test_calculate_score_all_pass(self):
        audit = self._create_audit()
        answers = AuditAnswer.objects.filter(audit=audit)
        for a in answers:
            AuditService.save_answer(audit.id, a.template_question_id, "PASS")
        score = AuditService.calculate_score(audit.id)
        self.assertEqual(score, 100.0)

    def test_required_answers_block_completion(self):
        t = AuditTemplate.objects.filter(status=TemplateStatus.ACTIVE).first()
        req_q = AuditTemplateQuestion.objects.filter(
            category__template=t, is_required=True
        ).first()
        self.assertIsNotNone(req_q)
        audit = self._create_audit()
        with self.assertRaises(AuditServiceError):
            AuditService.complete_audit(audit.id)

    def test_complete_audit_success(self):
        audit = self._create_audit(title="Complete Test")
        answers = AuditAnswer.objects.filter(audit=audit)
        for a in answers:
            AuditService.save_answer(audit.id, a.template_question_id, "PASS")
        AuditService.calculate_score(audit.id)
        completed = AuditService.complete_audit(audit.id)
        self.assertEqual(completed.status, AuditStatus.COMPLETED)
        self.assertIsNotNone(completed.score)

    def test_create_finding_from_answer(self):
        audit = self._create_audit(title="Finding Test")
        answer = AuditAnswer.objects.filter(audit=audit).first()
        finding = AuditService.create_finding_from_answer(
            audit_id=audit.id,
            answer_id=answer.id,
            description="Non-conformance found",
            severity="HIGH",
        )
        self.assertEqual(finding.audit_id, audit.id)
        self.assertEqual(finding.answer_id, answer.id)
        self.assertEqual(finding.severity, "HIGH")
        self.assertEqual(finding.status, FindingStatus.OPEN)

    def test_complete_audit_creates_checklist_items(self):
        """Verify completing audit creates legacy checklist items for compatibility."""
        audit = self._create_audit(title="Checklist Test")
        answers = AuditAnswer.objects.filter(audit=audit)
        for a in answers:
            AuditService.save_answer(audit.id, a.template_question_id, "PASS")
        AuditService.calculate_score(audit.id)
        completed = AuditService.complete_audit(audit.id)
        checklist = list(completed.checklist_items.all())
        self.assertGreater(len(checklist), 0)

    def test_list_audits_by_control_area(self):
        self._create_audit(title="Audit A")
        results = AuditService.list_audits(control_area="PRODUCTION")
        self.assertGreaterEqual(len(results), 1)
        results2 = AuditService.list_audits(control_area="QUALITY")
        self.assertEqual(len(results2), 0)

    def test_list_audits_by_status(self):
        self._create_audit(title="Audit A")
        results = AuditService.list_audits(status="DRAFT")
        self.assertGreaterEqual(len(results), 1)
        results2 = AuditService.list_audits(status="COMPLETED")
        self.assertEqual(len(results2), 0)
