from django.test import TestCase
from improvement.models import A3PDCA, A3PDCAAction, Kaizen
from improvement.services.application.a3_pdca_service import A3PDCAService
from improvement.exceptions import (
    A3PDCANotFoundError,
    A3PDCAActionNotFoundError,
    InvalidStatusTransitionError,
    InvalidTargetError,
    ImprovementValidationError,
)
from improvement.constants import (
    A3_PHASE_DRAFT,
    A3_PHASE_PLAN,
    A3_PHASE_DO,
    A3_PHASE_CHECK,
    A3_PHASE_ACT,
    A3_STATUS_COMPLETED,
    A3_STATUS_CANCELLED,
    A3_ACTION_STATUS_OPEN,
    A3_ACTION_STATUS_DONE,
    A3_ACTION_STATUS_CANCELLED,
    APPROVED_TARGET_TYPES,
)
from datetime import date


class A3PDCAServiceTest(TestCase):
    def setUp(self):
        self.service = A3PDCAService()
        self.a3 = self.service.create_a3_pdca(
            title="Reduce changeover time",
            background="Changeover times have increased 40% over 6 months",
            problem_statement="Current changeover averages 47 minutes",
            current_condition="47 min avg, no standard work",
            target_condition="Under 20 min with SMED",
            root_cause_analysis="Worn tooling, no standard procedure",
            countermeasures="SMED workshop, shadow boards, quick clamps",
            implementation_plan="Week 1-2: analyze, Week 3-4: implement",
            target_type="Plant",
            target_id=1,
            owner="Test Owner",
            priority="HIGH",
        )

    # ── Create ──

    def test_create_a3_pdca(self):
        a3 = self.service.create_a3_pdca(
            title="New A3",
            background="Issue background",
            problem_statement="Problem definition",
            current_condition="Current state",
            target_condition="Target state",
            root_cause_analysis="Root cause",
            countermeasures="Actions",
            implementation_plan="Timeline",
            target_type="ProductionLine",
            target_id=42,
            owner="Jane",
            priority="MEDIUM",
        )
        self.assertIsNotNone(a3.id)
        self.assertEqual(a3.title, "New A3")
        self.assertEqual(a3.background, "Issue background")
        self.assertEqual(a3.problem_statement, "Problem definition")
        self.assertEqual(a3.current_condition, "Current state")
        self.assertEqual(a3.target_condition, "Target state")
        self.assertEqual(a3.root_cause_analysis, "Root cause")
        self.assertEqual(a3.countermeasures, "Actions")
        self.assertEqual(a3.implementation_plan, "Timeline")
        self.assertEqual(a3.target_type, "ProductionLine")
        self.assertEqual(a3.target_id, 42)
        self.assertEqual(a3.owner, "Jane")
        self.assertEqual(a3.priority, "MEDIUM")
        self.assertEqual(a3.status, A3_PHASE_DRAFT)

    def test_create_a3_pdca_rejects_empty_title(self):
        with self.assertRaises(ImprovementValidationError):
            self.service.create_a3_pdca(title="")

    def test_create_a3_pdca_rejects_invalid_target(self):
        with self.assertRaises(InvalidTargetError):
            self.service.create_a3_pdca(
                title="Bad",
                target_type="InvalidType",
            )

    def test_create_a3_pdca_accepts_all_approved_targets(self):
        for t in APPROVED_TARGET_TYPES:
            a3 = self.service.create_a3_pdca(
                title=f"A3 for {t}",
                target_type=t,
                target_id=1,
            )
            self.assertEqual(a3.target_type, t)

    # ── Update ──

    def test_update_a3_pdca_title(self):
        updated = self.service.update_a3_pdca(self.a3.id, title="Updated A3")
        self.assertEqual(updated.title, "Updated A3")

    def test_update_a3_pdca_plan_fields(self):
        updated = self.service.update_a3_pdca(
            self.a3.id,
            background="New background",
            problem_statement="New problem",
            root_cause_analysis="New root cause",
        )
        self.assertEqual(updated.background, "New background")
        self.assertEqual(updated.problem_statement, "New problem")
        self.assertEqual(updated.root_cause_analysis, "New root cause")

    def test_update_a3_pdca_do_check_act_fields(self):
        updated = self.service.update_a3_pdca(
            self.a3.id,
            do_notes="Started implementation",
            blockers="Waiting for parts",
            result_validation="80% improvement achieved",
            standardization_actions="Updated standard work",
            lessons_learned="Need better planning",
        )
        self.assertEqual(updated.do_notes, "Started implementation")
        self.assertEqual(updated.blockers, "Waiting for parts")
        self.assertEqual(updated.result_validation, "80% improvement achieved")
        self.assertEqual(updated.standardization_actions, "Updated standard work")
        self.assertEqual(updated.lessons_learned, "Need better planning")

    def test_update_a3_pdca_rejects_invalid_target(self):
        with self.assertRaises(InvalidTargetError):
            self.service.update_a3_pdca(
                self.a3.id,
                target_type="InvalidType",
            )

    def test_update_nonexistent_a3(self):
        with self.assertRaises(A3PDCANotFoundError):
            self.service.update_a3_pdca(99999, title="Ghost")

    # ── Phase transitions ──

    def test_move_to_plan(self):
        moved = self.service.move_to_plan(self.a3.id)
        self.assertEqual(moved.status, A3_PHASE_PLAN)

    def test_move_to_do(self):
        self.service.move_to_plan(self.a3.id)
        moved = self.service.move_to_do(self.a3.id)
        self.assertEqual(moved.status, A3_PHASE_DO)

    def test_move_to_check(self):
        self.service.move_to_plan(self.a3.id)
        self.service.move_to_do(self.a3.id)
        moved = self.service.move_to_check(self.a3.id)
        self.assertEqual(moved.status, A3_PHASE_CHECK)

    def test_move_to_act(self):
        self.service.move_to_plan(self.a3.id)
        self.service.move_to_do(self.a3.id)
        self.service.move_to_check(self.a3.id)
        moved = self.service.move_to_act(self.a3.id)
        self.assertEqual(moved.status, A3_PHASE_ACT)

    def test_complete_a3_pdca(self):
        self.service.move_to_plan(self.a3.id)
        completed = self.service.complete_a3_pdca(self.a3.id)
        self.assertEqual(completed.status, A3_STATUS_COMPLETED)
        self.assertEqual(completed.completed_date, date.today())

    def test_cancel_a3_pdca_from_draft(self):
        cancelled = self.service.cancel_a3_pdca(self.a3.id)
        self.assertEqual(cancelled.status, A3_STATUS_CANCELLED)

    def test_cancel_from_mid_cycle(self):
        self.service.move_to_plan(self.a3.id)
        self.service.move_to_do(self.a3.id)
        cancelled = self.service.cancel_a3_pdca(self.a3.id)
        self.assertEqual(cancelled.status, A3_STATUS_CANCELLED)

    def test_full_pdca_cycle(self):
        """DRAFT → PLAN → DO → CHECK → ACT → COMPLETED"""
        a3 = self.a3
        self.assertEqual(a3.status, A3_PHASE_DRAFT)

        a3 = self.service.move_to_plan(a3.id)
        self.assertEqual(a3.status, A3_PHASE_PLAN)

        a3 = self.service.move_to_do(a3.id)
        self.assertEqual(a3.status, A3_PHASE_DO)

        a3 = self.service.move_to_check(a3.id)
        self.assertEqual(a3.status, A3_PHASE_CHECK)

        a3 = self.service.move_to_act(a3.id)
        self.assertEqual(a3.status, A3_PHASE_ACT)

        a3 = self.service.complete_a3_pdca(a3.id)
        self.assertEqual(a3.status, A3_STATUS_COMPLETED)

    # ── Invalid transitions ──

    def test_move_completed_a3_fails(self):
        self.service.move_to_plan(self.a3.id)
        self.service.complete_a3_pdca(self.a3.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.move_to_do(self.a3.id)

    def test_move_cancelled_a3_fails(self):
        self.service.cancel_a3_pdca(self.a3.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.move_to_plan(self.a3.id)

    def test_complete_from_draft_succeeds(self):
        # Service allows completing from any non-terminal state
        completed = self.service.complete_a3_pdca(self.a3.id)
        self.assertEqual(completed.status, A3_STATUS_COMPLETED)

    def test_cancel_completed_fails(self):
        self.service.move_to_plan(self.a3.id)
        self.service.complete_a3_pdca(self.a3.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.cancel_a3_pdca(self.a3.id)

    # ── A3 Actions ──

    def test_add_a3_action(self):
        action = self.service.add_a3_action(
            self.a3.id,
            title="Conduct SMED training",
            phase="PLAN",
            description="Train all operators on SMED methodology",
            owner="Trainer",
            due_date=date(2026, 2, 1),
        )
        self.assertIsNotNone(action.id)
        self.assertEqual(action.a3_pdca_id, self.a3.id)
        self.assertEqual(action.title, "Conduct SMED training")
        self.assertEqual(action.phase, "PLAN")
        self.assertEqual(action.description, "Train all operators on SMED methodology")
        self.assertEqual(action.owner, "Trainer")
        self.assertEqual(action.due_date, date(2026, 2, 1))
        self.assertEqual(action.status, A3_ACTION_STATUS_OPEN)

    def test_add_action_with_defaults(self):
        action = self.service.add_a3_action(
            self.a3.id,
            title="Simple action",
        )
        self.assertEqual(action.title, "Simple action")
        self.assertEqual(action.phase, "")
        self.assertEqual(action.description, "")
        self.assertEqual(action.owner, "")
        self.assertIsNone(action.due_date)
        self.assertEqual(action.status, A3_ACTION_STATUS_OPEN)

    def test_add_action_to_nonexistent_a3(self):
        with self.assertRaises(A3PDCANotFoundError):
            self.service.add_a3_action(99999, title="Ghost")

    def test_add_actions_to_multiple_phases(self):
        plan = self.service.add_a3_action(self.a3.id, title="Plan action", phase="PLAN")
        do = self.service.add_a3_action(self.a3.id, title="Do action", phase="DO")
        check = self.service.add_a3_action(self.a3.id, title="Check action", phase="CHECK")
        act = self.service.add_a3_action(self.a3.id, title="Act action", phase="ACT")
        self.assertEqual(plan.phase, "PLAN")
        self.assertEqual(do.phase, "DO")
        self.assertEqual(check.phase, "CHECK")
        self.assertEqual(act.phase, "ACT")

    def test_update_a3_action(self):
        action = self.service.add_a3_action(
            self.a3.id,
            title="Original",
            owner="User A",
        )
        updated = self.service.update_a3_action(
            action.id,
            title="Updated",
            owner="User B",
        )
        self.assertEqual(updated.title, "Updated")
        self.assertEqual(updated.owner, "User B")

    def test_update_nonexistent_a3_action(self):
        with self.assertRaises(A3PDCAActionNotFoundError):
            self.service.update_a3_action(99999, title="Ghost")

    def test_complete_a3_action(self):
        action = self.service.add_a3_action(self.a3.id, title="Do it")
        done = self.service.complete_a3_action(action.id)
        self.assertEqual(done.status, A3_ACTION_STATUS_DONE)

    def test_complete_nonexistent_a3_action(self):
        with self.assertRaises(A3PDCAActionNotFoundError):
            self.service.complete_a3_action(99999)

    def test_cancel_a3_action(self):
        action = self.service.add_a3_action(self.a3.id, title="Cancel it")
        cancelled = self.service.cancel_a3_action(action.id)
        self.assertEqual(cancelled.status, A3_ACTION_STATUS_CANCELLED)

    def test_cancel_nonexistent_a3_action(self):
        with self.assertRaises(A3PDCAActionNotFoundError):
            self.service.cancel_a3_action(99999)

    # ── List / Get ──

    def test_list_a3_pdca(self):
        results = self.service.list_a3_pdca()
        self.assertGreaterEqual(len(results), 1)

    def test_list_a3_pdca_with_status_filter(self):
        results = self.service.list_a3_pdca({"status": A3_PHASE_DRAFT})
        self.assertGreaterEqual(len(results), 1)
        results = self.service.list_a3_pdca({"status": A3_STATUS_COMPLETED})
        self.assertEqual(len(results), 0)

    def test_list_a3_pdca_with_search(self):
        results = self.service.list_a3_pdca({"search": "changeover"})
        self.assertGreaterEqual(len(results), 1)

    def test_get_a3_pdca(self):
        a3 = self.service.get_a3_pdca(self.a3.id)
        self.assertIsNotNone(a3)
        self.assertEqual(a3.title, "Reduce changeover time")

    def test_get_nonexistent_a3(self):
        a3 = self.service.get_a3_pdca(99999)
        self.assertIsNone(a3)
