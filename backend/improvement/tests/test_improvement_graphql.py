from django.test import TestCase
from django.contrib.auth.models import User
from improvement.services.application.suggestion_service import SuggestionService
from improvement.services.application.kaizen_service import KaizenService
from improvement.services.application.a3_pdca_service import A3PDCAService
from improvement.services.application.continuous_improvement_service import (
    ContinuousImprovementService,
)
from improvement.constants import (
    SUGGESTION_STATUS_NEW,
    SUGGESTION_STATUS_ACCEPTED,
    SUGGESTION_STATUS_REJECTED,
    SUGGESTION_STATUS_UNDER_REVIEW,
    SUGGESTION_STATUS_CONVERTED_TO_KAIZEN,
    KAIZEN_STATUS_PLANNED,
    KAIZEN_STATUS_IN_PROGRESS,
    KAIZEN_STATUS_COMPLETED,
    KAIZEN_STATUS_CANCELLED,
    A3_PHASE_DRAFT,
    A3_PHASE_PLAN,
    A3_STATUS_COMPLETED,
    A3_STATUS_CANCELLED,
)
from datetime import date, timedelta


class ImprovementGraphQLDelegationTest(TestCase):
    """Tests that all improvement GraphQL resolvers delegate to services."""

    def setUp(self):
        self.svc_s = SuggestionService()
        self.svc_k = KaizenService()
        self.svc_a3 = A3PDCAService()
        self.ci_service = ContinuousImprovementService()
        self.user = User.objects.create_user(
            username="testuser", password="testpass123"
        )

    # ── Suggestion mutation delegation ──

    def test_create_suggestion_delegates(self):
        s = self.svc_s.create_suggestion(
            title="GQL Suggestion",
            description="From GraphQL test",
            submitted_by="Test",
            target_type="Plant",
            target_id=1,
            category="Safety",
            priority="MEDIUM",
        )
        self.assertEqual(s.title, "GQL Suggestion")
        self.assertEqual(s.status, SUGGESTION_STATUS_NEW)

    def test_update_suggestion_delegates(self):
        s = self.svc_s.create_suggestion(title="Original")
        updated = self.svc_s.update_suggestion(s.id, title="Updated GQL")
        self.assertEqual(updated.title, "Updated GQL")

    def test_review_suggestion_delegates(self):
        s = self.svc_s.create_suggestion(title="Review Me")
        self.svc_s.review_suggestion(s.id)
        s.refresh_from_db()
        self.assertEqual(s.status, SUGGESTION_STATUS_UNDER_REVIEW)

    def test_accept_suggestion_delegates(self):
        s = self.svc_s.create_suggestion(title="Accept Me")
        self.svc_s.accept_suggestion(s.id, decision="Approved")
        s.refresh_from_db()
        self.assertEqual(s.status, SUGGESTION_STATUS_ACCEPTED)
        self.assertEqual(s.decision, "Approved")

    def test_reject_suggestion_delegates(self):
        s = self.svc_s.create_suggestion(title="Reject Me")
        self.svc_s.reject_suggestion(s.id, decision="Out of scope")
        s.refresh_from_db()
        self.assertEqual(s.status, SUGGESTION_STATUS_REJECTED)
        self.assertEqual(s.decision, "Out of scope")

    def test_convert_suggestion_to_kaizen_delegates(self):
        s = self.svc_s.create_suggestion(title="Convert Me")
        self.svc_s.accept_suggestion(s.id)
        self.svc_s.convert_suggestion_to_kaizen(s.id)
        s.refresh_from_db()
        self.assertEqual(s.status, SUGGESTION_STATUS_CONVERTED_TO_KAIZEN)

    # ── Kaizen mutation delegation ──

    def test_create_kaizen_delegates(self):
        k = self.svc_k.create_kaizen(
            title="GQL Kaizen",
            problem_statement="Test problem",
            target_type="Plant",
            target_id=1,
        )
        self.assertEqual(k.title, "GQL Kaizen")
        self.assertEqual(k.status, KAIZEN_STATUS_PLANNED)

    def test_update_kaizen_delegates(self):
        k = self.svc_k.create_kaizen(title="Original")
        updated = self.svc_k.update_kaizen(k.id, title="Updated Kaizen")
        self.assertEqual(updated.title, "Updated Kaizen")

    def test_start_kaizen_delegates(self):
        k = self.svc_k.create_kaizen(title="Start Me")
        self.svc_k.start_kaizen(k.id)
        k.refresh_from_db()
        self.assertEqual(k.status, KAIZEN_STATUS_IN_PROGRESS)

    def test_complete_kaizen_delegates(self):
        k = self.svc_k.create_kaizen(title="Complete Me")
        self.svc_k.start_kaizen(k.id)
        self.svc_k.complete_kaizen(k.id, "Done!")
        k.refresh_from_db()
        self.assertEqual(k.status, KAIZEN_STATUS_COMPLETED)
        self.assertEqual(k.completed_date, date.today())

    def test_cancel_kaizen_delegates(self):
        k = self.svc_k.create_kaizen(title="Cancel Me")
        self.svc_k.cancel_kaizen(k.id)
        k.refresh_from_db()
        self.assertEqual(k.status, KAIZEN_STATUS_CANCELLED)

    def test_add_kaizen_action_delegates(self):
        k = self.svc_k.create_kaizen(title="Action Kaizen")
        action = self.svc_k.add_kaizen_action(k.id, title="Action 1")
        self.assertEqual(action.kaizen_id, k.id)
        self.assertEqual(action.title, "Action 1")

    def test_update_kaizen_action_delegates(self):
        k = self.svc_k.create_kaizen(title="Action Update")
        action = self.svc_k.add_kaizen_action(k.id, title="Original")
        updated = self.svc_k.update_kaizen_action(action.id, title="Updated")
        self.assertEqual(updated.title, "Updated")

    def test_complete_kaizen_action_delegates(self):
        k = self.svc_k.create_kaizen(title="Action Complete")
        action = self.svc_k.add_kaizen_action(k.id, title="Do it")
        done = self.svc_k.complete_kaizen_action(action.id)
        from improvement.constants import KAIZEN_ACTION_STATUS_DONE
        self.assertEqual(done.status, KAIZEN_ACTION_STATUS_DONE)

    def test_cancel_kaizen_action_delegates(self):
        k = self.svc_k.create_kaizen(title="Action Cancel")
        action = self.svc_k.add_kaizen_action(k.id, title="Cancel it")
        cancelled = self.svc_k.cancel_kaizen_action(action.id)
        from improvement.constants import KAIZEN_ACTION_STATUS_CANCELLED
        self.assertEqual(cancelled.status, KAIZEN_ACTION_STATUS_CANCELLED)

    def test_create_a3_from_kaizen_delegates(self):
        from improvement.models import A3PDCA
        k = self.svc_k.create_kaizen(
            title="Source Kaizen",
            problem_statement="Problem",
            current_condition="Current state",
            target_condition="Target state",
        )
        self.svc_k.create_a3_from_kaizen(k.id)
        a3s = A3PDCA.objects.filter(source_kaizen=k)
        self.assertEqual(a3s.count(), 1)
        self.assertIn(k.title, a3s.first().title)

    # ── A3/PDCA mutation delegation ──

    def test_create_a3_pdca_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(
            title="GQL A3",
            background="Background",
            problem_statement="Problem",
            current_condition="Current",
            target_condition="Target",
            root_cause_analysis="Root cause",
            countermeasures="Actions",
            implementation_plan="Timeline",
            target_type="Plant",
            target_id=1,
        )
        self.assertEqual(a3.title, "GQL A3")
        self.assertEqual(a3.status, A3_PHASE_DRAFT)

    def test_update_a3_pdca_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="Original")
        updated = self.svc_a3.update_a3_pdca(a3.id, title="Updated A3")
        self.assertEqual(updated.title, "Updated A3")

    def test_move_a3_pdca_to_plan_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="Move to Plan")
        self.svc_a3.move_to_plan(a3.id)
        a3.refresh_from_db()
        self.assertEqual(a3.status, A3_PHASE_PLAN)

    def test_move_a3_pdca_to_do_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="Move to Do")
        self.svc_a3.move_to_plan(a3.id)
        self.svc_a3.move_to_do(a3.id)
        a3.refresh_from_db()
        from improvement.constants import A3_PHASE_DO
        self.assertEqual(a3.status, A3_PHASE_DO)

    def test_move_a3_pdca_to_check_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="Move to Check")
        self.svc_a3.move_to_plan(a3.id)
        self.svc_a3.move_to_do(a3.id)
        self.svc_a3.move_to_check(a3.id)
        a3.refresh_from_db()
        from improvement.constants import A3_PHASE_CHECK
        self.assertEqual(a3.status, A3_PHASE_CHECK)

    def test_move_a3_pdca_to_act_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="Move to Act")
        self.svc_a3.move_to_plan(a3.id)
        self.svc_a3.move_to_do(a3.id)
        self.svc_a3.move_to_check(a3.id)
        self.svc_a3.move_to_act(a3.id)
        a3.refresh_from_db()
        from improvement.constants import A3_PHASE_ACT
        self.assertEqual(a3.status, A3_PHASE_ACT)

    def test_complete_a3_pdca_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="Complete A3")
        self.svc_a3.move_to_plan(a3.id)
        self.svc_a3.complete_a3_pdca(a3.id)
        a3.refresh_from_db()
        self.assertEqual(a3.status, A3_STATUS_COMPLETED)
        self.assertEqual(a3.completed_date, date.today())

    def test_cancel_a3_pdca_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="Cancel A3")
        self.svc_a3.cancel_a3_pdca(a3.id)
        a3.refresh_from_db()
        self.assertEqual(a3.status, A3_STATUS_CANCELLED)

    def test_add_a3_pdca_action_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="A3 Actions")
        action = self.svc_a3.add_a3_action(a3.id, title="Action 1", phase="PLAN")
        self.assertEqual(action.a3_pdca_id, a3.id)
        self.assertEqual(action.phase, "PLAN")

    def test_update_a3_pdca_action_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="A3 Action Upd")
        action = self.svc_a3.add_a3_action(a3.id, title="Original")
        updated = self.svc_a3.update_a3_action(action.id, title="Updated")
        self.assertEqual(updated.title, "Updated")

    def test_complete_a3_pdca_action_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="A3 Action Done")
        action = self.svc_a3.add_a3_action(a3.id, title="Do it")
        done = self.svc_a3.complete_a3_action(action.id)
        from improvement.constants import A3_ACTION_STATUS_DONE
        self.assertEqual(done.status, A3_ACTION_STATUS_DONE)

    def test_cancel_a3_pdca_action_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="A3 Action Cancel")
        action = self.svc_a3.add_a3_action(a3.id, title="Cancel it")
        cancelled = self.svc_a3.cancel_a3_action(action.id)
        from improvement.constants import A3_ACTION_STATUS_CANCELLED
        self.assertEqual(cancelled.status, A3_ACTION_STATUS_CANCELLED)

    # ── Query delegation ──

    def test_suggestions_query_delegates(self):
        self.svc_s.create_suggestion(title="Query Suggestion")
        results = self.svc_s.list_suggestions()
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 1)

    def test_suggestion_query_delegates(self):
        s = self.svc_s.create_suggestion(title="Single Query")
        result = self.svc_s.get_suggestion(s.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.title, "Single Query")

    def test_kaizens_query_delegates(self):
        self.svc_k.create_kaizen(title="Query Kaizen")
        results = self.svc_k.list_kaizens()
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 1)

    def test_kaizen_query_delegates(self):
        k = self.svc_k.create_kaizen(title="Single Kaizen")
        result = self.svc_k.get_kaizen(k.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.title, "Single Kaizen")

    def test_a3_pdca_records_query_delegates(self):
        self.svc_a3.create_a3_pdca(title="Query A3")
        results = self.svc_a3.list_a3_pdca()
        self.assertIsInstance(results, list)
        self.assertGreaterEqual(len(results), 1)

    def test_a3_pdca_query_delegates(self):
        a3 = self.svc_a3.create_a3_pdca(title="Single A3")
        result = self.svc_a3.get_a3_pdca(a3.id)
        self.assertIsNotNone(result)
        self.assertEqual(result.title, "Single A3")

    def test_continuous_improvement_summary_delegates(self):
        summary = self.ci_service.get_improvement_summary()
        self.assertIsInstance(summary, dict)
        self.assertIn("total_suggestions", summary)
        self.assertIn("active_kaizen_count", summary)
        self.assertIn("active_a3_count", summary)

    # ── Resolver governance: resolvers contain no business logic ──

    def test_suggestion_resolvers_delegate_to_service(self):
        import inspect
        from api.mutations.improvement import ImprovementMutation
        from api.queries.improvement import ImprovementQuery

        suggestion_mutation_names = [
            "create_suggestion", "update_suggestion",
            "review_suggestion", "accept_suggestion",
            "reject_suggestion", "convert_suggestion_to_kaizen",
        ]
        for name in suggestion_mutation_names:
            source = inspect.getsource(getattr(ImprovementMutation, name))
            self.assertIn("SuggestionService", source,
                          f"{name} does not delegate to SuggestionService")
            self.assertNotIn("models.Suggestion(", source,
                             f"{name} creates model directly")
            self.assertNotIn("validate_target", source,
                             f"{name} contains validate_target")

        suggestion_query_names = ["suggestions", "suggestion"]
        for name in suggestion_query_names:
            if name == "suggestion":
                source = inspect.getsource(
                    getattr(ImprovementQuery, "suggestion")
                )
            else:
                source = inspect.getsource(
                    getattr(ImprovementQuery, name)
                )
            self.assertIn("SuggestionService", source,
                          f"{name} does not delegate to SuggestionService")

    def test_kaizen_resolvers_delegate_to_service(self):
        import inspect
        from api.mutations.improvement import ImprovementMutation
        from api.queries.improvement import ImprovementQuery

        kaizen_mutation_names = [
            "create_kaizen", "update_kaizen",
            "start_kaizen", "complete_kaizen", "cancel_kaizen",
            "add_kaizen_action", "update_kaizen_action",
            "complete_kaizen_action", "cancel_kaizen_action",
            "create_a3_from_kaizen",
        ]
        for name in kaizen_mutation_names:
            source = inspect.getsource(getattr(ImprovementMutation, name))
            self.assertIn("KaizenService", source,
                          f"{name} does not delegate to KaizenService")
            self.assertNotIn("def _get", source,
                             f"{name} contains domain logic")
            if "action" in name:
                self.assertNotIn("KaizenAction(", source,
                                 f"{name} creates model directly")

        kaizen_query_names = ["kaizens", "kaizen"]
        for name in kaizen_query_names:
            source = inspect.getsource(getattr(ImprovementQuery, name))
            self.assertIn("KaizenService", source,
                          f"{name} does not delegate to KaizenService")

    def test_a3_pdca_resolvers_delegate_to_service(self):
        import inspect
        from api.mutations.improvement import ImprovementMutation
        from api.queries.improvement import ImprovementQuery

        a3_mutation_names = [
            "create_a3_pdca", "update_a3_pdca",
            "move_a3_pdca_to_plan", "move_a3_pdca_to_do",
            "move_a3_pdca_to_check", "move_a3_pdca_to_act",
            "complete_a3_pdca", "cancel_a3_pdca",
            "add_a3_pdca_action", "update_a3_pdca_action",
            "complete_a3_pdca_action", "cancel_a3_pdca_action",
        ]
        for name in a3_mutation_names:
            source = inspect.getsource(getattr(ImprovementMutation, name))
            self.assertIn("A3PDCAService", source,
                          f"{name} does not delegate to A3PDCAService")
            self.assertNotIn("A3PDCA(", source,
                             f"{name} creates model directly")

        a3_query_names = ["a3_pdca_records", "a3_pdca"]
        for name in a3_query_names:
            source = inspect.getsource(getattr(ImprovementQuery, name))
            self.assertIn("A3PDCAService", source,
                          f"{name} does not delegate to A3PDCAService")

    def test_continuous_improvement_resolver_delegates_to_service(self):
        import inspect
        from api.queries.improvement import ImprovementQuery

        source = inspect.getsource(
            getattr(ImprovementQuery, "continuous_improvement_summary")
        )
        self.assertIn("ContinuousImprovementService", source,
                      "does not delegate to ContinuousImprovementService")
        self.assertNotIn("ImprovementSelector", source,
                         "resolver imports selector directly")

    def test_resolvers_contain_no_transition_logic(self):
        """Verify no resolver contains status transition logic."""
        import inspect
        from api.mutations.improvement import ImprovementMutation

        all_mutation_names = [
            name for name in dir(ImprovementMutation)
            if not name.startswith("_")
        ]
        for name in all_mutation_names:
            source = inspect.getsource(
                getattr(ImprovementMutation, name)
            )
            self.assertNotIn("status = ", source,
                             f"{name} contains status assignment")
            self.assertNotIn(".save(", source,
                             f"{name} calls .save() directly")


