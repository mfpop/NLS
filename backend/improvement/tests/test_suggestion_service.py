from django.test import TestCase
from improvement.models import Suggestion
from improvement.services.application.suggestion_service import SuggestionService
from improvement.exceptions import (
    SuggestionNotFoundError,
    InvalidStatusTransitionError,
    InvalidTargetError,
    ImprovementValidationError,
)
from improvement.constants import (
    SUGGESTION_STATUS_NEW,
    SUGGESTION_STATUS_UNDER_REVIEW,
    SUGGESTION_STATUS_ACCEPTED,
    SUGGESTION_STATUS_REJECTED,
    SUGGESTION_STATUS_CONVERTED_TO_KAIZEN,
    SUGGESTION_PRIORITY_MEDIUM,
    SUGGESTION_PRIORITY_HIGH,
    APPROVED_TARGET_TYPES,
)


class SuggestionServiceTest(TestCase):
    def setUp(self):
        self.service = SuggestionService()
        self.suggestion = self.service.create_suggestion(
            title="Test Suggestion",
            description="A test improvement idea",
            submitted_by="Test User",
            target_type="Plant",
            target_id=1,
            category="Safety",
            priority=SUGGESTION_PRIORITY_MEDIUM,
        )

    # ── Create ──

    def test_create_suggestion(self):
        s = self.service.create_suggestion(
            title="New Idea",
            description="Another idea",
            submitted_by="Jane",
            target_type="ProductionLine",
            target_id=42,
            category="Quality",
            priority=SUGGESTION_PRIORITY_HIGH,
        )
        self.assertIsNotNone(s.id)
        self.assertEqual(s.title, "New Idea")
        self.assertEqual(s.description, "Another idea")
        self.assertEqual(s.submitted_by, "Jane")
        self.assertEqual(s.target_type, "ProductionLine")
        self.assertEqual(s.target_id, 42)
        self.assertEqual(s.category, "Quality")
        self.assertEqual(s.priority, SUGGESTION_PRIORITY_HIGH)
        self.assertEqual(s.status, SUGGESTION_STATUS_NEW)

    def test_create_suggestion_defaults(self):
        s = self.service.create_suggestion(title="Minimal")
        self.assertEqual(s.title, "Minimal")
        self.assertEqual(s.description, "")
        self.assertEqual(s.submitted_by, "")
        self.assertEqual(s.target_type, "")
        self.assertEqual(s.target_id, None)
        self.assertEqual(s.category, "")
        self.assertEqual(s.priority, SUGGESTION_PRIORITY_MEDIUM)
        self.assertEqual(s.status, SUGGESTION_STATUS_NEW)

    def test_create_rejects_empty_title(self):
        with self.assertRaises(ImprovementValidationError):
            self.service.create_suggestion(title="")

    def test_create_rejects_whitespace_title(self):
        with self.assertRaises(ImprovementValidationError):
            self.service.create_suggestion(title="   ")

    def test_create_rejects_invalid_target_type(self):
        with self.assertRaises(InvalidTargetError):
            self.service.create_suggestion(
                title="Bad Target",
                target_type="InvalidType",
            )

    def test_create_accepts_all_approved_target_types(self):
        for t in APPROVED_TARGET_TYPES:
            s = self.service.create_suggestion(
                title=f"Suggestion for {t}",
                target_type=t,
                target_id=1,
            )
            self.assertEqual(s.target_type, t)

    # ── Update ──

    def test_update_suggestion_title(self):
        updated = self.service.update_suggestion(
            self.suggestion.id,
            title="Updated Title",
        )
        self.assertEqual(updated.title, "Updated Title")

    def test_update_suggestion_priority(self):
        updated = self.service.update_suggestion(
            self.suggestion.id,
            priority=SUGGESTION_PRIORITY_HIGH,
        )
        self.assertEqual(updated.priority, SUGGESTION_PRIORITY_HIGH)

    def test_update_suggestion_category_and_comments(self):
        updated = self.service.update_suggestion(
            self.suggestion.id,
            category="5S",
            comments="Reviewed in daily huddle",
        )
        self.assertEqual(updated.category, "5S")
        self.assertEqual(updated.comments, "Reviewed in daily huddle")

    def test_update_suggestion_unchanged_fields_persist(self):
        updated = self.service.update_suggestion(
            self.suggestion.id,
            title="New Title",
        )
        self.assertNotEqual(updated.title, self.suggestion.title)
        self.assertEqual(updated.description, self.suggestion.description)
        self.assertEqual(updated.submitted_by, self.suggestion.submitted_by)

    def test_update_suggestion_rejects_invalid_target(self):
        with self.assertRaises(InvalidTargetError):
            self.service.update_suggestion(
                self.suggestion.id,
                target_type="InvalidType",
            )

    def test_update_nonexistent_suggestion(self):
        with self.assertRaises(SuggestionNotFoundError):
            self.service.update_suggestion(99999, title="Ghost")

    # ── Lifecycle transitions ──

    def test_review_suggestion(self):
        reviewed = self.service.review_suggestion(self.suggestion.id)
        self.assertEqual(reviewed.status, SUGGESTION_STATUS_UNDER_REVIEW)

    def test_review_already_reviewed_suggestion(self):
        self.service.review_suggestion(self.suggestion.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.review_suggestion(self.suggestion.id)

    def test_accept_suggestion_from_new(self):
        accepted = self.service.accept_suggestion(self.suggestion.id)
        self.assertEqual(accepted.status, SUGGESTION_STATUS_ACCEPTED)

    def test_accept_suggestion_from_under_review(self):
        self.service.review_suggestion(self.suggestion.id)
        accepted = self.service.accept_suggestion(self.suggestion.id)
        self.assertEqual(accepted.status, SUGGESTION_STATUS_ACCEPTED)

    def test_accept_suggestion_with_decision(self):
        accepted = self.service.accept_suggestion(
            self.suggestion.id,
            decision="Approved by committee",
        )
        self.assertEqual(accepted.status, SUGGESTION_STATUS_ACCEPTED)
        self.assertEqual(accepted.decision, "Approved by committee")

    def test_accept_already_accepted(self):
        self.service.accept_suggestion(self.suggestion.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.accept_suggestion(self.suggestion.id)

    def test_reject_suggestion(self):
        rejected = self.service.reject_suggestion(self.suggestion.id)
        self.assertEqual(rejected.status, SUGGESTION_STATUS_REJECTED)

    def test_reject_suggestion_from_under_review(self):
        self.service.review_suggestion(self.suggestion.id)
        rejected = self.service.reject_suggestion(self.suggestion.id)
        self.assertEqual(rejected.status, SUGGESTION_STATUS_REJECTED)

    def test_reject_suggestion_with_decision(self):
        rejected = self.service.reject_suggestion(
            self.suggestion.id,
            decision="Out of scope",
        )
        self.assertEqual(rejected.decision, "Out of scope")

    def test_reject_already_rejected(self):
        self.service.reject_suggestion(self.suggestion.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.reject_suggestion(self.suggestion.id)

    def test_convert_to_kaizen_from_accepted(self):
        self.service.accept_suggestion(self.suggestion.id)
        converted = self.service.convert_suggestion_to_kaizen(self.suggestion.id)
        self.assertEqual(converted.status, SUGGESTION_STATUS_CONVERTED_TO_KAIZEN)

    def test_convert_to_kaizen_from_under_review(self):
        self.service.review_suggestion(self.suggestion.id)
        converted = self.service.convert_suggestion_to_kaizen(self.suggestion.id)
        self.assertEqual(converted.status, SUGGESTION_STATUS_CONVERTED_TO_KAIZEN)

    def test_convert_to_kaizen_from_new_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.convert_suggestion_to_kaizen(self.suggestion.id)

    def test_convert_already_converted_fails(self):
        self.service.accept_suggestion(self.suggestion.id)
        self.service.convert_suggestion_to_kaizen(self.suggestion.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.convert_suggestion_to_kaizen(self.suggestion.id)

    def test_full_lifecycle(self):
        """NEW → UNDER_REVIEW → ACCEPTED → CONVERTED_TO_KAIZEN"""
        s = self.suggestion
        self.assertEqual(s.status, SUGGESTION_STATUS_NEW)

        s = self.service.review_suggestion(s.id)
        self.assertEqual(s.status, SUGGESTION_STATUS_UNDER_REVIEW)

        s = self.service.accept_suggestion(s.id)
        self.assertEqual(s.status, SUGGESTION_STATUS_ACCEPTED)

        s = self.service.convert_suggestion_to_kaizen(s.id)
        self.assertEqual(s.status, SUGGESTION_STATUS_CONVERTED_TO_KAIZEN)

    def test_reject_then_accept_fails(self):
        self.service.reject_suggestion(self.suggestion.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.accept_suggestion(self.suggestion.id)

    # ── List / Get ──

    def test_list_suggestions(self):
        suggestions = self.service.list_suggestions()
        self.assertGreaterEqual(len(suggestions), 1)

    def test_list_suggestions_with_status_filter(self):
        self.service.accept_suggestion(self.suggestion.id)
        accepted = self.service.list_suggestions({"status": SUGGESTION_STATUS_ACCEPTED})
        self.assertEqual(len(accepted), 1)
        new = self.service.list_suggestions({"status": SUGGESTION_STATUS_NEW})
        self.assertEqual(len(new), 0)

    def test_list_suggestions_with_target_filter(self):
        results = self.service.list_suggestions({"target_type": "Plant"})
        self.assertGreaterEqual(len(results), 1)
        results = self.service.list_suggestions({"target_type": "Department"})
        self.assertEqual(len(results), 0)

    def test_list_suggestions_with_search(self):
        results = self.service.list_suggestions({"search": "Test"})
        self.assertGreaterEqual(len(results), 1)
        results = self.service.list_suggestions({"search": "NonExistent"})
        self.assertEqual(len(results), 0)

    def test_get_suggestion(self):
        s = self.service.get_suggestion(self.suggestion.id)
        self.assertIsNotNone(s)
        self.assertEqual(s.title, "Test Suggestion")

    def test_get_nonexistent_suggestion(self):
        s = self.service.get_suggestion(99999)
        self.assertIsNone(s)

    # ── Exceptions ──

    def test_review_nonexistent_suggestion(self):
        with self.assertRaises(SuggestionNotFoundError):
            self.service.review_suggestion(99999)

    def test_accept_nonexistent_suggestion(self):
        with self.assertRaises(SuggestionNotFoundError):
            self.service.accept_suggestion(99999)

    def test_reject_nonexistent_suggestion(self):
        with self.assertRaises(SuggestionNotFoundError):
            self.service.reject_suggestion(99999)

    def test_convert_nonexistent_suggestion(self):
        with self.assertRaises(SuggestionNotFoundError):
            self.service.convert_suggestion_to_kaizen(99999)
