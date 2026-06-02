from django.test import TestCase
from improvement.services.application.a3_pdca_service import A3PDCAService
from improvement.exceptions import (
    A3PDCANotFoundError,
    A3PDCAActionNotFoundError,
    InvalidStatusTransitionError,
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
)
from datetime import date


class A3TransitionsEdgeCasesTest(TestCase):
    """Tests phase transition edge cases beyond the basic DRAFT→PLAN→DO→CHECK→ACT→COMPLETED flow."""

    def setUp(self):
        self.service = A3PDCAService()
        self.a3 = self.service.create_a3_pdca(
            title="Transition Edge Cases",
            background="Test background",
            problem_statement="Test problem",
            current_condition="Current",
            target_condition="Target",
            root_cause_analysis="Root cause",
            countermeasures="Actions",
            implementation_plan="Timeline",
            target_type="Plant",
            target_id=1,
        )

    # ── Complete from each prior phase ──

    def test_complete_from_plan(self):
        self.service.move_to_plan(self.a3.id)
        completed = self.service.complete_a3_pdca(self.a3.id)
        self.assertEqual(completed.status, A3_STATUS_COMPLETED)
        self.assertEqual(completed.completed_date, date.today())

    def test_complete_from_do(self):
        self.service.move_to_plan(self.a3.id)
        self.service.move_to_do(self.a3.id)
        completed = self.service.complete_a3_pdca(self.a3.id)
        self.assertEqual(completed.status, A3_STATUS_COMPLETED)

    def test_complete_from_check(self):
        self.service.move_to_plan(self.a3.id)
        self.service.move_to_do(self.a3.id)
        self.service.move_to_check(self.a3.id)
        completed = self.service.complete_a3_pdca(self.a3.id)
        self.assertEqual(completed.status, A3_STATUS_COMPLETED)

    def test_complete_from_act(self):
        self.service.move_to_plan(self.a3.id)
        self.service.move_to_do(self.a3.id)
        self.service.move_to_check(self.a3.id)
        self.service.move_to_act(self.a3.id)
        completed = self.service.complete_a3_pdca(self.a3.id)
        self.assertEqual(completed.status, A3_STATUS_COMPLETED)

    def test_complete_from_draft(self):
        """Service allows completing from DRAFT (non-terminal)."""
        completed = self.service.complete_a3_pdca(self.a3.id)
        self.assertEqual(completed.status, A3_STATUS_COMPLETED)

    # ── Cancel from each non-terminal phase ──

    def test_cancel_from_plan(self):
        self.service.move_to_plan(self.a3.id)
        cancelled = self.service.cancel_a3_pdca(self.a3.id)
        self.assertEqual(cancelled.status, A3_STATUS_CANCELLED)

    def test_cancel_from_do(self):
        self.service.move_to_plan(self.a3.id)
        self.service.move_to_do(self.a3.id)
        cancelled = self.service.cancel_a3_pdca(self.a3.id)
        self.assertEqual(cancelled.status, A3_STATUS_CANCELLED)

    def test_cancel_from_check(self):
        self.service.move_to_plan(self.a3.id)
        self.service.move_to_do(self.a3.id)
        self.service.move_to_check(self.a3.id)
        cancelled = self.service.cancel_a3_pdca(self.a3.id)
        self.assertEqual(cancelled.status, A3_STATUS_CANCELLED)

    def test_cancel_from_act(self):
        self.service.move_to_plan(self.a3.id)
        self.service.move_to_do(self.a3.id)
        self.service.move_to_check(self.a3.id)
        self.service.move_to_act(self.a3.id)
        cancelled = self.service.cancel_a3_pdca(self.a3.id)
        self.assertEqual(cancelled.status, A3_STATUS_CANCELLED)

    # ── Terminal state rejects ALL transitions ──

    def test_completed_rejects_all_transitions(self):
        self.service.move_to_plan(self.a3.id)
        self.service.complete_a3_pdca(self.a3.id)
        rejected_ops = [
            ("move_to_plan", lambda: self.service.move_to_plan(self.a3.id)),
            ("move_to_do", lambda: self.service.move_to_do(self.a3.id)),
            ("move_to_check", lambda: self.service.move_to_check(self.a3.id)),
            ("move_to_act", lambda: self.service.move_to_act(self.a3.id)),
            ("complete_a3_pdca", lambda: self.service.complete_a3_pdca(self.a3.id)),
            ("cancel_a3_pdca", lambda: self.service.cancel_a3_pdca(self.a3.id)),
        ]
        for name, op in rejected_ops:
            with self.subTest(op=name):
                with self.assertRaises(
                    InvalidStatusTransitionError,
                    msg=f"Expected InvalidStatusTransitionError for {name} on completed A3"
                ):
                    op()

    def test_cancelled_rejects_all_transitions(self):
        self.service.cancel_a3_pdca(self.a3.id)
        rejected_ops = [
            ("move_to_plan", lambda: self.service.move_to_plan(self.a3.id)),
            ("move_to_do", lambda: self.service.move_to_do(self.a3.id)),
            ("move_to_check", lambda: self.service.move_to_check(self.a3.id)),
            ("move_to_act", lambda: self.service.move_to_act(self.a3.id)),
            ("complete_a3_pdca", lambda: self.service.complete_a3_pdca(self.a3.id)),
            ("cancel_a3_pdca", lambda: self.service.cancel_a3_pdca(self.a3.id)),
        ]
        for name, op in rejected_ops:
            with self.subTest(op=name):
                with self.assertRaises(
                    InvalidStatusTransitionError,
                    msg=f"Expected InvalidStatusTransitionError for {name} on cancelled A3"
                ):
                    op()

    # ── completed_date edge cases ──

    def test_completed_date_is_none_during_active_phases(self):
        self.a3.refresh_from_db()
        self.assertIsNone(self.a3.completed_date)

        self.service.move_to_plan(self.a3.id)
        self.a3.refresh_from_db()
        self.assertIsNone(self.a3.completed_date)

        self.service.move_to_do(self.a3.id)
        self.a3.refresh_from_db()
        self.assertIsNone(self.a3.completed_date)

        self.service.move_to_check(self.a3.id)
        self.a3.refresh_from_db()
        self.assertIsNone(self.a3.completed_date)

        self.service.move_to_act(self.a3.id)
        self.a3.refresh_from_db()
        self.assertIsNone(self.a3.completed_date)

    def test_completed_date_set_on_complete(self):
        self.service.move_to_plan(self.a3.id)
        self.service.complete_a3_pdca(self.a3.id)
        self.a3.refresh_from_db()
        self.assertEqual(self.a3.completed_date, date.today())
        self.assertEqual(self.a3.status, A3_STATUS_COMPLETED)

    def test_completed_date_not_set_on_cancel(self):
        self.service.cancel_a3_pdca(self.a3.id)
        self.a3.refresh_from_db()
        self.assertIsNone(self.a3.completed_date)
        self.assertEqual(self.a3.status, A3_STATUS_CANCELLED)

    # ── Status field value correctness ──

    def test_status_field_values_are_exact(self):
        """Verify each transition sets the exact status string."""
        status_pairs = [
            (A3_PHASE_DRAFT, lambda: None),  # initial
            (A3_PHASE_PLAN, lambda: self.service.move_to_plan(self.a3.id)),
            (A3_PHASE_DO, lambda: self.service.move_to_do(self.a3.id)),
            (A3_PHASE_CHECK, lambda: self.service.move_to_check(self.a3.id)),
            (A3_PHASE_ACT, lambda: self.service.move_to_act(self.a3.id)),
        ]
        for phase, transition in status_pairs:
            if transition:
                transition()
            self.a3.refresh_from_db()
            self.assertEqual(self.a3.status, phase)


