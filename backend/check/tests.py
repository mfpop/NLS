from django.test import TestCase

from check.models import (
    Problem, Action,
    ProductionCheck, ProductionChecklistItem,
    QualityCheck, QualityChecklistItem,
    DMR, RMA,
    SafetyCheck, SafetyChecklistItem, SafetyIncident,
    MaterialCheck, MaterialChecklistItem, MaterialIssue,
)
from check.services import (
    ProblemService,
    ActionService,
    ProductionControlService,
    QualityControlService,
    SafetyControlService,
    MaterialControlService,
)
from check.exceptions import (
    ProblemNotFoundError, ActionNotFoundError,
    ProductionCheckNotFoundError, QualityCheckNotFoundError,
    DMRNotFoundError, RMANotFoundError,
    SafetyCheckNotFoundError, SafetyIncidentNotFoundError,
    MaterialCheckNotFoundError, MaterialIssueNotFoundError,
    InvalidStatusTransitionError,
    InvalidTargetError,
    CheckValidationError,
)
from check.constants import (
    PROBLEM_STATUS_OPEN, PROBLEM_STATUS_IN_REVIEW,
    PROBLEM_STATUS_CONTAINED, PROBLEM_STATUS_CLOSED, PROBLEM_STATUS_CANCELLED,
    PROBLEM_TYPE_PRODUCTION, PROBLEM_TYPE_QUALITY, PROBLEM_TYPE_SAFETY,
    PROBLEM_TYPE_MATERIAL, PROBLEM_TYPE_GENERAL,
    ACTION_STATUS_OPEN, ACTION_STATUS_IN_PROGRESS, ACTION_STATUS_DONE,
    ACTION_STATUS_CANCELLED, ACTION_PRIORITY_MEDIUM, ACTION_PRIORITY_HIGH,
    CHECK_STATUS_DRAFT, CHECK_STATUS_COMPLETED,
    CHECKLIST_RESULT_PASS, CHECKLIST_RESULT_FAIL,
    DMR_STATUS_OPEN, DMR_STATUS_UNDER_REVIEW, DMR_STATUS_DISPOSITIONED,
    DMR_STATUS_CLOSED, DMR_STATUS_CANCELLED,
    DMR_DISPOSITION_REWORK, DMR_DISPOSITION_SCRAP,
    RMA_STATUS_OPEN, RMA_STATUS_RECEIVED, RMA_STATUS_UNDER_REVIEW,
    RMA_STATUS_DISPOSITIONED, RMA_STATUS_CLOSED, RMA_STATUS_CANCELLED,
    INCIDENT_STATUS_OPEN, INCIDENT_STATUS_CONTAINED,
    INCIDENT_STATUS_UNDER_REVIEW, INCIDENT_STATUS_CLOSED,
    INCIDENT_STATUS_CANCELLED, INCIDENT_TYPE_NEAR_MISS,
    INCIDENT_TYPE_UNSAFE_CONDITION,
    MATERIAL_ISSUE_STATUS_OPEN, MATERIAL_ISSUE_STATUS_CONTAINED,
    MATERIAL_ISSUE_STATUS_RESOLVED, MATERIAL_ISSUE_STATUS_CLOSED,
    MATERIAL_ISSUE_STATUS_CANCELLED,
    MATERIAL_ISSUE_TYPE_SHORTAGE, MATERIAL_ISSUE_TYPE_WRONG_MATERIAL,
    PRODUCTION_CHECK_TYPE_FIVE_S, PRODUCTION_CHECK_TYPE_PROCESS_CHECK,
    QUALITY_CHECK_TYPE_INSPECTION, QUALITY_CHECK_TYPE_QUALITY_AUDIT,
    SAFETY_CHECK_TYPE_SAFETY_AUDIT, SAFETY_CHECK_TYPE_PPE_CHECK,
    MATERIAL_CHECK_TYPE_BIN_CHECK, MATERIAL_CHECK_TYPE_FIFO_CHECK,
    APPROVED_TARGET_TYPES,
)


