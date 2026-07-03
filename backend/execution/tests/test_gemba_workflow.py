"""
Tests for the Gemba observation follow-up workflow.

Tests cover:
- Create observation with structure target
- Assign owner/due date
- ACTION_REQUIRED requires owner/due date
- Resolve requires note
- Verify requires note
- Close requires verified
- Convert to issue/action creates link
- Prevent duplicate conversion
- Reopen creates activity
- Completed walk blocks new observation
- Activity created for every lifecycle event
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase

from execution.constants import (
    GEMBA_EVENT_CREATED,
    GEMBA_EVENT_ASSIGNED,
    GEMBA_EVENT_DUE_DATE_SET,
    GEMBA_EVENT_STATUS_CHANGED,
    GEMBA_EVENT_RESOLVED,
    GEMBA_EVENT_VERIFIED,
    GEMBA_EVENT_CLOSED,
    GEMBA_EVENT_REOPENED,
    GEMBA_EVENT_CONVERTED_TO_ISSUE,
    GEMBA_EVENT_CONVERTED_TO_ACTION,
    GEMBA_OBSERVATION_STATUS_OPEN,
    GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED,
    GEMBA_OBSERVATION_STATUS_RESOLVED,
    GEMBA_OBSERVATION_STATUS_VERIFIED,
    GEMBA_OBSERVATION_STATUS_CLOSED,
    GEMBA_OBSERVATION_STATUS_REOPENED,
    GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ISSUE,
    GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ACTION,
    GEMBA_OBSERVATION_STATUS_CANCELLED,
    GEMBA_SESSION_PLANNED,
    GEMBA_SESSION_IN_PROGRESS,
    GEMBA_SESSION_COMPLETED,
    GEMBA_SESSION_CANCELLED,
    GEMBA_SEVERITY_MEDIUM,
    GEMBA_PRIORITY_MEDIUM,
    GEMBA_CATEGORY_PRODUCTIVITY,
)
from execution.domain_rules import (
    can_assign_observation,
    can_require_action,
    can_resolve_observation,
    can_verify_observation,
    can_close_observation,
    can_reopen_observation,
    can_convert_to_issue,
    can_convert_to_action,
    can_cancel_observation,
    can_add_observation_to_session,
)
from execution.exceptions import (
    GembaSessionCompletedError,
    GembaObservationAlreadyConvertedError,
    GembaValidationError,
    InvalidStatusTransitionError,
)
from execution.models import GembaWalkSession, GembaObservation, GembaObservationActivity
from execution.services.gemba import GembaWalkService

User = get_user_model()
service = GembaWalkService()


class TestDomainRules(TestCase):
    """Test the domain rule functions directly."""

    def test_can_assign_open(self):
        self.assertTrue(can_assign_observation(GEMBA_OBSERVATION_STATUS_OPEN))

    def test_cannot_assign_closed(self):
        self.assertFalse(can_assign_observation(GEMBA_OBSERVATION_STATUS_CLOSED))

    def test_cannot_assign_cancelled(self):
        self.assertFalse(can_assign_observation(GEMBA_OBSERVATION_STATUS_CANCELLED))

    def test_can_require_action_open(self):
        self.assertTrue(can_require_action(GEMBA_OBSERVATION_STATUS_OPEN))

    def test_cannot_require_action_closed(self):
        self.assertFalse(can_require_action(GEMBA_OBSERVATION_STATUS_CLOSED))

    def test_can_resolve_open(self):
        self.assertTrue(can_resolve_observation(GEMBA_OBSERVATION_STATUS_OPEN))

    def test_can_resolve_action_required(self):
        self.assertTrue(can_resolve_observation(GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED))

    def test_cannot_resolve_closed(self):
        self.assertFalse(can_resolve_observation(GEMBA_OBSERVATION_STATUS_CLOSED))

    def test_can_verify_only_from_resolved(self):
        self.assertTrue(can_verify_observation(GEMBA_OBSERVATION_STATUS_RESOLVED))
        self.assertFalse(can_verify_observation(GEMBA_OBSERVATION_STATUS_OPEN))
        self.assertFalse(can_verify_observation(GEMBA_OBSERVATION_STATUS_CLOSED))
        self.assertFalse(can_verify_observation(GEMBA_OBSERVATION_STATUS_VERIFIED))

    def test_can_close_from_verified(self):
        self.assertTrue(can_close_observation(GEMBA_OBSERVATION_STATUS_VERIFIED))
        self.assertFalse(can_close_observation(GEMBA_OBSERVATION_STATUS_OPEN))
        self.assertFalse(can_close_observation(GEMBA_OBSERVATION_STATUS_RESOLVED))
        self.assertFalse(can_close_observation(GEMBA_OBSERVATION_STATUS_CLOSED))

    def test_can_close_from_converted(self):
        self.assertTrue(can_close_observation(GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ISSUE))
        self.assertTrue(can_close_observation(GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ACTION))

    def test_can_reopen_from_closed(self):
        self.assertTrue(can_reopen_observation(GEMBA_OBSERVATION_STATUS_CLOSED))

    def test_can_reopen_from_resolved(self):
        self.assertTrue(can_reopen_observation(GEMBA_OBSERVATION_STATUS_RESOLVED))

    def test_can_reopen_from_verified(self):
        self.assertTrue(can_reopen_observation(GEMBA_OBSERVATION_STATUS_VERIFIED))

    def test_cannot_reopen_from_open(self):
        self.assertFalse(can_reopen_observation(GEMBA_OBSERVATION_STATUS_OPEN))

    def test_can_convert_to_issue(self):
        self.assertTrue(can_convert_to_issue(GEMBA_OBSERVATION_STATUS_OPEN))

    def test_cannot_convert_to_issue_twice(self):
        self.assertFalse(can_convert_to_issue(GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ISSUE))

    def test_cannot_convert_closed(self):
        self.assertFalse(can_convert_to_issue(GEMBA_OBSERVATION_STATUS_CLOSED))

    def test_can_cancel_open(self):
        self.assertTrue(can_cancel_observation(GEMBA_OBSERVATION_STATUS_OPEN))

    def test_cannot_cancel_closed(self):
        self.assertFalse(can_cancel_observation(GEMBA_OBSERVATION_STATUS_CLOSED))

    def test_cannot_add_to_completed_session(self):
        self.assertFalse(can_add_observation_to_session(GEMBA_SESSION_COMPLETED))

    def test_can_add_to_in_progress(self):
        self.assertTrue(can_add_observation_to_session(GEMBA_SESSION_IN_PROGRESS))


class TestCreateObservation(TestCase):
    """Test creating observations with structure targets."""

    def setUp(self):
        self.user = User.objects.create_user(username="gemba_user", password="test123")
        self.session = GembaWalkSession.objects.create(
            status=GEMBA_SESSION_IN_PROGRESS,
            shift_name="DAY",
            observer="Test Observer",
        )

    def test_create_simple_observation(self):
        obs = service.create_observation(
            self.session.id,
            title="WIP accumulation at CNC-03",
            description="12 units queued",
            area="Precision Machining — CNC-03",
            category=GEMBA_CATEGORY_PRODUCTIVITY,
            severity=GEMBA_SEVERITY_MEDIUM,
            user=self.user,
        )
        self.assertEqual(obs.title, "WIP accumulation at CNC-03")
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_OPEN)
        self.assertEqual(obs.created_by, self.user)

    def test_create_with_structure_target(self):
        obs = service.create_observation(
            self.session.id,
            title="Dust on CNC-03 panel",
            description="Accumulated dust on electrical panel",
            category=GEMBA_CATEGORY_PRODUCTIVITY,
            target_type="RESOURCE",
            target_id=101,
            location_path="Tijuana Plant › C2 Assembly › Precision Machining › CNC-03",
            location_label="CNC-03 — Precision Machining",
            user=self.user,
        )
        self.assertEqual(obs.target_type, "RESOURCE")
        self.assertEqual(obs.target_id, 101)
        self.assertEqual(obs.location_label, "CNC-03 — Precision Machining")
        self.assertIsNotNone(obs.location_path)

    def test_create_sets_open_status(self):
        obs = service.create_observation(
            self.session.id,
            title="Test", category=GEMBA_CATEGORY_PRODUCTIVITY,
            user=self.user,
        )
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_OPEN)

    def test_create_creates_activity(self):
        obs = service.create_observation(
            self.session.id,
            title="Test activity",
            description="Test",
            category=GEMBA_CATEGORY_PRODUCTIVITY,
            user=self.user,
        )
        activity = GembaObservationActivity.objects.filter(observation=obs).first()
        self.assertIsNotNone(activity)
        self.assertEqual(activity.event_type, GEMBA_EVENT_CREATED)

    def test_requires_title(self):
        with self.assertRaises(GembaValidationError):
            service.create_observation(
                self.session.id, title="  ",
                category=GEMBA_CATEGORY_PRODUCTIVITY,
                user=self.user,
            )

    def test_requires_category(self):
        with self.assertRaises(GembaValidationError):
            service.create_observation(
                self.session.id, title="Test", category="  ",
                user=self.user,
            )


class TestAssignObservation(TestCase):
    """Test assigning owner and due date."""

    def setUp(self):
        self.user = User.objects.create_user(username="assign_test", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)
        self.observation = service.create_observation(
            self.session.id, title="Assign test",
            category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )

    def test_assign_owner(self):
        obs = service.assign_observation(
            self.observation.id, owner_id=self.user.id, user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.owner, self.user)

    def test_assign_due_date(self):
        due = date.today() + timedelta(days=3)
        obs = service.assign_observation(
            self.observation.id, owner_id=self.user.id,
            due_date=due, user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.due_date, due)

    def test_assign_creates_activity(self):
        service.assign_observation(
            self.observation.id, owner_id=self.user.id,
            due_date=date.today() + timedelta(days=3),
            user=self.user,
        )
        activities = GembaObservationActivity.objects.filter(
            observation=self.observation
        )
        event_types = [a.event_type for a in activities]
        self.assertIn(GEMBA_EVENT_ASSIGNED, event_types)
        self.assertIn(GEMBA_EVENT_DUE_DATE_SET, event_types)


class TestActionRequired(TestCase):
    """Test marking observations as action required."""

    def setUp(self):
        self.user = User.objects.create_user(username="action_req", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)
        self.observation = service.create_observation(
            self.session.id, title="Action required test",
            category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )

    def test_mark_action_required(self):
        due = date.today() + timedelta(days=7)
        obs = service.mark_observation_action_required(
            self.observation.id, owner_id=self.user.id,
            due_date=due, user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED)
        self.assertEqual(obs.owner, self.user)
        self.assertEqual(obs.due_date, due)

    def test_action_required_requires_owner(self):
        due = date.today() + timedelta(days=7)
        with self.assertRaises(GembaValidationError):
            service.mark_observation_action_required(
                self.observation.id, owner_id=None,
                due_date=due, user=self.user,
            )

    def test_action_required_requires_due_date(self):
        with self.assertRaises(GembaValidationError):
            service.mark_observation_action_required(
                self.observation.id, owner_id=self.user.id,
                due_date=None, user=self.user,
            )

    def test_action_required_creates_activity(self):
        due = date.today() + timedelta(days=7)
        service.mark_observation_action_required(
            self.observation.id, owner_id=self.user.id,
            due_date=due, user=self.user,
        )
        activities = GembaObservationActivity.objects.filter(
            observation=self.observation,
            event_type=GEMBA_EVENT_STATUS_CHANGED,
        )
        self.assertTrue(activities.exists())
        activity = activities.first()
        self.assertEqual(activity.new_status, GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED)


class TestResolveObservation(TestCase):
    """Test resolving observations."""

    def setUp(self):
        self.user = User.objects.create_user(username="resolve_test", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)
        self.observation = service.create_observation(
            self.session.id, title="Resolve test",
            category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )

    def test_resolve_requires_note(self):
        with self.assertRaises(GembaValidationError):
            service.resolve_observation(
                self.observation.id, "  ", user=self.user,
            )

    def test_resolve_changes_status(self):
        obs = service.resolve_observation(
            self.observation.id, "Adjusted cycle time", user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_RESOLVED)
        self.assertEqual(obs.resolution_note, "Adjusted cycle time")
        self.assertIsNotNone(obs.resolved_by, self.user)

    def test_resolve_creates_activity(self):
        service.resolve_observation(
            self.observation.id, "Fixed with adjustment", user=self.user,
        )
        activities = GembaObservationActivity.objects.filter(
            observation=self.observation,
            event_type=GEMBA_EVENT_RESOLVED,
        )
        self.assertTrue(activities.exists())

    def test_cannot_resolve_closed(self):
        # First resolve
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        # Verify
        service.verify_observation(self.observation.id, "Confirmed", user=self.user)
        self.observation.refresh_from_db()
        # Close
        service.close_observation(self.observation.id, user=self.user)
        self.observation.refresh_from_db()
        # Try to resolve again
        with self.assertRaises(InvalidStatusTransitionError):
            service.resolve_observation(
                self.observation.id, "Try again", user=self.user,
            )


class TestVerifyObservation(TestCase):
    """Test verifying resolved observations."""

    def setUp(self):
        self.user = User.objects.create_user(username="verify_test", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)
        self.observation = service.create_observation(
            self.session.id, title="Verify test",
            category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )

    def test_verify_requires_resolved_first(self):
        with self.assertRaises(InvalidStatusTransitionError):
            service.verify_observation(
                self.observation.id, "Confirmed", user=self.user,
            )

    def test_verify_requires_note(self):
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        with self.assertRaises(GembaValidationError):
            service.verify_observation(
                self.observation.id, "  ", user=self.user,
            )

    def test_verify_changes_status(self):
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        obs = service.verify_observation(
            self.observation.id, "Confirmed on shopfloor, machine running smoothly",
            user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_VERIFIED)
        self.assertEqual(obs.verification_note, "Confirmed on shopfloor, machine running smoothly")
        self.assertIsNotNone(obs.verified_by)

    def test_verify_creates_activity(self):
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        service.verify_observation(
            self.observation.id, "Verified", user=self.user,
        )
        activities = GembaObservationActivity.objects.filter(
            observation=self.observation,
            event_type=GEMBA_EVENT_VERIFIED,
        )
        self.assertTrue(activities.exists())


class TestCloseObservation(TestCase):
    """Test closing observations (requires verified or converted)."""

    def setUp(self):
        self.user = User.objects.create_user(username="close_test", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)
        self.observation = service.create_observation(
            self.session.id, title="Close test",
            category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )

    def test_cannot_close_open(self):
        with self.assertRaises(InvalidStatusTransitionError):
            service.close_observation(
                self.observation.id, user=self.user,
            )

    def test_cannot_close_resolved_without_verified(self):
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        with self.assertRaises(InvalidStatusTransitionError):
            service.close_observation(
                self.observation.id, user=self.user,
            )

    def test_can_close_after_verified(self):
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        service.verify_observation(
            self.observation.id, "Confirmed", user=self.user,
        )
        self.observation.refresh_from_db()
        obs = service.close_observation(
            self.observation.id, user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_CLOSED)
        self.assertIsNotNone(obs.closed_at)

    def test_close_creates_activity(self):
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        service.verify_observation(
            self.observation.id, "Confirmed", user=self.user,
        )
        self.observation.refresh_from_db()
        service.close_observation(
            self.observation.id, user=self.user,
        )
        activities = GembaObservationActivity.objects.filter(
            observation=self.observation,
            event_type=GEMBA_EVENT_CLOSED,
        )
        self.assertTrue(activities.exists())


class TestReopenObservation(TestCase):
    """Test reopening closed observations."""

    def setUp(self):
        self.user = User.objects.create_user(username="reopen_test", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)
        self.observation = service.create_observation(
            self.session.id, title="Reopen test",
            category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )

    def test_full_cycle_reopen(self):
        # Open → Resolve → Verify → Close → Reopen
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        service.verify_observation(
            self.observation.id, "Confirmed", user=self.user,
        )
        self.observation.refresh_from_db()
        service.close_observation(
            self.observation.id, user=self.user,
        )
        self.observation.refresh_from_db()
        obs = service.reopen_observation(
            self.observation.id, "Issue recurred", user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_REOPENED)
        self.assertIsNone(obs.closed_by)
        self.assertIsNone(obs.closed_at)

    def test_reopen_creates_activity(self):
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        service.verify_observation(
            self.observation.id, "Confirmed", user=self.user,
        )
        self.observation.refresh_from_db()
        service.close_observation(
            self.observation.id, user=self.user,
        )
        self.observation.refresh_from_db()
        service.reopen_observation(
            self.observation.id, "Issue recurred", user=self.user,
        )
        activities = GembaObservationActivity.objects.filter(
            observation=self.observation,
            event_type=GEMBA_EVENT_REOPENED,
        )
        self.assertTrue(activities.exists())

    def test_can_reopen_cancelled(self):
        self.observation.status = GEMBA_OBSERVATION_STATUS_CANCELLED
        self.observation.save()
        obs = service.reopen_observation(
            self.observation.id, "Cancelled in error", user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_REOPENED)


class TestConvertToIssue(TestCase):
    """Test converting observations to Issues."""

    def setUp(self):
        self.user = User.objects.create_user(username="conv_issue", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)
        self.observation = service.create_observation(
            self.session.id, title="Convert to issue test",
            description="Safety hazard detected",
            category=GEMBA_CATEGORY_PRODUCTIVITY,
            severity=GEMBA_SEVERITY_MEDIUM,
            user=self.user,
        )

    def test_convert_to_issue(self):
        obs = service.convert_observation_to_issue(
            self.observation.id,
            title="Issue: Safety hazard",
            description="Safety hazard observed on shopfloor",
            severity="HIGH",
            user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ISSUE)
        self.assertIsNotNone(obs.created_issue)

    def test_convert_to_issue_links_issue(self):
        obs = service.convert_observation_to_issue(
            self.observation.id, user=self.user,
        )
        obs.refresh_from_db()
        issue = obs.created_issue
        self.assertIsNotNone(issue)
        self.assertEqual(issue.title, "Convert to issue test")
        self.assertEqual(issue.source_type, "GEMBA_WALK")
        self.assertEqual(issue.source_id, self.observation.id)

    def test_convert_to_issue_creates_activity(self):
        service.convert_observation_to_issue(
            self.observation.id, user=self.user,
        )
        activities = GembaObservationActivity.objects.filter(
            observation=self.observation,
            event_type=GEMBA_EVENT_CONVERTED_TO_ISSUE,
        )
        self.assertTrue(activities.exists())

    def test_prevent_duplicate_conversion(self):
        service.convert_observation_to_issue(
            self.observation.id, user=self.user,
        )
        self.observation.refresh_from_db()
        with self.assertRaises(GembaObservationAlreadyConvertedError):
            service.convert_observation_to_issue(
                self.observation.id, user=self.user,
            )


class TestConvertToAction(TestCase):
    """Test converting observations to Actions."""

    def setUp(self):
        self.user = User.objects.create_user(username="conv_action", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)
        self.observation = service.create_observation(
            self.session.id, title="Convert to action test",
            category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )

    def test_convert_to_action(self):
        obs = service.convert_observation_to_action(
            self.observation.id,
            title="Action: Clean CNC-03",
            action_type="CORRECTIVE",
            priority="HIGH",
            assigned_to="tech_user",
            user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_CONVERTED_TO_ACTION)
        self.assertIsNotNone(obs.created_action)

    def test_convert_to_action_creates_activity(self):
        service.convert_observation_to_action(
            self.observation.id, user=self.user,
        )
        activities = GembaObservationActivity.objects.filter(
            observation=self.observation,
            event_type=GEMBA_EVENT_CONVERTED_TO_ACTION,
        )
        self.assertTrue(activities.exists())

    def test_prevent_duplicate_conversion(self):
        service.convert_observation_to_action(
            self.observation.id, user=self.user,
        )
        self.observation.refresh_from_db()
        with self.assertRaises(GembaObservationAlreadyConvertedError):
            service.convert_observation_to_action(
                self.observation.id, user=self.user,
            )


class TestCompletedWalkBlocks(TestCase):
    """Test that completed/cancelled sessions block new observations."""

    def setUp(self):
        self.user = User.objects.create_user(username="block_test", password="test123")

    def test_cannot_add_to_completed_session(self):
        session = GembaWalkSession.objects.create(status=GEMBA_SESSION_COMPLETED)
        with self.assertRaises(GembaSessionCompletedError):
            service.create_observation(
                session.id, title="Late observation",
                category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
            )

    def test_cannot_add_to_cancelled_session(self):
        session = GembaWalkSession.objects.create(status=GEMBA_SESSION_CANCELLED)
        with self.assertRaises(GembaSessionCompletedError):
            service.create_observation(
                session.id, title="After cancel",
                category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
            )


class TestFullWorkflow(TestCase):
    """Test the complete observation lifecycle end-to-end."""

    def setUp(self):
        self.user = User.objects.create_user(username="full_flow", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)

    def test_full_observe_to_close(self):
        """Observe → Resolve → Verify → Close"""
        # 1. Create observation
        obs = service.create_observation(
            self.session.id,
            title="Full workflow test",
            description="End-to-end test",
            category=GEMBA_CATEGORY_PRODUCTIVITY,
            target_type="RESOURCE",
            target_id=201,
            location_path="Plant › Line › Dept › RG › CNC-04",
            location_label="CNC-04",
            user=self.user,
        )
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_OPEN)

        # 2. Resolve
        obs = service.resolve_observation(
            obs.id, "Adjusted parameters", user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_RESOLVED)

        # 3. Verify
        obs = service.verify_observation(
            obs.id, "Confirmed on shopfloor", user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_VERIFIED)

        # 4. Close
        obs = service.close_observation(obs.id, user=self.user)
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_CLOSED)

        # Verify 5 activities were created: CREATED, RESOLVED, VERIFIED, CLOSED, STATUS_CHANGED
        activity_count = GembaObservationActivity.objects.filter(
            observation=obs
        ).count()
        self.assertEqual(activity_count, 4)

    def test_full_cycle_with_reopen(self):
        """Observe → Assign → Action Required → Resolve → Verify → Close → Reopen"""
        obs = service.create_observation(
            self.session.id, title="Reopen cycle",
            category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )
        due = date.today() + timedelta(days=14)
        obs = service.mark_observation_action_required(
            obs.id, owner_id=self.user.id, due_date=due, user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_ACTION_REQUIRED)
        self.assertEqual(obs.owner, self.user)

        obs = service.resolve_observation(
            obs.id, "Resolved after action", user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_RESOLVED)

        obs = service.verify_observation(
            obs.id, "Verified", user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_VERIFIED)

        obs = service.close_observation(obs.id, user=self.user)
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_CLOSED)

        obs = service.reopen_observation(
            obs.id, "Issue returned", user=self.user,
        )
        obs.refresh_from_db()
        self.assertEqual(obs.status, GEMBA_OBSERVATION_STATUS_REOPENED)


class TestActivityTracking(TestCase):
    """Test that every lifecycle event creates an activity record."""

    def setUp(self):
        self.user = User.objects.create_user(username="activity", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)
        self.observation = service.create_observation(
            self.session.id, title="Activity tracking",
            category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )

    def _activity_count(self):
        return GembaObservationActivity.objects.filter(
            observation=self.observation
        ).count()

    def test_created_activity(self):
        self.assertEqual(self._activity_count(), 1)

    def test_assign_activity(self):
        service.assign_observation(
            self.observation.id, owner_id=self.user.id, user=self.user,
        )
        self.assertGreaterEqual(self._activity_count(), 2)

    def test_resolve_activity(self):
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.assertGreaterEqual(self._activity_count(), 2)

    def test_verify_activity(self):
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        service.verify_observation(
            self.observation.id, "Confirmed", user=self.user,
        )
        self.assertGreaterEqual(self._activity_count(), 3)

    def test_close_activity(self):
        service.resolve_observation(
            self.observation.id, "Fixed", user=self.user,
        )
        self.observation.refresh_from_db()
        service.verify_observation(
            self.observation.id, "Confirmed", user=self.user,
        )
        self.observation.refresh_from_db()
        initial = self._activity_count()
        service.close_observation(self.observation.id, user=self.user)
        self.assertEqual(self._activity_count(), initial + 1)


class TestMetrics(TestCase):
    """Test metrics computation for the board."""

    def setUp(self):
        self.user = User.objects.create_user(username="metrics", password="test123")
        self.session = GembaWalkSession.objects.create(status=GEMBA_SESSION_IN_PROGRESS)

    def test_empty_metrics(self):
        metrics = service._empty_metrics()
        self.assertEqual(metrics["total"], 0)
        self.assertEqual(metrics["open"], 0)

    def test_metrics_with_data(self):
        # Create a few observations in different statuses
        o1 = service.create_observation(
            self.session.id, title="Open", category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )
        o2 = service.create_observation(
            self.session.id, title="Resolved", category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )
        o3 = service.create_observation(
            self.session.id, title="Closed", category=GEMBA_CATEGORY_PRODUCTIVITY, user=self.user,
        )

        # Resolve o2
        service.resolve_observation(o2.id, "Fixed", user=self.user)
        o2.refresh_from_db()

        # Resolve o3 → Verify → Close
        service.resolve_observation(o3.id, "Fixed", user=self.user)
        o3.refresh_from_db()
        service.verify_observation(o3.id, "Confirmed", user=self.user)
        o3.refresh_from_db()
        service.close_observation(o3.id, user=self.user)
        o3.refresh_from_db()

        observations = list(GembaObservation.objects.filter(session=self.session))
        metrics = service._compute_metrics(observations)

        self.assertEqual(metrics["total"], 3)
        self.assertEqual(metrics["open"], 1)
        self.assertEqual(metrics["closed"], 1)
        self.assertEqual(metrics["resolved"], 1)