class A3ActionsEdgeCasesTest(TestCase):
    """Tests A3 action lifecycle edge cases — actions on terminal A3s, status transitions, etc."""

    def setUp(self):
        self.service = A3PDCAService()
        self.a3 = self.service.create_a3_pdca(
            title="Actions Edge Cases",
            background="Test",
            problem_statement="Test",
            current_condition="Current",
            target_condition="Target",
            root_cause_analysis="Root cause",
            countermeasures="Actions",
            implementation_plan="Timeline",
            target_type="Plant",
            target_id=1,
        )

    # ── Actions on completed A3 ──

    def test_add_action_to_completed_a3(self):
        """Service allows adding actions to completed A3 (follow-up actions)."""
        self.service.move_to_plan(self.a3.id)
        self.service.complete_a3_pdca(self.a3.id)
        action = self.service.add_a3_action(
            self.a3.id,
            title="Follow-up: monitor results",
            phase="ACT",
        )
        self.assertIsNotNone(action.id)
        self.assertEqual(action.title, "Follow-up: monitor results")
        self.assertEqual(action.status, A3_ACTION_STATUS_OPEN)

    def test_add_action_to_cancelled_a3(self):
        """Service allows adding actions to cancelled A3 (cleanup tasks)."""
        self.service.cancel_a3_pdca(self.a3.id)
        action = self.service.add_a3_action(
            self.a3.id,
            title="Cleanup after cancellation",
            phase="PLAN",
        )
        self.assertIsNotNone(action.id)
        self.assertEqual(action.title, "Cleanup after cancellation")

    def test_update_action_on_completed_a3(self):
        self.service.move_to_plan(self.a3.id)
        action = self.service.add_a3_action(self.a3.id, title="Original")
        self.service.complete_a3_pdca(self.a3.id)
        updated = self.service.update_a3_action(action.id, title="Post-completion update")
        self.assertEqual(updated.title, "Post-completion update")

    # ── Action double-complete / double-cancel ──

    def test_complete_already_done_action(self):
        """Service allows completing an already-DONE action (idempotent)."""
        action = self.service.add_a3_action(self.a3.id, title="Do it")
        self.service.complete_a3_action(action.id)
        # Complete again should not raise an error
        done_again = self.service.complete_a3_action(action.id)
        self.assertEqual(done_again.status, A3_ACTION_STATUS_DONE)

    def test_cancel_already_cancelled_action(self):
        """Service allows cancelling an already-CANCELLED action (idempotent)."""
        action = self.service.add_a3_action(self.a3.id, title="Cancel it")
        self.service.cancel_a3_action(action.id)
        cancelled_again = self.service.cancel_a3_action(action.id)
        self.assertEqual(cancelled_again.status, A3_ACTION_STATUS_CANCELLED)

    def test_cancel_done_action(self):
        """Service allows cancelling a DONE action (no status validation on actions)."""
        action = self.service.add_a3_action(self.a3.id, title="Was done, now cancelled")
        self.service.complete_a3_action(action.id)
        self.service.cancel_a3_action(action.id)
        action.refresh_from_db()
        self.assertEqual(action.status, A3_ACTION_STATUS_CANCELLED)

    def test_complete_cancelled_action(self):
        """Service allows completing a CANCELLED action (no status validation on actions)."""
        action = self.service.add_a3_action(self.a3.id, title="Was cancelled, now done")
        self.service.cancel_a3_action(action.id)
        self.service.complete_a3_action(action.id)
        action.refresh_from_db()
        self.assertEqual(action.status, A3_ACTION_STATUS_DONE)

    # ── Multiple actions lifecycle ──

    def test_multiple_actions_independent_lifecycles(self):
        """Actions on the same A3 have independent status transitions."""
        a1 = self.service.add_a3_action(self.a3.id, title="Action 1")
        a2 = self.service.add_a3_action(self.a3.id, title="Action 2")
        a3 = self.service.add_a3_action(self.a3.id, title="Action 3")

        # Complete a1, cancel a3, leave a2 open
        self.service.complete_a3_action(a1.id)
        self.service.cancel_a3_action(a3.id)

        a1.refresh_from_db()
        a2.refresh_from_db()
        a3.refresh_from_db()

        self.assertEqual(a1.status, A3_ACTION_STATUS_DONE)
        self.assertEqual(a2.status, A3_ACTION_STATUS_OPEN)
        self.assertEqual(a3.status, A3_ACTION_STATUS_CANCELLED)

    def test_actions_persist_across_a3_phase_transitions(self):
        """Actions created in early phases persist when A3 moves through phases."""
        a_plan = self.service.add_a3_action(self.a3.id, title="Plan action", phase="PLAN")
        self.service.move_to_plan(self.a3.id)
        a_do = self.service.add_a3_action(self.a3.id, title="Do action", phase="DO")
        self.service.move_to_do(self.a3.id)
        a_check = self.service.add_a3_action(self.a3.id, title="Check action", phase="CHECK")
        self.service.move_to_check(self.a3.id)
        self.service.complete_a3_action(a_plan.id)
        self.service.move_to_act(self.a3.id)

        # All actions should still exist with correct statuses
        a_plan.refresh_from_db()
        a_do.refresh_from_db()
        a_check.refresh_from_db()

        self.assertEqual(a_plan.status, A3_ACTION_STATUS_DONE)
        self.assertEqual(a_do.status, A3_ACTION_STATUS_OPEN)
        self.assertEqual(a_check.status, A3_ACTION_STATUS_OPEN)
        self.assertEqual(a_plan.phase, "PLAN")
        self.assertEqual(a_do.phase, "DO")
        self.assertEqual(a_check.phase, "CHECK")

    def test_actions_with_due_date_during_phases(self):
        """Actions due date doesn't affect A3 phase transitions."""
        action = self.service.add_a3_action(
            self.a3.id,
            title="Time-sensitive action",
            due_date=date(2025, 1, 1),  # far in the past
        )
        # A3 should still transition regardless of action due dates
        self.service.move_to_plan(self.a3.id)
        self.service.move_to_do(self.a3.id)
        self.service.complete_a3_pdca(self.a3.id)
        self.a3.refresh_from_db()
        self.assertEqual(self.a3.status, A3_STATUS_COMPLETED)


