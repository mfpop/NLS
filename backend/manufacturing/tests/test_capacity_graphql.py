"""Tests that GraphQL queries/mutations for capacity delegate to domain services."""
from unittest.mock import patch
from datetime import datetime

from django.test import TestCase
from django.utils import timezone

from api.mutations.manufacturing import ManufacturingMutation
from api.queries.manufacturing import ManufacturingQuery
from api.types.manufacturing import WorkScheduleInput, CapacityProfileInput, CapacityRecalculationInput, WorkScheduleUpdateInput, ResourceGroupNode
from manufacturing.models import CapacitySnapshot


class Input:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    def __getattr__(self, name):
        return None


class Info:
    class Context:
        user = None
    context = Context()


class CapacityGraphQLDelegationTests(TestCase):

    def test_capacity_for_resource_reads_snapshot_without_recalculation(self):
        with patch("manufacturing.domain.capacity_service.NewCapacityService.calculate_scope_capacity") as mock:
            query = ManufacturingQuery()
            result = query.capacity_for_resource("res-1", "2025-01-01T00:00:00", "2025-01-02T00:00:00")
            mock.assert_not_called()
            self.assertIsNone(result)

    def test_capacity_for_resource_group_reads_snapshot_without_recalculation(self):
        with patch("manufacturing.domain.capacity_service.NewCapacityService.calculate_scope_capacity") as mock:
            query = ManufacturingQuery()
            result = query.capacity_for_resource_group("rg-1", "2025-01-01T00:00:00", "2025-01-02T00:00:00")
            mock.assert_not_called()
            self.assertIsNone(result)

    def test_capacity_for_department_reads_snapshot_without_recalculation(self):
        with patch("manufacturing.domain.capacity_service.NewCapacityService.calculate_scope_capacity") as mock:
            query = ManufacturingQuery()
            result = query.capacity_for_department("dept-1", "2025-01-01T00:00:00", "2025-01-02T00:00:00")
            mock.assert_not_called()
            self.assertIsNone(result)

    def test_capacity_for_production_line_reads_snapshot_without_recalculation(self):
        with patch("manufacturing.domain.capacity_service.NewCapacityService.calculate_scope_capacity") as mock:
            query = ManufacturingQuery()
            result = query.capacity_for_production_line("line-1", "2025-01-01T00:00:00", "2025-01-02T00:00:00")
            mock.assert_not_called()
            self.assertIsNone(result)

    def test_capacity_for_plant_reads_snapshot_without_recalculation(self):
        with patch("manufacturing.domain.capacity_service.NewCapacityService.calculate_scope_capacity") as mock:
            query = ManufacturingQuery()
            result = query.capacity_for_plant("plant-1", "2025-01-01T00:00:00", "2025-01-02T00:00:00")
            mock.assert_not_called()
            self.assertIsNone(result)

    def test_create_work_schedule_calls_service(self):
        with patch("manufacturing.domain.schedule_service.ScheduleService.create_schedule") as mock_sched:
            with patch("manufacturing.domain.capacity_cascade_service.CapacityCascadeService.recalculate_from_scope") as mock_cascade:
                mock_sched.return_value = type("obj", (), {
                    "id": "1", "scope_type": "PLANT", "scope_id": "p1",
                    "name": "Test", "timezone": "",
                    "effective_from": __import__("datetime").datetime(2025, 1, 1),
                    "effective_to": None, "is_active": True,
                    "created_at": __import__("datetime").datetime(2025, 1, 1),
                    "updated_at": __import__("datetime").datetime(2025, 1, 1),
                })()
                mock_cascade.return_value = []
                mutation = ManufacturingMutation()
                input_obj = WorkScheduleInput(
                    scope_type="PLANT", scope_id="p1", name="Test",
                    effective_from="2025-01-01T00:00:00",
                )
                result = mutation.create_work_schedule(Info(), input=input_obj)
                mock_sched.assert_called_once()

    def test_update_work_schedule_calls_service(self):
        with patch("manufacturing.domain.schedule_service.ScheduleService.update_schedule") as mock_sched:
            with patch("manufacturing.domain.capacity_cascade_service.CapacityCascadeService.recalculate_from_scope") as mock_cascade:
                mock_sched.return_value = type("obj", (), {
                    "id": "1", "scope_type": "PLANT", "scope_id": "p1",
                    "name": "Updated", "timezone": "",
                    "effective_from": __import__("datetime").datetime(2025, 1, 1),
                    "effective_to": None, "is_active": True,
                    "created_at": __import__("datetime").datetime(2025, 1, 1),
                    "updated_at": __import__("datetime").datetime(2025, 1, 1),
                })()
                mock_cascade.return_value = []
                mutation = ManufacturingMutation()
                input_obj = WorkScheduleUpdateInput(name="Updated")
                mutation.update_work_schedule(Info(), id="1", input=input_obj)
                mock_sched.assert_called_once()

    def test_archive_work_schedule_calls_service(self):
        with patch("manufacturing.domain.schedule_service.ScheduleService.archive_schedule") as mock_sched:
            with patch("manufacturing.domain.capacity_cascade_service.CapacityCascadeService.recalculate_from_scope") as mock_cascade:
                mock_sched.return_value = type("obj", (), {
                    "id": "1", "scope_type": "PLANT", "scope_id": "p1",
                    "name": "Archived", "timezone": "",
                    "effective_from": __import__("datetime").datetime(2025, 1, 1),
                    "effective_to": None, "is_active": False,
                    "created_at": __import__("datetime").datetime(2025, 1, 1),
                    "updated_at": __import__("datetime").datetime(2025, 1, 1),
                })()
                mock_cascade.return_value = []
                mutation = ManufacturingMutation()
                mutation.archive_work_schedule(Info(), id="1")
                mock_sched.assert_called_once()

    def test_create_capacity_profile_calls_service(self):
        with patch("manufacturing.domain.capacity_service.NewCapacityService.create_profile") as mock:
            mock.return_value = type("obj", (), {
                "id": "1", "scope_type": "PLANT", "scope_id": "p1",
                "capacity_mode": "MANUAL", "manual_capacity": 100.0,
                "capacity_uom": "units", "efficiency_factor": 1.0,
                "oee_factor": None, "takt_factor": None, "is_active": True,
            })()
            mutation = ManufacturingMutation()
            input_obj = CapacityProfileInput(
                scope_type="PLANT", scope_id="p1",
                capacity_mode="MANUAL", manual_capacity=100.0,
            )
            result = mutation.create_capacity_profile(Info(), input=input_obj)
            mock.assert_called_once()

    def test_update_capacity_profile_calls_service(self):
        with patch("manufacturing.domain.capacity_service.NewCapacityService.update_profile") as mock:
            mock.return_value = type("obj", (), {
                "id": "1", "scope_type": "PLANT", "scope_id": "p1",
                "capacity_mode": "MANUAL", "manual_capacity": 200.0,
                "capacity_uom": "units", "efficiency_factor": 1.0,
                "oee_factor": None, "takt_factor": None, "is_active": True,
            })()
            mutation = ManufacturingMutation()
            mutation.update_capacity_profile(Info(), id="1", input=type("input", (), {
                "capacity_mode": "MANUAL", "manual_capacity": 200.0,
                "capacity_uom": None, "efficiency_factor": None,
                "oee_factor": None, "takt_factor": None,
            })())
            mock.assert_called_once()

    def test_archive_capacity_profile_calls_service(self):
        with patch("manufacturing.domain.capacity_service.NewCapacityService.archive_profile") as mock:
            mock.return_value = type("obj", (), {
                "id": "1", "scope_type": "PLANT", "scope_id": "p1",
                "capacity_mode": "MANUAL", "manual_capacity": None,
                "capacity_uom": "", "efficiency_factor": 1.0,
                "oee_factor": None, "takt_factor": None,
                "is_active": False,
            })()
            mutation = ManufacturingMutation()
            mutation.archive_capacity_profile(Info(), id="1")
            mock.assert_called_once()

    def test_recalculate_capacity_calls_service(self):
        from manufacturing.domain.capacity_service import NewCapacityService
        with patch.object(NewCapacityService, "calculate_scope_capacity") as mock:
            mock.return_value = type("snap", (), {
                "id": 1, "scope_type": "PLANT", "scope_id": "p1",
                "available_minutes": 480, "theoretical_capacity": 100.0,
                "effective_capacity": 85.0, "bottleneck_capacity": None,
                "machine_capacity_units": 100.0, "labor_capacity_units": 85.0,
                "effective_capacity_units": 85.0, "constraint_reason": "LABOR",
                "machine_available_minutes": 480, "labor_available_minutes": 420,
                "operators_required": 2, "operators_available": 1,
                "capacity_uom": "units", "snapshot_type": "PLANNING",
                "status": "ACTIVE", "version": 1,
                "from_datetime": datetime(2025, 1, 1),
                "to_datetime": datetime(2025, 1, 2),
                "calculated_at": datetime(2025, 1, 1),
                "missing_reasons": [],
            })()
            mutation = ManufacturingMutation()
            input_obj = CapacityRecalculationInput(
                scope_type="PLANT", scope_id="p1",
                from_datetime="2025-01-01T00:00:00",
                to_datetime="2025-01-02T00:00:00",
            )
            result = mutation.recalculate_capacity(Info(), input=input_obj)
            mock.assert_called_once()
            self.assertTrue(result.ok)
            self.assertEqual(result.snapshot.effective_capacity_units, 85.0)

    def test_graphql_contains_no_capacity_math(self):
        """Verify GraphQL resolvers don't do capacity math directly."""
        import inspect
        from api.queries.manufacturing import ManufacturingQuery
        from api.mutations.manufacturing import ManufacturingMutation

        query_source = inspect.getsource(ManufacturingQuery)
        mutation_source = inspect.getsource(ManufacturingMutation)

        math_keywords = ["available_minutes =", "theoretical_capacity =", "effective_capacity ="]
        for keyword in math_keywords:
            self.assertNotIn(keyword, query_source,
                             f"Query resolver contains capacity math: {keyword}")
            self.assertNotIn(keyword, mutation_source,
                             f"Mutation resolver contains capacity math: {keyword}")

    def test_graphql_resource_group_mapping_contains_no_capacity_formula(self):
        import inspect
        from api.types.manufacturing import ResourceGroupNode

        source = inspect.getsource(ResourceGroupNode.from_db)
        self.assertNotIn("available_minutes =", source)
        self.assertNotIn("theoretical_capacity =", source)
        self.assertNotIn("effective_capacity =", source)

    def test_recalculate_resource_group_capacity_mutation_calls_service(self):
        from manufacturing.domain.capacity_service import NewCapacityService
        with patch.object(NewCapacityService, "calculate_scope_capacity") as mock:
            mock.return_value = type("snap", (), {
                "id": 1, "scope_type": "RESOURCE_GROUP", "scope_id": "1",
                "available_minutes": 480, "theoretical_capacity": 100.0,
                "effective_capacity": 85.0, "bottleneck_capacity": None,
                "machine_capacity_units": 100.0, "labor_capacity_units": 85.0,
                "effective_capacity_units": 85.0, "constraint_reason": "LABOR",
                "machine_available_minutes": 480, "labor_available_minutes": 420,
                "operators_required": 2, "operators_available": 1,
                "capacity_uom": "units", "snapshot_type": "PLANNING",
                "status": "ACTIVE", "version": 1,
                "from_datetime": datetime(2025, 1, 1),
                "to_datetime": datetime(2025, 1, 2),
                "calculated_at": datetime(2025, 1, 1),
                "missing_reasons": [],
                "source_schedule": None, "source_profile": None,
            })()
            mutation = ManufacturingMutation()
            result = mutation.recalculate_resource_group_capacity(
                Info(), resource_group_id="1",
                from_datetime="2025-01-01T00:00:00",
                to_datetime="2025-01-02T00:00:00",
            )
            mock.assert_called_once()

    def test_resource_group_detail_exposes_latest_capacity_snapshot(self):
        from manufacturing.models import ResourceGroup, Department, Plant, Company
        from manufacturing.models.capacity import CapacitySnapshot
        from datetime import datetime

        company = Company.objects.create(code="T", name="T")
        plant = Plant.objects.create(company=company, code="P", name="P")
        dept = Department.objects.create(plant=plant, code="D", name="D")
        rg = ResourceGroup.objects.create(department=dept, code="RG", name="RG")
        start = timezone.make_aware(datetime(2025, 1, 1))
        end = timezone.make_aware(datetime(2025, 1, 2))
        snap = CapacitySnapshot.objects.create(
            scope_type="RESOURCE_GROUP", scope_id=str(rg.id),
            from_datetime=start, to_datetime=end,
            available_minutes=480, theoretical_capacity=100.0,
            effective_capacity=85.0, version=1, status="ACTIVE",
            machine_capacity_units=100.0,
            labor_capacity_units=85.0,
            effective_capacity_units=85.0,
            constraint_reason="LABOR",
            machine_available_minutes=480,
            labor_available_minutes=420,
            operators_required=2,
            operators_available=1,
            missing_reasons=[],
        )
        node = ResourceGroupNode.from_db(rg)
        self.assertIsNotNone(node.latest_capacity)
        self.assertEqual(node.latest_capacity.available_minutes, 480)
        self.assertEqual(node.latest_capacity.effective_capacity, 85.0)
        self.assertEqual(node.latest_capacity.machine_capacity_units, 100.0)
        self.assertEqual(node.latest_capacity.labor_capacity_units, 85.0)
        self.assertEqual(node.latest_capacity.effective_capacity_units, 85.0)
        self.assertEqual(node.latest_capacity.constraint_reason, "LABOR")

    def test_resource_group_detail_no_snapshot_shows_none(self):
        from manufacturing.models import ResourceGroup, Department, Plant, Company

        company = Company.objects.create(code="T", name="T")
        plant = Plant.objects.create(company=company, code="P", name="P")
        dept = Department.objects.create(plant=plant, code="D", name="D")
        rg = ResourceGroup.objects.create(department=dept, code="RG", name="RG")
        node = ResourceGroupNode.from_db(rg)
        self.assertIsNone(node.latest_capacity)

    def test_resource_group_detail_exposes_resolved_schedule(self):
        from manufacturing.domain.schedule_assignment_service import ScheduleAssignmentService
        from manufacturing.models import ResourceGroup, Department, Plant, Company, WorkSchedule, WorkShift

        company = Company.objects.create(code="T", name="T")
        plant = Plant.objects.create(company=company, code="P", name="P", timezone="America/Los_Angeles", week_start_day="Monday")
        dept = Department.objects.create(plant=plant, code="D", name="D")
        rg = ResourceGroup.objects.create(department=dept, code="RG", name="RG")
        schedule = WorkSchedule.objects.create(
            scope_type="RESOURCE_GROUP", scope_id=str(rg.id), name="RG Schedule",
            timezone="America/Los_Angeles", effective_from=timezone.now(),
        )
        WorkShift.objects.create(
            schedule=schedule, name="Day Shift", weekday=0,
            start_time="06:00", end_time="14:00", paid_minutes=480,
        )
        ScheduleAssignmentService.assign(
            plant_id=str(plant.id), scope_type="RESOURCE_GROUP", scope_id=str(rg.id),
            work_schedule_id=str(schedule.id),
        )

        node = ResourceGroupNode.from_db(rg)
        self.assertTrue(node.resolved_schedule.is_configured)
        self.assertEqual(node.resolved_schedule.calendar_name, "RG Schedule")
        self.assertEqual(node.resolved_schedule.shift_name, "Day Shift")

    def test_resource_group_detail_query_does_not_recalculate(self):
        with patch("manufacturing.domain.capacity_service.NewCapacityService.calculate_scope_capacity") as mock:
            from manufacturing.models import ResourceGroup, Department, Plant, Company

            company = Company.objects.create(code="T", name="T")
            plant = Plant.objects.create(company=company, code="P", name="P")
            dept = Department.objects.create(plant=plant, code="D", name="D")
            rg = ResourceGroup.objects.create(department=dept, code="RG", name="RG")

            query = ManufacturingQuery()
            result = query.resource_group(str(rg.id))
            mock.assert_not_called()

    def test_capacity_snapshots_paginate_correctly(self):
        start = timezone.make_aware(datetime(2025, 1, 1))
        end = timezone.make_aware(datetime(2025, 1, 2))
        for idx in range(3):
            CapacitySnapshot.objects.create(
                scope_type="RESOURCE",
                scope_id=str(idx),
                from_datetime=start,
                to_datetime=end,
                available_minutes=10,
                theoretical_capacity=10,
                effective_capacity=10,
                version=1,
                missing_reasons=[],
            )

        result = ManufacturingQuery().capacity_snapshots(limit=2, offset=0)
        self.assertEqual(result.total, 3)
        self.assertEqual(len(result.items), 2)
        self.assertTrue(result.has_more)

    def test_capacity_snapshot_queries_are_read_only(self):
        start = timezone.make_aware(datetime(2025, 1, 1))
        end = timezone.make_aware(datetime(2025, 1, 2))
        CapacitySnapshot.objects.create(
            scope_type="PLANT",
            scope_id="1",
            from_datetime=start,
            to_datetime=end,
            available_minutes=10,
            theoretical_capacity=10,
            effective_capacity=10,
            version=1,
            missing_reasons=[],
        )
        before = CapacitySnapshot.objects.count()
        ManufacturingQuery().capacity_snapshots(limit=10, offset=0)
        self.assertEqual(CapacitySnapshot.objects.count(), before)
