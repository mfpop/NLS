from django.test import TestCase
from improvement.models import Kaizen, KaizenAction
from improvement.services.application.kaizen_service import KaizenService
from improvement.exceptions import (
    KaizenNotFoundError,
    KaizenActionNotFoundError,
    InvalidStatusTransitionError,
    InvalidTargetError,
    ImprovementValidationError,
)
from improvement.constants import (
    KAIZEN_STATUS_PLANNED,
    KAIZEN_STATUS_IN_PROGRESS,
    KAIZEN_STATUS_COMPLETED,
    KAIZEN_STATUS_CANCELLED,
    KAIZEN_ACTION_STATUS_OPEN,
    KAIZEN_ACTION_STATUS_DONE,
    KAIZEN_ACTION_STATUS_CANCELLED,
    KAIZEN_PRIORITY_MEDIUM,
    KAIZEN_PRIORITY_HIGH,
    SOURCE_TYPE_MANUAL,
    SOURCE_TYPE_SUGGESTION,
    APPROVED_TARGET_TYPES,
)
from improvement.models import Suggestion
from datetime import date


class KaizenServiceTest(TestCase):
    def setUp(self):
        self.service = KaizenService()
        self.kaizen = self.service.create_kaizen(
            title="Reduce setup time",
            problem_statement="Current setup takes 47 minutes",
            target_type="Plant",
            target_id=1,
            current_condition="47 minutes average",
            target_condition="Under 20 minutes",
            owner="Test Owner",
            priority=KAIZEN_PRIORITY_MEDIUM,
            source_type=SOURCE_TYPE_MANUAL,
        )

    # ── Create ──

    def test_create_kaizen(self):
        k = self.service.create_kaizen(
            title="New Kaizen",
            problem_statement="Quality issue on line 3",
            target_type="ProductionLine",
            target_id=42,
            current_condition="3% defect rate",
            target_condition="< 0.5% defect rate",
            owner="Jane",
            priority=KAIZEN_PRIORITY_HIGH,
            source_type=SOURCE_TYPE_SUGGESTION,
        )
        self.assertIsNotNone(k.id)
        self.assertEqual(k.title, "New Kaizen")
        self.assertEqual(k.problem_statement, "Quality issue on line 3")
        self.assertEqual(k.target_type, "ProductionLine")
        self.assertEqual(k.target_id, 42)
        self.assertEqual(k.current_condition, "3% defect rate")
        self.assertEqual(k.target_condition, "< 0.5% defect rate")
        self.assertEqual(k.owner, "Jane")
        self.assertEqual(k.priority, KAIZEN_PRIORITY_HIGH)
        self.assertEqual(k.source_type, SOURCE_TYPE_SUGGESTION)
        self.assertEqual(k.status, KAIZEN_STATUS_PLANNED)

    def test_create_kaizen_default_source_type(self):
        k = self.service.create_kaizen(title="Default Source")
        self.assertEqual(k.source_type, SOURCE_TYPE_MANUAL)

    def test_create_kaizen_default_priority(self):
        k = self.service.create_kaizen(title="Default Priority")
        self.assertEqual(k.priority, KAIZEN_PRIORITY_MEDIUM)

    def test_create_kaizen_rejects_empty_title(self):
        with self.assertRaises(ImprovementValidationError):
            self.service.create_kaizen(title="")

    def test_create_kaizen_rejects_invalid_target_type(self):
        with self.assertRaises(InvalidTargetError):
            self.service.create_kaizen(
                title="Bad Target",
                target_type="InvalidType",
            )

    def test_create_kaizen_accepts_all_approved_targets(self):
        for t in APPROVED_TARGET_TYPES:
            k = self.service.create_kaizen(
                title=f"Kaizen for {t}",
                target_type=t,
                target_id=1,
            )
            self.assertEqual(k.target_type, t)

    def test_create_kaizen_with_dates(self):
        k = self.service.create_kaizen(
            title="Dated Kaizen",
            start_date=date(2026, 1, 15),
            due_date=date(2026, 3, 1),
        )
        self.assertEqual(k.start_date, date(2026, 1, 15))
        self.assertEqual(k.due_date, date(2026, 3, 1))

    # ── Update ──

    def test_update_kaizen_title(self):
        updated = self.service.update_kaizen(self.kaizen.id, title="Updated Kaizen")
        self.assertEqual(updated.title, "Updated Kaizen")

    def test_update_kaizen_priority_and_source(self):
        updated = self.service.update_kaizen(
            self.kaizen.id,
            priority=KAIZEN_PRIORITY_HIGH,
            source_type=SOURCE_TYPE_SUGGESTION,
        )
        self.assertEqual(updated.priority, KAIZEN_PRIORITY_HIGH)
        self.assertEqual(updated.source_type, SOURCE_TYPE_SUGGESTION)

    def test_update_kaizen_rejects_invalid_target(self):
        with self.assertRaises(InvalidTargetError):
            self.service.update_kaizen(
                self.kaizen.id,
                target_type="InvalidType",
            )

    def test_update_nonexistent_kaizen(self):
        with self.assertRaises(KaizenNotFoundError):
            self.service.update_kaizen(99999, title="Ghost")

    # ── Lifecycle transitions ──

    def test_start_kaizen(self):
        started = self.service.start_kaizen(self.kaizen.id)
        self.assertEqual(started.status, KAIZEN_STATUS_IN_PROGRESS)

    def test_start_already_started_fails(self):
        self.service.start_kaizen(self.kaizen.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.start_kaizen(self.kaizen.id)

    def test_start_completed_kaizen_fails(self):
        self.service.start_kaizen(self.kaizen.id)
        self.service.complete_kaizen(self.kaizen.id, "Done")
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.start_kaizen(self.kaizen.id)

    def test_start_cancelled_kaizen_fails(self):
        self.service.cancel_kaizen(self.kaizen.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.start_kaizen(self.kaizen.id)

    def test_complete_kaizen(self):
        self.service.start_kaizen(self.kaizen.id)
        completed = self.service.complete_kaizen(self.kaizen.id, "Setup reduced to 18 min")
        self.assertEqual(completed.status, KAIZEN_STATUS_COMPLETED)
        self.assertEqual(completed.completed_date, date.today())
        self.assertEqual(completed.result_summary, "Setup reduced to 18 min")

    def test_complete_without_summary(self):
        self.service.start_kaizen(self.kaizen.id)
        completed = self.service.complete_kaizen(self.kaizen.id)
        self.assertEqual(completed.status, KAIZEN_STATUS_COMPLETED)

    def test_complete_from_planned_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.complete_kaizen(self.kaizen.id)

    def test_cancel_kaizen_from_planned(self):
        cancelled = self.service.cancel_kaizen(self.kaizen.id)
        self.assertEqual(cancelled.status, KAIZEN_STATUS_CANCELLED)

    def test_cancel_kaizen_from_in_progress(self):
        self.service.start_kaizen(self.kaizen.id)
        cancelled = self.service.cancel_kaizen(self.kaizen.id)
        self.assertEqual(cancelled.status, KAIZEN_STATUS_CANCELLED)

    def test_cancel_completed_kaizen_fails(self):
        self.service.start_kaizen(self.kaizen.id)
        self.service.complete_kaizen(self.kaizen.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.cancel_kaizen(self.kaizen.id)

    def test_cancel_already_cancelled_fails(self):
        self.service.cancel_kaizen(self.kaizen.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.cancel_kaizen(self.kaizen.id)

    def test_full_lifecycle(self):
        """PLANNED → IN_PROGRESS → COMPLETED"""
        k = self.kaizen
        self.assertEqual(k.status, KAIZEN_STATUS_PLANNED)

        k = self.service.start_kaizen(k.id)
        self.assertEqual(k.status, KAIZEN_STATUS_IN_PROGRESS)

        k = self.service.complete_kaizen(k.id, "Success!")
        self.assertEqual(k.status, KAIZEN_STATUS_COMPLETED)

    # ── Kaizen Actions ──

    def test_add_kaizen_action(self):
        action = self.service.add_kaizen_action(
            self.kaizen.id,
            title="Install shadow board",
            description="Create tool shadow board at workstation",
            owner="Operator A",
            due_date=date(2026, 2, 15),
        )
        self.assertIsNotNone(action.id)
        self.assertEqual(action.kaizen_id, self.kaizen.id)
        self.assertEqual(action.title, "Install shadow board")
        self.assertEqual(action.description, "Create tool shadow board at workstation")
        self.assertEqual(action.owner, "Operator A")
        self.assertEqual(action.status, KAIZEN_ACTION_STATUS_OPEN)

    def test_add_action_rejects_empty_title(self):
        with self.assertRaises(ImprovementValidationError):
            self.service.add_kaizen_action(
                self.kaizen.id,
                title="",
                description="Should fail",
            )

    def test_add_action_to_nonexistent_kaizen(self):
        with self.assertRaises(KaizenNotFoundError):
            self.service.add_kaizen_action(99999, title="Ghost action")

    def test_update_kaizen_action(self):
        action = self.service.add_kaizen_action(
            self.kaizen.id,
            title="Original",
        )
        updated = self.service.update_kaizen_action(
            action.id,
            title="Updated Action",
            owner="New Owner",
        )
        self.assertEqual(updated.title, "Updated Action")
        self.assertEqual(updated.owner, "New Owner")

    def test_update_nonexistent_action(self):
        with self.assertRaises(KaizenActionNotFoundError):
            self.service.update_kaizen_action(99999, title="Ghost")

    def test_complete_kaizen_action(self):
        action = self.service.add_kaizen_action(
            self.kaizen.id,
            title="Task to complete",
        )
        done = self.service.complete_kaizen_action(action.id)
        self.assertEqual(done.status, KAIZEN_ACTION_STATUS_DONE)

    def test_complete_nonexistent_action(self):
        with self.assertRaises(KaizenActionNotFoundError):
            self.service.complete_kaizen_action(99999)

    def test_cancel_kaizen_action(self):
        action = self.service.add_kaizen_action(
            self.kaizen.id,
            title="Task to cancel",
        )
        cancelled = self.service.cancel_kaizen_action(action.id)
        self.assertEqual(cancelled.status, KAIZEN_ACTION_STATUS_CANCELLED)

    def test_cancel_nonexistent_action(self):
        with self.assertRaises(KaizenActionNotFoundError):
            self.service.cancel_kaizen_action(99999)

    # ── Delete ──

    def test_delete_kaizen(self):
        self.service.delete_kaizen(self.kaizen.id)
        self.assertIsNone(self.service.get_kaizen(self.kaizen.id))

    def test_delete_nonexistent_kaizen(self):
        with self.assertRaises(KaizenNotFoundError):
            self.service.delete_kaizen(99999)

    def test_delete_kaizen_action(self):
        action = self.service.add_kaizen_action(
            self.kaizen.id,
            title="Action to delete",
        )
        self.service.delete_kaizen_action(action.id)
        with self.assertRaises(KaizenActionNotFoundError):
            self.service.update_kaizen_action(action.id, title="Ghost")

    def test_delete_nonexistent_action(self):
        with self.assertRaises(KaizenActionNotFoundError):
            self.service.delete_kaizen_action(99999)

    # ── Create A3 from Kaizen ──

    def test_create_a3_from_kaizen(self):
        from improvement.models import A3PDCA
        self.service.create_a3_from_kaizen(self.kaizen.id)
        a3s = A3PDCA.objects.filter(source_kaizen=self.kaizen)
        self.assertEqual(a3s.count(), 1)
        a3 = a3s.first()
        self.assertIn(self.kaizen.title, a3.title)
        self.assertEqual(a3.problem_statement, self.kaizen.problem_statement)
        self.assertEqual(a3.current_condition, self.kaizen.current_condition)
        self.assertEqual(a3.target_condition, self.kaizen.target_condition)
        self.assertEqual(a3.target_type, self.kaizen.target_type)
        self.assertEqual(a3.owner, self.kaizen.owner)
        self.assertEqual(a3.source_type, "KAIZEN")

    def test_create_a3_from_nonexistent_kaizen(self):
        with self.assertRaises(KaizenNotFoundError):
            self.service.create_a3_from_kaizen(99999)

    # ── List / Get ──

    def test_list_kaizens(self):
        results = self.service.list_kaizens()
        self.assertGreaterEqual(len(results), 1)

    def test_list_kaizens_with_status_filter(self):
        self.service.start_kaizen(self.kaizen.id)
        results = self.service.list_kaizens({"status": KAIZEN_STATUS_IN_PROGRESS})
        self.assertEqual(len(results), 1)
        results = self.service.list_kaizens({"status": KAIZEN_STATUS_COMPLETED})
        self.assertEqual(len(results), 0)

    def test_list_kaizens_with_search(self):
        results = self.service.list_kaizens({"search": "setup"})
        self.assertGreaterEqual(len(results), 1)

    def test_get_kaizen(self):
        k = self.service.get_kaizen(self.kaizen.id)
        self.assertIsNotNone(k)
        self.assertEqual(k.title, "Reduce setup time")

    def test_get_nonexistent_kaizen(self):
        k = self.service.get_kaizen(99999)
        self.assertIsNone(k)