# ──────────────────────────────────────────────
#  Problem Tests
# ──────────────────────────────────────────────

class ProblemServiceTest(TestCase):
    def setUp(self):
        self.service = ProblemService()
        self.problem = self.service.create_problem(
            title="Test Problem",
            description="A test problem",
            problem_type=PROBLEM_TYPE_PRODUCTION,
            target_type="PLANT",
            target_id=1,
        )

    def test_create_problem(self):
        p = self.service.create_problem(
            title="New Problem",
            problem_type=PROBLEM_TYPE_QUALITY,
            target_type="PRODUCTION_LINE",
            target_id=42,
        )
        self.assertIsNotNone(p.id)
        self.assertEqual(p.title, "New Problem")
        self.assertEqual(p.problem_type, PROBLEM_TYPE_QUALITY)
        self.assertEqual(p.target_type, "PRODUCTION_LINE")
        self.assertEqual(p.target_id, 42)
        self.assertEqual(p.status, PROBLEM_STATUS_OPEN)

    def test_create_problem_rejects_empty_title(self):
        with self.assertRaises(CheckValidationError):
            self.service.create_problem(title="", problem_type=PROBLEM_TYPE_GENERAL, target_type="PLANT")

    def test_create_problem_rejects_invalid_target_type(self):
        with self.assertRaises(InvalidTargetError):
            self.service.create_problem(
                title="Bad Target", problem_type=PROBLEM_TYPE_GENERAL,
                target_type="InvalidType",
            )

    def test_create_problem_accepts_all_approved_targets(self):
        for t in APPROVED_TARGET_TYPES:
            p = self.service.create_problem(
                title=f"Problem for {t}",
                problem_type=PROBLEM_TYPE_GENERAL,
                target_type=t,
                target_id=1,
            )
            self.assertEqual(p.target_type, t)

    def test_update_problem(self):
        updated = self.service.update_problem(self.problem.id, title="Updated Problem")
        self.assertEqual(updated.title, "Updated Problem")

    def test_review_problem(self):
        p = self.service.review_problem(self.problem.id)
        self.assertEqual(p.status, PROBLEM_STATUS_IN_REVIEW)

    def test_contain_problem(self):
        self.service.review_problem(self.problem.id)
        p = self.service.contain_problem(self.problem.id)
        self.assertEqual(p.status, PROBLEM_STATUS_CONTAINED)

    def test_close_problem(self):
        self.service.review_problem(self.problem.id)
        self.service.contain_problem(self.problem.id)
        p = self.service.close_problem(self.problem.id)
        self.assertEqual(p.status, PROBLEM_STATUS_CLOSED)

    def test_cancel_problem(self):
        p = self.service.cancel_problem(self.problem.id)
        self.assertEqual(p.status, PROBLEM_STATUS_CANCELLED)

    def test_invalid_transition_contain_from_open(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.contain_problem(self.problem.id)

    def test_full_lifecycle(self):
        p = self.problem
        self.assertEqual(p.status, PROBLEM_STATUS_OPEN)
        p = self.service.review_problem(p.id)
        self.assertEqual(p.status, PROBLEM_STATUS_IN_REVIEW)
        p = self.service.contain_problem(p.id)
        self.assertEqual(p.status, PROBLEM_STATUS_CONTAINED)
        p = self.service.close_problem(p.id)
        self.assertEqual(p.status, PROBLEM_STATUS_CLOSED)

    def test_list_problems(self):
        results = self.service.list_problems()
        self.assertGreaterEqual(len(results), 1)

    def test_get_nonexistent_problem(self):
        p = self.service.get_problem(99999)
        self.assertIsNone(p)

    def test_get_nonexistent_problem_raises(self):
        with self.assertRaises(ProblemNotFoundError):
            self.service._get(99999)


# ──────────────────────────────────────────────
#  Action Tests
# ──────────────────────────────────────────────

class ActionServiceTest(TestCase):
    def setUp(self):
        self.service = ActionService()
        self.action = self.service.create_action(
            title="Test Action",
            description="A test action",
            owner="Test Owner",
            priority=ACTION_PRIORITY_MEDIUM,
        )

    def test_create_action(self):
        a = self.service.create_action(
            title="New Action",
            description="Do something",
            owner="Jane",
            priority=ACTION_PRIORITY_HIGH,
        )
        self.assertIsNotNone(a.id)
        self.assertEqual(a.title, "New Action")
        self.assertEqual(a.status, ACTION_STATUS_OPEN)

    def test_create_action_rejects_empty_title(self):
        with self.assertRaises(CheckValidationError):
            self.service.create_action(title="")

    def test_update_action(self):
        updated = self.service.update_action(self.action.id, title="Updated Action")
        self.assertEqual(updated.title, "Updated Action")

    def test_start_action(self):
        a = self.service.start_action(self.action.id)
        self.assertEqual(a.status, ACTION_STATUS_IN_PROGRESS)

    def test_complete_action(self):
        self.service.start_action(self.action.id)
        a = self.service.complete_action(self.action.id)
        self.assertEqual(a.status, ACTION_STATUS_DONE)
        self.assertIsNotNone(a.completed_at)

    def test_cancel_action(self):
        a = self.service.cancel_action(self.action.id)
        self.assertEqual(a.status, ACTION_STATUS_CANCELLED)

    def test_complete_from_open_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.complete_action(self.action.id)

    def test_start_completed_fails(self):
        self.service.start_action(self.action.id)
        self.service.complete_action(self.action.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.start_action(self.action.id)

    def test_full_lifecycle(self):
        a = self.action
        self.assertEqual(a.status, ACTION_STATUS_OPEN)
        a = self.service.start_action(a.id)
        self.assertEqual(a.status, ACTION_STATUS_IN_PROGRESS)
        a = self.service.complete_action(a.id)
        self.assertEqual(a.status, ACTION_STATUS_DONE)

    def test_get_nonexistent_action_raises(self):
        with self.assertRaises(ActionNotFoundError):
            self.service._get(99999)

    def test_list_actions(self):
        results = self.service.list_actions()
        self.assertGreaterEqual(len(results), 1)


# ──────────────────────────────────────────────
#  Production Check Tests
# ──────────────────────────────────────────────

class ProductionCheckServiceTest(TestCase):
    def setUp(self):
        self.service = ProductionControlService()
        self.check = self.service.create_production_check(
            title="5S Check",
            check_type=PRODUCTION_CHECK_TYPE_FIVE_S,
            target_type="PLANT",
            target_id=1,
        )

    def test_create_production_check(self):
        c = self.service.create_production_check(
            title="Process Check",
            check_type=PRODUCTION_CHECK_TYPE_PROCESS_CHECK,
            target_type="PRODUCTION_LINE",
            target_id=10,
        )
        self.assertIsNotNone(c.id)
        self.assertEqual(c.status, CHECK_STATUS_DRAFT)

    def test_create_rejects_empty_title(self):
        with self.assertRaises(CheckValidationError):
            self.service.create_production_check(
                title="", check_type=PRODUCTION_CHECK_TYPE_FIVE_S, target_type="PLANT",
            )

    def test_create_rejects_invalid_target(self):
        with self.assertRaises(InvalidTargetError):
            self.service.create_production_check(
                title="Bad", check_type=PRODUCTION_CHECK_TYPE_FIVE_S,
                target_type="INVALID",
            )

    def test_add_and_update_checklist_item(self):
        item = self.service.add_checklist_item(
            self.check.id, question="Is the area clean?",
        )
        self.assertIsNotNone(item.id)
        self.assertEqual(item.question, "Is the area clean?")

        updated = self.service.update_checklist_item(item.id, result=CHECKLIST_RESULT_PASS)
        self.assertEqual(updated.result, CHECKLIST_RESULT_PASS)

    def test_complete_check_calculates_score(self):
        self.service.add_checklist_item(self.check.id, question="Q1", result=CHECKLIST_RESULT_PASS)
        self.service.add_checklist_item(self.check.id, question="Q2", result=CHECKLIST_RESULT_FAIL)
        self.service.add_checklist_item(self.check.id, question="Q3", result=CHECKLIST_RESULT_PASS)
        c = self.service.complete_production_check(self.check.id)
        self.assertEqual(c.status, CHECK_STATUS_COMPLETED)
        self.assertAlmostEqual(c.score, 66.6666666, places=4)  # 2/3 * 100

    def test_complete_check_with_no_items(self):
        c = self.service.complete_production_check(self.check.id)
        self.assertEqual(c.status, CHECK_STATUS_COMPLETED)
        self.assertEqual(c.score, 0)

    def test_complete_already_completed_fails(self):
        self.service.complete_production_check(self.check.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.complete_production_check(self.check.id)

    def test_get_nonexistent_raises(self):
        with self.assertRaises(ProductionCheckNotFoundError):
            self.service._get(99999)

    def test_list_production_checks(self):
        results = self.service.list_production_checks()
        self.assertGreaterEqual(len(results), 1)


# ──────────────────────────────────────────────
#  Quality Check Tests
# ──────────────────────────────────────────────

class QualityCheckServiceTest(TestCase):
    def setUp(self):
        self.service = QualityControlService()
        self.check = self.service.create_quality_check(
            title="Quality Audit",
            check_type=QUALITY_CHECK_TYPE_INSPECTION,
            target_type="PLANT",
            target_id=1,
        )

    def test_create_quality_check(self):
        c = self.service.create_quality_check(
            title="Defect Check",
            check_type=QUALITY_CHECK_TYPE_QUALITY_AUDIT,
            target_type="PRODUCTION_LINE",
        )
        self.assertIsNotNone(c.id)
        self.assertEqual(c.status, CHECK_STATUS_DRAFT)

    def test_add_checklist_item_and_complete(self):
        self.service.add_checklist_item(self.check.id, question="Q1", result=CHECKLIST_RESULT_PASS)
        self.service.add_checklist_item(self.check.id, question="Q2", result=CHECKLIST_RESULT_PASS)
        c = self.service.complete_quality_check(self.check.id)
        self.assertEqual(c.status, CHECK_STATUS_COMPLETED)
        self.assertEqual(c.score, 100.0)

    def test_get_nonexistent_raises(self):
        with self.assertRaises(QualityCheckNotFoundError):
            self.service._get_check(99999)


# ──────────────────────────────────────────────
#  DMR Tests
# ──────────────────────────────────────────────

class DMRServiceTest(TestCase):
    def setUp(self):
        self.service = QualityControlService()
        self.dmr = self.service.create_dmr(
            dmr_number="DMR-001",
            title="Defective batch",
            target_type="PLANT",
            target_id=1,
        )

    def test_create_dmr(self):
        d = self.service.create_dmr(
            dmr_number="DMR-002",
            title="Second DMR",
            target_type="PRODUCTION_LINE",
        )
        self.assertIsNotNone(d.id)
        self.assertEqual(d.status, DMR_STATUS_OPEN)

    def test_create_dmr_rejects_empty_number(self):
        with self.assertRaises(CheckValidationError):
            self.service.create_dmr(dmr_number="", title="No Number", target_type="PLANT")

    def test_review_dmr(self):
        d = self.service.review_dmr(self.dmr.id)
        self.assertEqual(d.status, DMR_STATUS_UNDER_REVIEW)

    def test_disposition_dmr(self):
        self.service.review_dmr(self.dmr.id)
        d = self.service.disposition_dmr(self.dmr.id, DMR_DISPOSITION_REWORK)
        self.assertEqual(d.status, DMR_STATUS_DISPOSITIONED)
        self.assertEqual(d.disposition, DMR_DISPOSITION_REWORK)

    def test_close_dmr(self):
        self.service.review_dmr(self.dmr.id)
        self.service.disposition_dmr(self.dmr.id, DMR_DISPOSITION_SCRAP)
        d = self.service.close_dmr(self.dmr.id)
        self.assertEqual(d.status, DMR_STATUS_CLOSED)

    def test_cancel_dmr(self):
        d = self.service.cancel_dmr(self.dmr.id)
        self.assertEqual(d.status, DMR_STATUS_CANCELLED)

    def test_disposition_from_open_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.disposition_dmr(self.dmr.id, DMR_DISPOSITION_REWORK)

    def test_get_nonexistent_raises(self):
        with self.assertRaises(DMRNotFoundError):
            self.service._get_dmr(99999)

    def test_full_lifecycle(self):
        d = self.dmr
        self.assertEqual(d.status, DMR_STATUS_OPEN)
        d = self.service.review_dmr(d.id)
        self.assertEqual(d.status, DMR_STATUS_UNDER_REVIEW)
        d = self.service.disposition_dmr(d.id, DMR_DISPOSITION_SCRAP)
        self.assertEqual(d.status, DMR_STATUS_DISPOSITIONED)
        d = self.service.close_dmr(d.id)
        self.assertEqual(d.status, DMR_STATUS_CLOSED)


# ──────────────────────────────────────────────
#  RMA Tests
# ──────────────────────────────────────────────

class RMAServiceTest(TestCase):
    def setUp(self):
        self.service = QualityControlService()
        self.rma = self.service.create_rma(
            rma_number="RMA-001",
            customer_name="Acme Corp",
        )

    def test_create_rma(self):
        r = self.service.create_rma(
            rma_number="RMA-002",
            customer_name="Beta Inc",
            reason="Wrong part shipped",
        )
        self.assertIsNotNone(r.id)
        self.assertEqual(r.status, RMA_STATUS_OPEN)

    def test_create_rma_rejects_empty_number(self):
        with self.assertRaises(CheckValidationError):
            self.service.create_rma(rma_number="", customer_name="Acme")

    def test_create_rma_rejects_empty_customer(self):
        with self.assertRaises(CheckValidationError):
            self.service.create_rma(rma_number="RMA-003", customer_name="")

    def test_receive_rma(self):
        r = self.service.receive_rma(self.rma.id)
        self.assertEqual(r.status, RMA_STATUS_RECEIVED)
        self.assertIsNotNone(r.received_date)

    def test_review_rma(self):
        self.service.receive_rma(self.rma.id)
        r = self.service.review_rma(self.rma.id)
        self.assertEqual(r.status, RMA_STATUS_UNDER_REVIEW)

    def test_disposition_rma(self):
        self.service.receive_rma(self.rma.id)
        self.service.review_rma(self.rma.id)
        r = self.service.disposition_rma(self.rma.id, DMR_DISPOSITION_REWORK)
        self.assertEqual(r.status, RMA_STATUS_DISPOSITIONED)
        self.assertEqual(r.disposition, DMR_DISPOSITION_REWORK)

    def test_close_rma(self):
        self.service.receive_rma(self.rma.id)
        self.service.review_rma(self.rma.id)
        self.service.disposition_rma(self.rma.id, DMR_DISPOSITION_SCRAP)
        r = self.service.close_rma(self.rma.id)
        self.assertEqual(r.status, RMA_STATUS_CLOSED)

    def test_cancel_rma(self):
        r = self.service.cancel_rma(self.rma.id)
        self.assertEqual(r.status, RMA_STATUS_CANCELLED)

    def test_disposition_from_received_fails(self):
        self.service.receive_rma(self.rma.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.disposition_rma(self.rma.id, DMR_DISPOSITION_REWORK)

    def test_get_nonexistent_raises(self):
        with self.assertRaises(RMANotFoundError):
            self.service._get_rma(99999)

    def test_full_lifecycle(self):
        r = self.rma
        self.assertEqual(r.status, RMA_STATUS_OPEN)
        r = self.service.receive_rma(r.id)
        self.assertEqual(r.status, RMA_STATUS_RECEIVED)
        r = self.service.review_rma(r.id)
        self.assertEqual(r.status, RMA_STATUS_UNDER_REVIEW)
        r = self.service.disposition_rma(r.id, DMR_DISPOSITION_REWORK)
        self.assertEqual(r.status, RMA_STATUS_DISPOSITIONED)
        r = self.service.close_rma(r.id)
        self.assertEqual(r.status, RMA_STATUS_CLOSED)


# ──────────────────────────────────────────────
#  Safety Check Tests
# ──────────────────────────────────────────────

class SafetyCheckServiceTest(TestCase):
    def setUp(self):
        self.service = SafetyControlService()
        self.check = self.service.create_safety_check(
            title="Safety Audit",
            check_type=SAFETY_CHECK_TYPE_SAFETY_AUDIT,
            target_type="PLANT",
            target_id=1,
        )

    def test_create_safety_check(self):
        c = self.service.create_safety_check(
            title="PPE Check",
            check_type=SAFETY_CHECK_TYPE_PPE_CHECK,
            target_type="PRODUCTION_LINE",
        )
        self.assertIsNotNone(c.id)
        self.assertEqual(c.status, CHECK_STATUS_DRAFT)

    def test_add_checklist_item_and_complete(self):
        self.service.add_checklist_item(self.check.id, question="Helmets worn?", result=CHECKLIST_RESULT_PASS)
        c = self.service.complete_safety_check(self.check.id)
        self.assertEqual(c.status, CHECK_STATUS_COMPLETED)
        self.assertEqual(c.score, 100.0)

    def test_get_nonexistent_raises(self):
        with self.assertRaises(SafetyCheckNotFoundError):
            self.service._get_check(99999)


# ──────────────────────────────────────────────
#  Safety Incident Tests
# ──────────────────────────────────────────────

class SafetyIncidentServiceTest(TestCase):
    def setUp(self):
        self.service = SafetyControlService()
        self.incident = self.service.create_safety_incident(
            title="Near miss on line 3",
            incident_type=INCIDENT_TYPE_NEAR_MISS,
            target_type="PLANT",
            target_id=1,
        )

    def test_create_safety_incident(self):
        i = self.service.create_safety_incident(
            title="Unsafe condition",
            incident_type=INCIDENT_TYPE_UNSAFE_CONDITION,
            target_type="PRODUCTION_LINE",
        )
        self.assertIsNotNone(i.id)
        self.assertEqual(i.status, INCIDENT_STATUS_OPEN)

    def test_contain_incident(self):
        i = self.service.contain_safety_incident(self.incident.id)
        self.assertEqual(i.status, INCIDENT_STATUS_CONTAINED)

    def test_review_incident(self):
        self.service.contain_safety_incident(self.incident.id)
        i = self.service.review_safety_incident(self.incident.id)
        self.assertEqual(i.status, INCIDENT_STATUS_UNDER_REVIEW)

    def test_close_incident(self):
        self.service.contain_safety_incident(self.incident.id)
        self.service.review_safety_incident(self.incident.id)
        i = self.service.close_safety_incident(self.incident.id)
        self.assertEqual(i.status, INCIDENT_STATUS_CLOSED)

    def test_cancel_incident(self):
        i = self.service.cancel_safety_incident(self.incident.id)
        self.assertEqual(i.status, INCIDENT_STATUS_CANCELLED)

    def test_full_lifecycle(self):
        i = self.incident
        self.assertEqual(i.status, INCIDENT_STATUS_OPEN)
        i = self.service.contain_safety_incident(i.id)
        self.assertEqual(i.status, INCIDENT_STATUS_CONTAINED)
        i = self.service.review_safety_incident(i.id)
        self.assertEqual(i.status, INCIDENT_STATUS_UNDER_REVIEW)
        i = self.service.close_safety_incident(i.id)
        self.assertEqual(i.status, INCIDENT_STATUS_CLOSED)

    def test_close_from_open_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.close_safety_incident(self.incident.id)

    def test_get_nonexistent_raises(self):
        with self.assertRaises(SafetyIncidentNotFoundError):
            self.service._get_incident(99999)


# ──────────────────────────────────────────────
#  Material Check Tests
# ──────────────────────────────────────────────

class MaterialCheckServiceTest(TestCase):
    def setUp(self):
        self.service = MaterialControlService()
        self.check = self.service.create_material_check(
            title="Bin Check",
            check_type=MATERIAL_CHECK_TYPE_BIN_CHECK,
            target_type="PLANT",
            target_id=1,
        )

    def test_create_material_check(self):
        c = self.service.create_material_check(
            title="FIFO Check",
            check_type=MATERIAL_CHECK_TYPE_FIFO_CHECK,
            target_type="PRODUCTION_LINE",
        )
        self.assertIsNotNone(c.id)
        self.assertEqual(c.status, CHECK_STATUS_DRAFT)

    def test_add_checklist_item_and_complete(self):
        self.service.add_checklist_item(self.check.id, question="Bins labeled?", result=CHECKLIST_RESULT_PASS)
        c = self.service.complete_material_check(self.check.id)
        self.assertEqual(c.status, CHECK_STATUS_COMPLETED)
        self.assertEqual(c.score, 100.0)

    def test_get_nonexistent_raises(self):
        with self.assertRaises(MaterialCheckNotFoundError):
            self.service._get_check(99999)


# ──────────────────────────────────────────────
#  Material Issue Tests
# ──────────────────────────────────────────────

class MaterialIssueServiceTest(TestCase):
    def setUp(self):
        self.service = MaterialControlService()
        self.issue = self.service.create_material_issue(
            title="Shortage on line 3",
            issue_type=MATERIAL_ISSUE_TYPE_SHORTAGE,
            target_type="PLANT",
            target_id=1,
        )

    def test_create_material_issue(self):
        i = self.service.create_material_issue(
            title="Wrong material delivered",
            issue_type=MATERIAL_ISSUE_TYPE_WRONG_MATERIAL,
            target_type="PRODUCTION_LINE",
        )
        self.assertIsNotNone(i.id)
        self.assertEqual(i.status, MATERIAL_ISSUE_STATUS_OPEN)

    def test_contain_issue(self):
        i = self.service.contain_material_issue(self.issue.id)
        self.assertEqual(i.status, MATERIAL_ISSUE_STATUS_CONTAINED)

    def test_resolve_issue(self):
        self.service.contain_material_issue(self.issue.id)
        i = self.service.resolve_material_issue(self.issue.id)
        self.assertEqual(i.status, MATERIAL_ISSUE_STATUS_RESOLVED)

    def test_close_issue(self):
        self.service.contain_material_issue(self.issue.id)
        self.service.resolve_material_issue(self.issue.id)
        i = self.service.close_material_issue(self.issue.id)
        self.assertEqual(i.status, MATERIAL_ISSUE_STATUS_CLOSED)

    def test_cancel_issue(self):
        i = self.service.cancel_material_issue(self.issue.id)
        self.assertEqual(i.status, MATERIAL_ISSUE_STATUS_CANCELLED)

    def test_full_lifecycle(self):
        i = self.issue
        self.assertEqual(i.status, MATERIAL_ISSUE_STATUS_OPEN)
        i = self.service.contain_material_issue(i.id)
        self.assertEqual(i.status, MATERIAL_ISSUE_STATUS_CONTAINED)
        i = self.service.resolve_material_issue(i.id)
        self.assertEqual(i.status, MATERIAL_ISSUE_STATUS_RESOLVED)
        i = self.service.close_material_issue(i.id)
        self.assertEqual(i.status, MATERIAL_ISSUE_STATUS_CLOSED)

    def test_resolve_from_open_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.resolve_material_issue(self.issue.id)

    def test_get_nonexistent_raises(self):
        with self.assertRaises(MaterialIssueNotFoundError):
            self.service._get_issue(99999)