class A3MultipleRecordsIsolationTest(TestCase):
    """Tests that multiple A3 records with different statuses don't interfere."""

    def setUp(self):
        self.service = A3PDCAService()
        # Create A3s at different phases
        self.a3_draft = self.service.create_a3_pdca(
            title="Draft", target_type="Plant", target_id=1,
        )
        self.a3_plan = self.service.create_a3_pdca(
            title="Plan Phase", target_type="Plant", target_id=1,
        )
        self.service.move_to_plan(self.a3_plan.id)
        self.a3_do = self.service.create_a3_pdca(
            title="Do Phase", target_type="Plant", target_id=1,
        )
        self.service.move_to_plan(self.a3_do.id)
        self.service.move_to_do(self.a3_do.id)
        self.a3_done = self.service.create_a3_pdca(
            title="Completed", target_type="Plant", target_id=1,
        )
        self.service.move_to_plan(self.a3_done.id)
        self.service.complete_a3_pdca(self.a3_done.id)
        self.a3_cancelled = self.service.create_a3_pdca(
            title="Cancelled", target_type="Plant", target_id=1,
        )
        self.service.cancel_a3_pdca(self.a3_cancelled.id)

    def test_each_a3_has_correct_isolated_status(self):
        self.a3_draft.refresh_from_db()
        self.a3_plan.refresh_from_db()
        self.a3_do.refresh_from_db()
        self.a3_done.refresh_from_db()
        self.a3_cancelled.refresh_from_db()

        self.assertEqual(self.a3_draft.status, A3_PHASE_DRAFT)
        self.assertEqual(self.a3_plan.status, A3_PHASE_PLAN)
        self.assertEqual(self.a3_do.status, A3_PHASE_DO)
        self.assertEqual(self.a3_done.status, A3_STATUS_COMPLETED)
        self.assertEqual(self.a3_cancelled.status, A3_STATUS_CANCELLED)

    def test_transition_one_does_not_affect_others(self):
        """Moving one A3 to PLAN should not affect other A3s."""
        self.service.move_to_plan(self.a3_draft.id)

        self.a3_draft.refresh_from_db()
        self.a3_plan.refresh_from_db()
        self.a3_do.refresh_from_db()
        self.a3_done.refresh_from_db()
        self.a3_cancelled.refresh_from_db()

        self.assertEqual(self.a3_draft.status, A3_PHASE_PLAN)  # was DRAFT, now PLAN
        self.assertEqual(self.a3_plan.status, A3_PHASE_PLAN)   # unchanged
        self.assertEqual(self.a3_do.status, A3_PHASE_DO)       # unchanged
        self.assertEqual(self.a3_done.status, A3_STATUS_COMPLETED)  # unchanged
        self.assertEqual(self.a3_cancelled.status, A3_STATUS_CANCELLED)  # unchanged

    def test_list_filters_by_status(self):
        draft_results = self.service.list_a3_pdca({"status": A3_PHASE_DRAFT})
        self.assertEqual(len(draft_results), 1)
        self.assertEqual(draft_results[0].id, self.a3_draft.id)

        plan_results = self.service.list_a3_pdca({"status": A3_PHASE_PLAN})
        self.assertEqual(len(plan_results), 1)
        self.assertEqual(plan_results[0].id, self.a3_plan.id)

        done_results = self.service.list_a3_pdca({"status": A3_STATUS_COMPLETED})
        self.assertEqual(len(done_results), 1)
        self.assertEqual(done_results[0].id, self.a3_done.id)

        cancelled_results = self.service.list_a3_pdca({"status": A3_STATUS_CANCELLED})
        self.assertEqual(len(cancelled_results), 1)
        self.assertEqual(cancelled_results[0].id, self.a3_cancelled.id)

    def test_completed_date_only_for_completed_a3(self):
        """Only the completed A3 should have a completed_date set."""
        self.a3_draft.refresh_from_db()
        self.a3_plan.refresh_from_db()
        self.a3_do.refresh_from_db()
        self.a3_done.refresh_from_db()
        self.a3_cancelled.refresh_from_db()

        self.assertIsNone(self.a3_draft.completed_date)
        self.assertIsNone(self.a3_plan.completed_date)
        self.assertIsNone(self.a3_do.completed_date)
        self.assertEqual(self.a3_done.completed_date, date.today())
        self.assertIsNone(self.a3_cancelled.completed_date)

    def test_actions_belong_to_correct_a3(self):
        """Actions added to one A3 should not appear on another."""
        action_on_draft = self.service.add_a3_action(self.a3_draft.id, title="Draft action")
        action_on_done = self.service.add_a3_action(self.a3_done.id, title="Done action")

        draft_actions = list(self.a3_draft.actions.all())
        done_actions = list(self.a3_done.actions.all())

        self.assertEqual(len(draft_actions), 1)
        self.assertEqual(draft_actions[0].title, "Draft action")

        self.assertEqual(len(done_actions), 1)
        self.assertEqual(done_actions[0].title, "Done action")

    def test_get_a3_returns_correct_record(self):
        result_draft = self.service.get_a3_pdca(self.a3_draft.id)
        result_done = self.service.get_a3_pdca(self.a3_done.id)

        self.assertIsNotNone(result_draft)
        self.assertIsNotNone(result_done)
        self.assertEqual(result_draft.title, "Draft")
        self.assertEqual(result_done.title, "Completed")
        self.assertEqual(result_draft.status, A3_PHASE_DRAFT)
        self.assertEqual(result_done.status, A3_STATUS_COMPLETED)