class ContinuousImprovementAggregationTest(TestCase):
    """Tests that the CI summary query correctly aggregates data."""

    def setUp(self):
        self.ci_service = ContinuousImprovementService()
        self.svc_s = SuggestionService()
        self.svc_k = KaizenService()
        self.svc_a3 = A3PDCAService()

        # Create test data across all 3 models
        # 5 suggestions
        self.svc_s.create_suggestion(title="S1", target_type="Plant", target_id=1)
        s2 = self.svc_s.create_suggestion(title="S2", target_type="Plant", target_id=1)
        self.svc_s.accept_suggestion(s2.id)
        s3 = self.svc_s.create_suggestion(title="S3", target_type="Plant", target_id=1)
        self.svc_s.reject_suggestion(s3.id)
        s4 = self.svc_s.create_suggestion(title="S4", target_type="Plant", target_id=1)
        self.svc_s.accept_suggestion(s4.id)
        self.svc_s.convert_suggestion_to_kaizen(s4.id)
        self.svc_s.create_suggestion(title="S5", target_type="Plant", target_id=1)

        # 4 kaizens
        self.svc_k.create_kaizen(title="K1", target_type="Plant", target_id=1)
        k2 = self.svc_k.create_kaizen(title="K2", target_type="ProductionLine", target_id=1)
        self.svc_k.start_kaizen(k2.id)
        self.svc_k.create_kaizen(title="K3", target_type="Department", target_id=1)
        self.svc_k.create_kaizen(
            title="K4", target_type="Plant", target_id=1,
            due_date=date.today() - timedelta(days=7),
        )
        # Note: K1 and K4 are PLANNED, K2 is IN_PROGRESS, K3 is PLANNED (no actions taken on K3)

        # 3 A3s
        self.svc_a3.create_a3_pdca(title="A1 Draft", target_type="Plant", target_id=1)
        a2 = self.svc_a3.create_a3_pdca(title="A2 Plan", target_type="Plant", target_id=1)
        self.svc_a3.move_to_plan(a2.id)
        self.svc_a3.create_a3_pdca(title="A3 Draft Extra", target_type="Plant", target_id=1)
        a3_done = self.svc_a3.create_a3_pdca(title="A3 Completed", target_type="ProductionLine", target_id=1)
        self.svc_a3.move_to_plan(a3_done.id)
        self.svc_a3.complete_a3_pdca(a3_done.id)

    def test_ci_summary_aggregates_suggestions(self):
        summary = self.ci_service.get_improvement_summary()
        self.assertEqual(summary["total_suggestions"], 5)
        self.assertEqual(summary["accepted_suggestions"], 1)  # only S2 has ACCEPTED
        self.assertEqual(summary["rejected_suggestions"], 1)  # S3
        self.assertEqual(summary["converted_suggestions"], 1)  # S4

    def test_ci_summary_aggregates_kaizens(self):
        summary = self.ci_service.get_improvement_summary()
        self.assertEqual(summary["active_kaizen_count"], 1)  # K2 is IN_PROGRESS
        self.assertEqual(summary["completed_kaizen_count"], 0)  # none completed
        self.assertEqual(summary["overdue_kaizen_count"], 1)  # K4 has past due_date

    def test_ci_summary_aggregates_a3s(self):
        summary = self.ci_service.get_improvement_summary()
        self.assertEqual(summary["active_a3_count"], 3)  # A1 Draft + A2 Plan + A3 Draft Extra = all non-COMPLETED
        self.assertEqual(summary["completed_a3_count"], 1)  # only A3 Completed

    def test_ci_summary_with_target_filter(self):
        plant_summary = self.ci_service.get_improvement_summary(
            {"target_type": "Plant"}
        )
        self.assertEqual(plant_summary["total_suggestions"], 5)  # all suggestions target Plant
        self.assertGreaterEqual(plant_summary["active_kaizen_count"], 0)
        self.assertGreaterEqual(plant_summary["active_a3_count"], 2)

    def test_ci_improvements_by_status(self):
        by_status = self.ci_service.get_improvements_by_status()
        statuses = {s["status"]: s["count"] for s in by_status}
        # At minimum, should contain suggestion and kaizen statuses
        self.assertIn("NEW", statuses)
        self.assertIn("ACCEPTED", statuses)
        self.assertIn("REJECTED", statuses)
        self.assertIn("CONVERTED_TO_KAIZEN", statuses)
        self.assertIn("PLANNED", statuses)
        self.assertIn("IN_PROGRESS", statuses)
        self.assertIn("DRAFT", statuses)
        self.assertIn("PLAN", statuses)
        self.assertIn("COMPLETED", statuses)

    def test_ci_improvements_by_target(self):
        by_target = self.ci_service.get_improvements_by_target()
        target_map = {t["target_type"]: t["count"] for t in by_target}
        self.assertIn("Plant", target_map)
        self.assertIn("ProductionLine", target_map)
        self.assertIn("Department", target_map)
