from django.test import TestCase
from improvement.models import ManufacturingEngineeringRequest, Kaizen
from improvement.services.application.mer_service import MERService
from improvement.exceptions import (
    MERNotFoundError,
    InvalidStatusTransitionError,
    InvalidTargetError,
    ImprovementValidationError,
)
from improvement.constants import (
    MER_STATUS_SUBMITTED,
    MER_STATUS_UNDER_REVIEW,
    MER_STATUS_APPROVED,
    MER_STATUS_IN_PROGRESS,
    MER_STATUS_COMPLETED,
    MER_STATUS_REJECTED,
    MER_STATUS_CANCELLED,
    MER_TYPE_ENGINEERING_CHANGE,
    MER_TYPE_TOOLING,
    MER_TYPE_PROCESS_IMPROVEMENT,
    MER_TYPE_EQUIPMENT_MODIFICATION,
    MER_PRIORITY_MEDIUM,
    MER_PRIORITY_HIGH,
    MER_PRIORITY_CRITICAL,
    SOURCE_TYPE_MER,
    APPROVED_TARGET_TYPES,
)
from datetime import date, timedelta


class MERServiceTest(TestCase):
    def setUp(self):
        self.service = MERService()
        self.mer = self.service.create_mer(
            title="Upgrade press brake hydraulics",
            description="Press brake #3 hydraulics need modernization",
            request_type=MER_TYPE_ENGINEERING_CHANGE,
            category="MAINTENANCE",
            priority=MER_PRIORITY_MEDIUM,
            target_type="Plant",
            target_id=1,
            submitted_by="Maintenance Lead",
            assigned_to="Controls Engineer",
            reviewer="Engineering Manager",
            estimated_cost=15000.00,
            start_date=date.today(),
            due_date=date.today() + timedelta(days=30),
        )

    # ── Create ──

    def test_create_mer(self):
        m = self.service.create_mer(
            title="New tooling for assembly line",
            description="Request new jig for product X",
            request_type=MER_TYPE_TOOLING,
            category="QUALITY",
            priority=MER_PRIORITY_HIGH,
            target_type="ProductionLine",
            target_id=42,
            submitted_by="Line Supervisor",
            assigned_to="Tooling Engineer",
        )
        self.assertIsNotNone(m.id)
        self.assertEqual(m.title, "New tooling for assembly line")
        self.assertEqual(m.description, "Request new jig for product X")
        self.assertEqual(m.request_type, MER_TYPE_TOOLING)
        self.assertEqual(m.category, "QUALITY")
        self.assertEqual(m.priority, MER_PRIORITY_HIGH)
        self.assertEqual(m.target_type, "ProductionLine")
        self.assertEqual(m.target_id, 42)
        self.assertEqual(m.submitted_by, "Line Supervisor")
        self.assertEqual(m.assigned_to, "Tooling Engineer")
        self.assertEqual(m.status, MER_STATUS_SUBMITTED)

    def test_create_mer_defaults(self):
        m = self.service.create_mer(title="Minimal MER")
        self.assertEqual(m.title, "Minimal MER")
        self.assertEqual(m.description, "")
        self.assertEqual(m.request_type, MER_TYPE_ENGINEERING_CHANGE)
        self.assertEqual(m.category, "")
        self.assertEqual(m.priority, MER_PRIORITY_MEDIUM)
        self.assertEqual(m.status, MER_STATUS_SUBMITTED)
        self.assertEqual(m.impact_cost, "")
        self.assertEqual(m.impact_quality, "")
        self.assertEqual(m.impact_delivery, "")
        self.assertEqual(m.impact_safety, "")

    def test_create_mer_with_impact_assessment(self):
        m = self.service.create_mer(
            title="CQDS Impact MER",
            impact_cost="$5K savings",
            impact_quality="Reduces defects 20%",
            impact_delivery="1 day lead time reduction",
            impact_safety="Reduces ergonomic risk",
        )
        self.assertEqual(m.impact_cost, "$5K savings")
        self.assertEqual(m.impact_quality, "Reduces defects 20%")
        self.assertEqual(m.impact_delivery, "1 day lead time reduction")
        self.assertEqual(m.impact_safety, "Reduces ergonomic risk")

    def test_create_mer_with_dates_and_cost(self):
        m = self.service.create_mer(
            title="Dated MER",
            start_date=date(2026, 3, 1),
            due_date=date(2026, 6, 1),
            estimated_cost=25000.00,
        )
        self.assertEqual(m.start_date, date(2026, 3, 1))
        self.assertEqual(m.due_date, date(2026, 6, 1))
        self.assertEqual(m.estimated_cost, 25000.00)

    def test_create_mer_rejects_empty_title(self):
        with self.assertRaises(ImprovementValidationError):
            self.service.create_mer(title="")

    def test_create_mer_rejects_whitespace_title(self):
        with self.assertRaises(ImprovementValidationError):
            self.service.create_mer(title="   ")

    def test_create_mer_rejects_invalid_target_type(self):
        with self.assertRaises(InvalidTargetError):
            self.service.create_mer(
                title="Bad Target",
                target_type="InvalidType",
            )

    def test_create_mer_accepts_all_approved_target_types(self):
        for t in APPROVED_TARGET_TYPES:
            m = self.service.create_mer(
                title=f"MER for {t}",
                target_type=t,
                target_id=1,
            )
            self.assertEqual(m.target_type, t)

    def test_create_mer_all_request_types(self):
        for rt in [MER_TYPE_ENGINEERING_CHANGE, MER_TYPE_TOOLING,
                   MER_TYPE_PROCESS_IMPROVEMENT, MER_TYPE_EQUIPMENT_MODIFICATION]:
            m = self.service.create_mer(title=f"MER {rt}", request_type=rt)
            self.assertEqual(m.request_type, rt)

    # ── Update ──

    def test_update_mer_title(self):
        updated = self.service.update_mer(self.mer.id, title="Updated Title")
        self.assertEqual(updated.title, "Updated Title")

    def test_update_mer_priority_and_category(self):
        updated = self.service.update_mer(
            self.mer.id,
            priority=MER_PRIORITY_CRITICAL,
            category="SAFETY",
        )
        self.assertEqual(updated.priority, MER_PRIORITY_CRITICAL)
        self.assertEqual(updated.category, "SAFETY")

    def test_update_mer_impact_fields(self):
        updated = self.service.update_mer(
            self.mer.id,
            impact_cost="$10K",
            impact_quality="Major improvement",
            impact_delivery="2 days faster",
            impact_safety="Critical safety fix",
        )
        self.assertEqual(updated.impact_cost, "$10K")
        self.assertEqual(updated.impact_quality, "Major improvement")
        self.assertEqual(updated.impact_delivery, "2 days faster")
        self.assertEqual(updated.impact_safety, "Critical safety fix")

    def test_update_mer_cost_and_dates(self):
        updated = self.service.update_mer(
            self.mer.id,
            estimated_cost=20000.00,
            actual_cost=18500.00,
            due_date=date(2026, 12, 31),
        )
        self.assertEqual(updated.estimated_cost, 20000.00)
        self.assertEqual(updated.actual_cost, 18500.00)
        self.assertEqual(updated.due_date, date(2026, 12, 31))

    def test_update_mer_result_and_lessons(self):
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        self.service.complete_mer(self.mer.id, result_summary="Completed on time")
        updated = self.service.update_mer(
            self.mer.id,
            lessons_learned="Need better supplier communication",
        )
        self.assertEqual(updated.lessons_learned, "Need better supplier communication")

    def test_update_mer_rejects_invalid_target(self):
        with self.assertRaises(InvalidTargetError):
            self.service.update_mer(self.mer.id, target_type="InvalidType")

    def test_update_nonexistent_mer(self):
        with self.assertRaises(MERNotFoundError):
            self.service.update_mer(99999, title="Ghost")

    # ── Lifecycle transitions ──

    def test_review_mer(self):
        reviewed = self.service.review_mer(self.mer.id)
        self.assertEqual(reviewed.status, MER_STATUS_UNDER_REVIEW)

    def test_review_already_reviewed_fails(self):
        self.service.review_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.review_mer(self.mer.id)

    def test_review_approved_mer_fails(self):
        self.service.approve_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.review_mer(self.mer.id)

    def test_approve_mer_from_submitted(self):
        approved = self.service.approve_mer(self.mer.id)
        self.assertEqual(approved.status, MER_STATUS_APPROVED)

    def test_approve_mer_from_under_review(self):
        self.service.review_mer(self.mer.id)
        approved = self.service.approve_mer(self.mer.id, review_notes="Looks good")
        self.assertEqual(approved.status, MER_STATUS_APPROVED)
        self.assertEqual(approved.review_notes, "Looks good")

    def test_approve_in_progress_mer_fails(self):
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.approve_mer(self.mer.id)

    def test_reject_mer_from_submitted(self):
        rejected = self.service.reject_mer(self.mer.id, reason="Out of scope")
        self.assertEqual(rejected.status, MER_STATUS_REJECTED)
        self.assertEqual(rejected.rejection_reason, "Out of scope")

    def test_reject_mer_from_under_review(self):
        self.service.review_mer(self.mer.id)
        rejected = self.service.reject_mer(self.mer.id, reason="Budget exceeded")
        self.assertEqual(rejected.status, MER_STATUS_REJECTED)

    def test_reject_approved_mer_fails(self):
        self.service.approve_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.reject_mer(self.mer.id)

    def test_start_mer(self):
        self.service.approve_mer(self.mer.id)
        started = self.service.start_mer(self.mer.id)
        self.assertEqual(started.status, MER_STATUS_IN_PROGRESS)
        self.assertEqual(started.start_date, date.today())

    def test_start_mer_preserves_existing_start_date(self):
        self.service.approve_mer(self.mer.id)
        self.service.update_mer(self.mer.id, start_date=date(2026, 3, 1))
        started = self.service.start_mer(self.mer.id)
        self.assertEqual(started.start_date, date(2026, 3, 1))

    def test_start_submitted_mer_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.start_mer(self.mer.id)

    def test_start_completed_mer_fails(self):
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        self.service.complete_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.start_mer(self.mer.id)

    def test_complete_mer(self):
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        completed = self.service.complete_mer(
            self.mer.id,
            result_summary="Hydraulics upgraded successfully",
        )
        self.assertEqual(completed.status, MER_STATUS_COMPLETED)
        self.assertEqual(completed.completed_date, date.today())
        self.assertEqual(completed.result_summary, "Hydraulics upgraded successfully")

    def test_complete_without_summary(self):
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        completed = self.service.complete_mer(self.mer.id)
        self.assertEqual(completed.status, MER_STATUS_COMPLETED)

    def test_complete_from_submitted_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.complete_mer(self.mer.id)

    def test_complete_from_approved_fails(self):
        self.service.approve_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.complete_mer(self.mer.id)

    def test_cancel_mer_from_submitted(self):
        cancelled = self.service.cancel_mer(self.mer.id)
        self.assertEqual(cancelled.status, MER_STATUS_CANCELLED)

    def test_cancel_mer_from_in_progress(self):
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        cancelled = self.service.cancel_mer(self.mer.id)
        self.assertEqual(cancelled.status, MER_STATUS_CANCELLED)

    def test_cancel_completed_mer_fails(self):
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        self.service.complete_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.cancel_mer(self.mer.id)

    def test_cancel_rejected_mer_fails(self):
        self.service.reject_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.cancel_mer(self.mer.id)

    def test_cancel_already_cancelled_fails(self):
        self.service.cancel_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.cancel_mer(self.mer.id)

    # ── Full lifecycle ──

    def test_full_lifecycle_happy_path(self):
        """SUBMITTED → UNDER_REVIEW → APPROVED → IN_PROGRESS → COMPLETED"""
        m = self.mer
        self.assertEqual(m.status, MER_STATUS_SUBMITTED)

        m = self.service.review_mer(m.id)
        self.assertEqual(m.status, MER_STATUS_UNDER_REVIEW)

        m = self.service.approve_mer(m.id, review_notes="Approved")
        self.assertEqual(m.status, MER_STATUS_APPROVED)

        m = self.service.start_mer(m.id)
        self.assertEqual(m.status, MER_STATUS_IN_PROGRESS)
        self.assertEqual(m.start_date, date.today())

        m = self.service.complete_mer(m.id, result_summary="Done!")
        self.assertEqual(m.status, MER_STATUS_COMPLETED)
        self.assertEqual(m.completed_date, date.today())

    def test_full_lifecycle_skip_review(self):
        """SUBMITTED → APPROVED → IN_PROGRESS → COMPLETED"""
        m = self.mer
        m = self.service.approve_mer(m.id)
        self.assertEqual(m.status, MER_STATUS_APPROVED)

        m = self.service.start_mer(m.id)
        self.assertEqual(m.status, MER_STATUS_IN_PROGRESS)

        m = self.service.complete_mer(m.id, "Finished")
        self.assertEqual(m.status, MER_STATUS_COMPLETED)

    def test_reject_then_approve_fails(self):
        self.service.reject_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.approve_mer(self.mer.id)

    def test_reject_then_start_fails(self):
        self.service.reject_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.start_mer(self.mer.id)

    # ── Kaizen conversion ──

    def test_convert_to_kaizen_from_approved(self):
        self.service.approve_mer(self.mer.id)
        kaizen = self.service.convert_to_kaizen(self.mer.id)
        self.assertIsNotNone(kaizen.id)
        self.assertIn(self.mer.title, kaizen.title)
        self.assertEqual(kaizen.source_type, SOURCE_TYPE_MER)
        self.assertEqual(kaizen.target_type, self.mer.target_type)
        self.assertEqual(kaizen.target_id, self.mer.target_id)

    def test_convert_to_kaizen_from_completed(self):
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        self.service.complete_mer(self.mer.id, "Done")
        kaizen = self.service.convert_to_kaizen(self.mer.id)
        self.assertIsNotNone(kaizen.id)
        self.assertEqual(kaizen.source_type, SOURCE_TYPE_MER)

    def test_convert_to_kaizen_from_submitted_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.convert_to_kaizen(self.mer.id)

    def test_convert_to_kaizen_from_in_progress_fails(self):
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.convert_to_kaizen(self.mer.id)

    def test_convert_to_kaizen_from_rejected_fails(self):
        self.service.reject_mer(self.mer.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.convert_to_kaizen(self.mer.id)

    def test_convert_to_kaizen_links_mer(self):
        self.service.approve_mer(self.mer.id)
        kaizen = self.service.convert_to_kaizen(self.mer.id)
        refreshed = self.service.get_mer(self.mer.id)
        self.assertEqual(refreshed.linked_kaizen_id, kaizen.id)

    def test_convert_to_kaizen_with_custom_fields(self):
        self.service.approve_mer(self.mer.id)
        kaizen = self.service.convert_to_kaizen(
            self.mer.id,
            title="Custom Kaizen Title",
            owner="Custom Owner",
            priority="CRITICAL",
        )
        self.assertEqual(kaizen.title, "Custom Kaizen Title")
        self.assertEqual(kaizen.owner, "Custom Owner")
        self.assertEqual(kaizen.priority, "CRITICAL")

    # ── Delete ──

    def test_delete_mer(self):
        self.service.delete_mer(self.mer.id)
        self.assertIsNone(self.service.get_mer(self.mer.id))

    def test_delete_nonexistent_mer(self):
        with self.assertRaises(MERNotFoundError):
            self.service.delete_mer(99999)

    def test_delete_in_progress_mer(self):
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        self.service.delete_mer(self.mer.id)
        self.assertIsNone(self.service.get_mer(self.mer.id))

    # ── List / Get / Summary ──

    def test_list_mers(self):
        results = self.service.list_mers()
        self.assertGreaterEqual(len(results), 1)

    def test_list_mers_with_status_filter(self):
        self.service.approve_mer(self.mer.id)
        results = self.service.list_mers({"status": MER_STATUS_APPROVED})
        self.assertEqual(len(results), 1)
        results = self.service.list_mers({"status": MER_STATUS_REJECTED})
        self.assertEqual(len(results), 0)

    def test_list_mers_with_type_filter(self):
        self.service.create_mer(
            title="Tooling request",
            request_type=MER_TYPE_TOOLING,
        )
        results = self.service.list_mers({"request_type": MER_TYPE_TOOLING})
        self.assertEqual(len(results), 1)
        results = self.service.list_mers({"request_type": MER_TYPE_EQUIPMENT_MODIFICATION})
        self.assertEqual(len(results), 0)

    def test_list_mers_with_priority_filter(self):
        self.service.create_mer(
            title="Critical MER",
            priority=MER_PRIORITY_CRITICAL,
        )
        results = self.service.list_mers({"priority": MER_PRIORITY_CRITICAL})
        self.assertEqual(len(results), 1)
        results = self.service.list_mers({"priority": MER_PRIORITY_HIGH})
        self.assertEqual(len(results), 0)

    def test_list_mers_with_search(self):
        results = self.service.list_mers({"search": "press brake"})
        self.assertGreaterEqual(len(results), 1)
        results = self.service.list_mers({"search": "NonExistentTerm"})
        self.assertEqual(len(results), 0)

    def test_list_mers_with_target_filter(self):
        results = self.service.list_mers({"target_type": "Plant"})
        self.assertGreaterEqual(len(results), 1)
        results = self.service.list_mers({"target_type": "Department"})
        self.assertEqual(len(results), 0)

    def test_get_mer(self):
        m = self.service.get_mer(self.mer.id)
        self.assertIsNotNone(m)
        self.assertEqual(m.title, "Upgrade press brake hydraulics")

    def test_get_nonexistent_mer(self):
        m = self.service.get_mer(99999)
        self.assertIsNone(m)

    def test_get_summary(self):
        # Create a few MERs in different statuses
        self.service.approve_mer(self.mer.id)
        self.service.start_mer(self.mer.id)
        self.service.complete_mer(self.mer.id, "Done")

        m2 = self.service.create_mer(title="Tooling request", request_type=MER_TYPE_TOOLING)
        self.service.reject_mer(m2.id, reason="Budget")

        summary = self.service.get_summary()
        self.assertEqual(summary["total"], 2)
        self.assertEqual(summary["completed"], 1)
        self.assertEqual(summary["rejected"], 1)
        self.assertEqual(summary["cancelled"], 0)

    def test_summary_overdue_count(self):
        # Create an overdue MER
        m2 = self.service.create_mer(
            title="Overdue MER",
            due_date=date.today() - timedelta(days=5),
        )
        summary = self.service.get_summary()
        self.assertGreaterEqual(summary["overdue"], 1)

    def test_summary_by_type(self):
        self.service.create_mer(title="Tooling", request_type=MER_TYPE_TOOLING)
        summary = self.service.get_summary()
        by_type = {t["request_type"]: t["count"] for t in summary["by_type"]}
        self.assertIn(MER_TYPE_ENGINEERING_CHANGE, by_type)
        self.assertIn(MER_TYPE_TOOLING, by_type)

    def test_summary_by_priority(self):
        self.service.create_mer(title="Critical", priority=MER_PRIORITY_CRITICAL)
        summary = self.service.get_summary()
        by_priority = {p["priority"]: p["count"] for p in summary["by_priority"]}
        self.assertIn(MER_PRIORITY_CRITICAL, by_priority)

    # ── Nonexistent IDs ──

    def test_review_nonexistent(self):
        with self.assertRaises(MERNotFoundError):
            self.service.review_mer(99999)

    def test_approve_nonexistent(self):
        with self.assertRaises(MERNotFoundError):
            self.service.approve_mer(99999)

    def test_reject_nonexistent(self):
        with self.assertRaises(MERNotFoundError):
            self.service.reject_mer(99999)

    def test_start_nonexistent(self):
        with self.assertRaises(MERNotFoundError):
            self.service.start_mer(99999)

    def test_complete_nonexistent(self):
        with self.assertRaises(MERNotFoundError):
            self.service.complete_mer(99999)

    def test_cancel_nonexistent(self):
        with self.assertRaises(MERNotFoundError):
            self.service.cancel_mer(99999)

    def test_convert_nonexistent(self):
        with self.assertRaises(MERNotFoundError):
            self.service.convert_to_kaizen(99999)
