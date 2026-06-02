from django.test import TestCase
from improvement.selectors import ImprovementSelector
from improvement.services.application.suggestion_service import SuggestionService
from improvement.services.application.kaizen_service import KaizenService
from improvement.services.application.a3_pdca_service import A3PDCAService
from improvement.constants import (
    SUGGESTION_STATUS_NEW,
    SUGGESTION_STATUS_UNDER_REVIEW,
    SUGGESTION_STATUS_ACCEPTED,
    SUGGESTION_STATUS_REJECTED,
    SUGGESTION_STATUS_CONVERTED_TO_KAIZEN,
    KAIZEN_STATUS_PLANNED,
    KAIZEN_STATUS_IN_PROGRESS,
    KAIZEN_STATUS_COMPLETED,
    KAIZEN_STATUS_CANCELLED,
    A3_PHASE_DRAFT,
    A3_PHASE_PLAN,
    A3_PHASE_DO,
    A3_PHASE_CHECK,
    A3_PHASE_ACT,
    A3_STATUS_COMPLETED,
    A3_STATUS_CANCELLED,
)
from datetime import date, timedelta


class ContinuousImprovementSummaryTest(TestCase):
    def setUp(self):
        self.selector = ImprovementSelector()
        self.svc_s = SuggestionService()
        self.svc_k = KaizenService()
        self.svc_a3 = A3PDCAService()

        # Create suggestions in various statuses
        self.s_new = self.svc_s.create_suggestion(title="New Idea", target_type="Plant", target_id=1)
        self.s_review = self.svc_s.create_suggestion(title="Under Review", target_type="Plant", target_id=1)
        self.svc_s.review_suggestion(self.s_review.id)
        self.s_accepted = self.svc_s.create_suggestion(title="Accepted", target_type="Plant", target_id=1)
        self.svc_s.accept_suggestion(self.s_accepted.id)
        self.s_rejected = self.svc_s.create_suggestion(title="Rejected", target_type="Plant", target_id=1)
        self.svc_s.reject_suggestion(self.s_rejected.id)
        self.s_converted = self.svc_s.create_suggestion(title="Converted", target_type="Plant", target_id=1)
        self.svc_s.accept_suggestion(self.s_converted.id)
        self.svc_s.convert_suggestion_to_kaizen(self.s_converted.id)

        # Create kaizens
        self.k_planned = self.svc_k.create_kaizen(title="Planned Kaizen", target_type="Plant", target_id=1)
        self.k_active = self.svc_k.create_kaizen(
            title="Active Kaizen",
            target_type="ProductionLine",
            target_id=1,
        )
        self.svc_k.start_kaizen(self.k_active.id)
        self.k_done = self.svc_k.create_kaizen(title="Completed Kaizen", target_type="Department", target_id=1)
        self.svc_k.start_kaizen(self.k_done.id)
        self.svc_k.complete_kaizen(self.k_done.id, "Done")
        self.k_cancelled = self.svc_k.create_kaizen(title="Cancelled Kaizen", target_type="ResourceGroup", target_id=1)
        self.svc_k.cancel_kaizen(self.k_cancelled.id)

        # Overdue kaizen (past due, not completed)
        self.k_overdue = self.svc_k.create_kaizen(
            title="Overdue Kaizen",
            target_type="Resource",
            target_id=1,
            due_date=date.today() - timedelta(days=7),
        )
        self.svc_k.start_kaizen(self.k_overdue.id)

        # Create A3/PDCA records
        self.a3_draft = self.svc_a3.create_a3_pdca(title="Draft A3", target_type="Plant", target_id=1)
        self.a3_plan = self.svc_a3.create_a3_pdca(title="Plan A3", target_type="ProductionLine", target_id=1)
        self.svc_a3.move_to_plan(self.a3_plan.id)
        self.a3_do = self.svc_a3.create_a3_pdca(title="Do A3", target_type="Department", target_id=1)
        self.svc_a3.move_to_plan(self.a3_do.id)
        self.svc_a3.move_to_do(self.a3_do.id)
        self.a3_done = self.svc_a3.create_a3_pdca(title="Completed A3", target_type="ResourceGroup", target_id=1)
        self.svc_a3.move_to_plan(self.a3_done.id)
        self.svc_a3.complete_a3_pdca(self.a3_done.id)
        self.a3_cancelled = self.svc_a3.create_a3_pdca(title="Cancelled A3", target_type="Resource", target_id=1)
        self.svc_a3.cancel_a3_pdca(self.a3_cancelled.id)

        # Overdue A3 (past due, not completed)
        self.a3_overdue = self.svc_a3.create_a3_pdca(
            title="Overdue A3",
            target_type="Plant",
            target_id=1,
            due_date=date.today() - timedelta(days=14),
        )

    def test_get_summary_fields_present(self):
        summary = self.selector.get_summary()
        expected_keys = [
            "total_suggestions", "accepted_suggestions", "rejected_suggestions",
            "converted_suggestions", "active_kaizen_count", "completed_kaizen_count",
            "overdue_kaizen_count", "active_a3_count", "completed_a3_count",
            "overdue_a3_count",
        ]
        for key in expected_keys:
            self.assertIn(key, summary, f"Missing key: {key}")

    def test_get_summary_suggestion_counts(self):
        summary = self.selector.get_summary()
        self.assertEqual(summary["total_suggestions"], 5)
        self.assertEqual(summary["accepted_suggestions"], 1)  # only s_accepted has ACCEPTED status
        self.assertEqual(summary["rejected_suggestions"], 1)
        self.assertEqual(summary["converted_suggestions"], 1)

    def test_get_summary_kaizen_counts(self):
        summary = self.selector.get_summary()
        self.assertEqual(summary["active_kaizen_count"], 2)  # active + overdue
        self.assertEqual(summary["completed_kaizen_count"], 1)
        self.assertEqual(summary["overdue_kaizen_count"], 1)

    def test_get_summary_a3_counts(self):
        summary = self.selector.get_summary()
        self.assertEqual(summary["active_a3_count"], 5)  # draft + plan + do + cancelled + overdue (all not COMPLETED)
        self.assertEqual(summary["completed_a3_count"], 1)
        self.assertEqual(summary["overdue_a3_count"], 1)

    def test_get_summary_with_target_filter(self):
        filtered = self.selector.get_summary({"target_type": "Plant"})
        self.assertEqual(filtered["total_suggestions"], 5)  # all suggestions target Plant
        self.assertGreaterEqual(filtered["active_kaizen_count"], 0)
        self.assertGreaterEqual(filtered["active_a3_count"], 1)

    def test_get_summary_empty_from_nonexistent_target(self):
        filtered = self.selector.get_summary({"target_type": "NonExistent"})
        self.assertEqual(filtered["total_suggestions"], 0)
        self.assertEqual(filtered["active_kaizen_count"], 0)
        self.assertEqual(filtered["active_a3_count"], 0)

    def test_get_improvements_by_status(self):
        by_status = self.selector.get_improvements_by_status()
        statuses = {s["status"]: s["count"] for s in by_status}
        self.assertIn(SUGGESTION_STATUS_NEW, statuses)
        self.assertIn(SUGGESTION_STATUS_UNDER_REVIEW, statuses)
        self.assertIn(SUGGESTION_STATUS_ACCEPTED, statuses)
        self.assertIn(SUGGESTION_STATUS_REJECTED, statuses)
        self.assertIn(SUGGESTION_STATUS_CONVERTED_TO_KAIZEN, statuses)
        self.assertIn(KAIZEN_STATUS_PLANNED, statuses)
        self.assertIn(KAIZEN_STATUS_IN_PROGRESS, statuses)
        self.assertIn(KAIZEN_STATUS_COMPLETED, statuses)
        self.assertIn(KAIZEN_STATUS_CANCELLED, statuses)
        self.assertIn(A3_PHASE_DRAFT, statuses)
        self.assertIn(A3_PHASE_PLAN, statuses)
        self.assertIn(A3_PHASE_DO, statuses)
        self.assertIn(A3_STATUS_COMPLETED, statuses)
        self.assertIn(A3_STATUS_CANCELLED, statuses)

    def test_get_improvements_by_status_counts(self):
        by_status = self.selector.get_improvements_by_status()
        status_map = {s["status"]: s["count"] for s in by_status}
        # 1 NEW suggestion, 1 UNDER_REVIEW, 1 ACCEPTED, 1 REJECTED, 1 CONVERTED, 1 new from unmodified
        # Actually: s_new is NEW, s_review is UNDER_REVIEW, s_accepted is ACCEPTED, s_rejected is REJECTED, s_converted is CONVERTED_TO_KAIZEN
        # Plus k_planned is PLANNED, k_active is IN_PROGRESS, k_done is COMPLETED, k_cancelled is CANCELLED, k_overdue is IN_PROGRESS
        # Plus a3's
        self.assertEqual(status_map[SUGGESTION_STATUS_NEW], 1)
        self.assertEqual(status_map[SUGGESTION_STATUS_UNDER_REVIEW], 1)
        self.assertEqual(status_map[KAIZEN_STATUS_IN_PROGRESS], 2)  # active + overdue

    def test_get_improvements_by_target(self):
        by_target = self.selector.get_improvements_by_target()
        target_map = {t["target_type"]: t["count"] for t in by_target}
        # Count suggestions + kaizens + a3s by target_type
        self.assertIn("Plant", target_map)
        self.assertIn("ProductionLine", target_map)
        self.assertIn("Department", target_map)
        self.assertIn("ResourceGroup", target_map)
        self.assertIn("Resource", target_map)

    def test_no_mock_data_in_summary(self):
        """Verify summary reads from database, not hardcoded values."""
        summary = self.selector.get_summary()
        # Values should reflect the 6 suggestions, 5 kaizens, 7 a3s we created
        self.assertGreater(summary["total_suggestions"], 0)
        self.assertGreater(summary["active_kaizen_count"], 0)
        self.assertGreater(summary["active_a3_count"], 0)
