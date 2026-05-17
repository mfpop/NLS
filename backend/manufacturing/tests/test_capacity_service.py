from unittest.mock import patch, MagicMock
from datetime import datetime

from django.test import TestCase
from django.core.exceptions import ValidationError

from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
from manufacturing.domain.capacity_service import NewCapacityService, NewCapacityValidationError
from manufacturing.domain.capacity_cascade_service import CapacityCascadeService
from manufacturing.models.capacity import (
    WorkSchedule, WorkShift, CapacityProfile, CapacitySnapshot,
    CapacityMode, ScheduleScope, CapacityRecalculationJob,
)


class CapacityServiceTests(TestCase):

    def setUp(self):
        self.schedule = WorkSchedule.objects.create(
            scope_type="PLANT",
            scope_id="1",
            name="Plant Schedule",
            effective_from="2025-01-01 00:00:00",
            effective_to="2025-12-31 00:00:00",
        )
        WorkShift.objects.create(
            schedule=self.schedule,
            name="Day Shift",
            weekday=0,
            start_time="06:00",
            end_time="14:00",
            paid_minutes=480,
            break_minutes=30,
            net_minutes=450,
        )
        WorkShift.objects.create(
            schedule=self.schedule,
            name="Day Shift",
            weekday=1,
            start_time="06:00",
            end_time="14:00",
            paid_minutes=480,
            break_minutes=30,
            net_minutes=450,
        )

    @patch("manufacturing.domain.schedule_service.ScheduleService.resolve_schedule")
    def test_resource_uses_own_schedule(self, mock_resolve):
        mock_resolve.return_value = self.schedule
        schedule = ScheduleService.resolve_schedule("RESOURCE", "1")
        self.assertIsNotNone(schedule)

    @patch("manufacturing.domain.schedule_service.ScheduleService.resolve_schedule")
    def test_resource_inherits_resource_group_schedule(self, mock_resolve):
        mock_resolve.return_value = self.schedule
        schedule = ScheduleService.resolve_schedule("RESOURCE", "1")
        self.assertIsNotNone(schedule)

    @patch("manufacturing.domain.schedule_service.ScheduleService.resolve_schedule")
    def test_resource_group_inherits_department_schedule(self, mock_resolve):
        mock_resolve.return_value = self.schedule
        schedule = ScheduleService.resolve_schedule("RESOURCE_GROUP", "1")
        self.assertIsNotNone(schedule)

    @patch("manufacturing.domain.schedule_service.ScheduleService.resolve_schedule")
    def test_department_inherits_plant_schedule(self, mock_resolve):
        mock_resolve.return_value = self.schedule
        schedule = ScheduleService.resolve_schedule("DEPARTMENT", "1")
        self.assertIsNotNone(schedule)

    @patch("manufacturing.domain.schedule_service.ScheduleService.resolve_schedule")
    def test_no_schedule_rejected(self, mock_resolve):
        mock_resolve.return_value = None
        snap = NewCapacityService.calculate_scope_capacity(
            "PLANT", "1",
            datetime(2025, 1, 1), datetime(2025, 1, 2),
        )
        self.assertEqual(snap.constraint_reason, "NO_SCHEDULE")
        self.assertEqual(snap.effective_capacity_units, 0.0)

    def test_available_minutes_excludes_breaks(self):
        schedule = WorkSchedule.objects.create(
            scope_type="PLANT", scope_id="1",
            name="Break Test", effective_from="2025-01-01 00:00:00",
        )
        WorkShift.objects.create(
            schedule=schedule, name="Shift", weekday=0,
            start_time="06:00", end_time="14:00",
            paid_minutes=480, break_minutes=60, net_minutes=420,
        )
        shifts = WorkShift.objects.filter(schedule=schedule, is_active=True)
        total_net = sum(s.net_minutes for s in shifts)
        self.assertEqual(total_net, 420)

    def test_invalid_time_window_rejected(self):
        with self.assertRaises(NewCapacityValidationError) as ctx:
            NewCapacityService.calculate_scope_capacity(
                "PLANT", "1",
                datetime(2025, 1, 2), datetime(2025, 1, 1),
            )
        self.assertIn("INVALID_RANGE", str(ctx.exception.code))

    @patch("manufacturing.domain.capacity_service.NewCapacityService._aggregate_plant")
    @patch("manufacturing.domain.capacity_service.ScheduleService.resolve_schedule")
    def test_resource_capacity_formula(self, mock_resolve, mock_agg):
        mock_resolve.return_value = self.schedule
        mock_agg.return_value = {"theoretical": 100.0, "effective": 85.0, "bottleneck": None}
        CapacityProfile.objects.create(
            scope_type="PLANT",
            scope_id="1",
            capacity_mode=CapacityMode.RESOURCE_SUM,
            capacity_uom="units",
            efficiency_factor=0.85,
            oee_factor=0.92,
        )
        snap = NewCapacityService.calculate_scope_capacity(
            "PLANT", "1",
            datetime(2025, 1, 6),
            datetime(2025, 1, 7),
        )
        self.assertIsNotNone(snap)
        self.assertEqual(snap.scope_type, "PLANT")

    @patch("manufacturing.domain.capacity_service.NewCapacityService._aggregate_resource_group")
    @patch("manufacturing.domain.capacity_service.ScheduleService.resolve_schedule")
    def test_resource_group_capacity_resource_sum(self, mock_resolve, mock_agg):
        mock_resolve.return_value = self.schedule
        mock_agg.return_value = {"theoretical": 100.0, "effective": 85.0, "bottleneck": 40.0}
        CapacityProfile.objects.create(
            scope_type="RESOURCE_GROUP", scope_id="rg-1",
            capacity_mode=CapacityMode.RESOURCE_SUM,
            efficiency_factor=1.0, oee_factor=1.0,
        )
        result = NewCapacityService._aggregate_resource_group(
            "rg-1", 480, 1.0, 1.0, "RESOURCE_SUM", None,
        )
        self.assertEqual(result["theoretical"], 100.0)

    @patch("manufacturing.domain.capacity_service.NewCapacityService._aggregate_resource_group")
    @patch("manufacturing.domain.capacity_service.ScheduleService.resolve_schedule")
    def test_resource_group_capacity_bottleneck(self, mock_resolve, mock_agg):
        mock_resolve.return_value = self.schedule
        mock_agg.return_value = {"theoretical": 40.0, "effective": 40.0, "bottleneck": 40.0}
        result = NewCapacityService._aggregate_resource_group(
            "1", 480, 1.0, 1.0, "BOTTLENECK", None,
        )
        self.assertEqual(result["bottleneck"], 40.0)

    @patch("manufacturing.domain.capacity_service.NewCapacityService._aggregate_department")
    def test_department_capacity_sum(self, mock_agg):
        mock_agg.return_value = {"theoretical": 200.0, "effective": 170.0, "bottleneck": 80.0}
        result = NewCapacityService._aggregate_department(
            "1", 480, 1.0, 1.0, "RESOURCE_SUM", None,
        )
        self.assertEqual(result["theoretical"], 200.0)

    @patch("manufacturing.domain.capacity_service.NewCapacityService._aggregate_production_line")
    def test_production_line_capacity_bottleneck(self, mock_agg):
        mock_agg.return_value = {"theoretical": 150.0, "effective": 150.0, "bottleneck": 150.0}
        result = NewCapacityService._aggregate_production_line(
            "1", 480, 1.0, 1.0, "BOTTLENECK", None,
        )
        self.assertEqual(result["bottleneck"], 150.0)

    @patch("manufacturing.domain.capacity_service.NewCapacityService._aggregate_plant")
    def test_plant_capacity_sum_lines(self, mock_agg):
        mock_agg.return_value = {"theoretical": 500.0, "effective": 425.0, "bottleneck": 100.0}
        result = NewCapacityService._aggregate_plant(
            "1", 480, 1.0, 1.0, "RESOURCE_SUM", None,
        )
        self.assertEqual(result["theoretical"], 500.0)

    def test_manual_capacity_mode(self):
        profile = CapacityProfile.objects.create(
            scope_type="PLANT", scope_id="plant-manual",
            capacity_mode=CapacityMode.MANUAL,
            manual_capacity=1000.0,
            capacity_uom="units",
        )
        self.assertEqual(profile.manual_capacity, 1000.0)
        self.assertEqual(profile.capacity_mode, CapacityMode.MANUAL)

    @patch("manufacturing.domain.capacity_service.NewCapacityService.calculate_scope_capacity")
    def test_capacity_calculation_cascade(self, mock_calc):
        mock_snap = MagicMock()
        mock_snap.effective_capacity = 100.0
        mock_calc.return_value = mock_snap
        with patch("manufacturing.models.ProductionLine.objects.filter") as mock_filter:
            mock_filter.return_value = []
            result = NewCapacityService._aggregate_plant(
                "1", 480, 1.0, 1.0, "RESOURCE_SUM", None,
            )
            self.assertIsNotNone(result)

    def test_calculate_scope_capacity_resource_manual(self):
        """Test a simple resource-level capacity with explicit schedule and profile."""
        from manufacturing.models import Plant, Company, Department, ResourceGroup, Resource

        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        resource = Resource.objects.create(resource_group=rg, code="R1", name="R1")

        res_id = str(resource.id)
        schedule = WorkSchedule.objects.create(
            scope_type="RESOURCE", scope_id=res_id,
            name="Resource Sched",
            effective_from="2025-01-01 00:00:00",
            effective_to="2025-01-31 00:00:00",
        )
        WorkShift.objects.create(
            schedule=schedule, name="Shift", weekday=0,
            start_time="08:00", end_time="17:00",
            paid_minutes=540, break_minutes=60, net_minutes=480,
        )
        CapacityProfile.objects.create(
            scope_type="RESOURCE", scope_id=res_id,
            capacity_mode=CapacityMode.MANUAL,
            manual_capacity=500.0,
            capacity_uom="units",
        )
        snap = NewCapacityService.calculate_scope_capacity(
            "RESOURCE", res_id,
            datetime(2025, 1, 6), datetime(2025, 1, 7),
        )
        self.assertIsNotNone(snap)
        self.assertEqual(snap.scope_type, "RESOURCE")

    def test_resource_group_capacity_snapshot_created_after_recalculate(self):
        from manufacturing.models import Plant, Company, Department, ResourceGroup

        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")

        schedule = WorkSchedule.objects.create(
            scope_type="DEPARTMENT", scope_id=str(dept.id),
            name="Dept Sched",
            effective_from="2025-01-01 00:00:00",
            effective_to="2025-01-31 00:00:00",
        )
        WorkShift.objects.create(
            schedule=schedule, name="Shift", weekday=0,
            start_time="08:00", end_time="17:00",
            paid_minutes=540, break_minutes=60, net_minutes=480,
        )

        snap = NewCapacityService.calculate_scope_capacity(
            "RESOURCE_GROUP", str(rg.id),
            datetime(2025, 1, 6), datetime(2025, 1, 7),
        )
        self.assertIsNotNone(snap)
        self.assertEqual(snap.scope_type, "RESOURCE_GROUP")
        self.assertGreater(snap.available_minutes, 0)

    def test_resource_group_without_schedule_returns_no_schedule_snapshot(self):
        from manufacturing.models import Plant, Company, Department, ResourceGroup

        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")

        snap = NewCapacityService.calculate_scope_capacity(
            "RESOURCE_GROUP", str(rg.id),
            datetime(2025, 1, 6), datetime(2025, 1, 7),
        )
        self.assertEqual(snap.constraint_reason, "NO_SCHEDULE")
        self.assertEqual(snap.machine_capacity_units, 0.0)
        self.assertEqual(snap.effective_capacity_units, 0.0)

    def test_resource_group_capacity_rolls_up_child_resources(self):
        from manufacturing.models import Plant, Company, Department, ResourceGroup, Resource

        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        res1 = Resource.objects.create(resource_group=rg, code="R1", name="R1")
        res2 = Resource.objects.create(resource_group=rg, code="R2", name="R2")

        # Create a Department schedule so ResourceGroup can inherit it
        dept_sched = WorkSchedule.objects.create(
            scope_type="DEPARTMENT", scope_id=str(dept.id),
            name="Dept Schedule",
            effective_from="2025-01-01 00:00:00",
            effective_to="2025-01-31 00:00:00",
        )
        WorkShift.objects.create(
            schedule=dept_sched, name="Shift", weekday=0,
            start_time="08:00", end_time="17:00",
            paid_minutes=540, break_minutes=60, net_minutes=480,
        )

        for r in [res1, res2]:
            s = WorkSchedule.objects.create(
                scope_type="RESOURCE", scope_id=str(r.id),
                name=f"Sched {r.code}",
                effective_from="2025-01-01 00:00:00",
                effective_to="2025-01-31 00:00:00",
            )
            WorkShift.objects.create(
                schedule=s, name="Shift", weekday=0,
                start_time="08:00", end_time="17:00",
                paid_minutes=540, break_minutes=60, net_minutes=480,
            )
            CapacityProfile.objects.create(
                scope_type="RESOURCE", scope_id=str(r.id),
                capacity_mode=CapacityMode.MANUAL,
                manual_capacity=100.0,
                capacity_uom="units",
            )

        snap = NewCapacityService.calculate_scope_capacity(
            "RESOURCE_GROUP", str(rg.id),
            datetime(2025, 1, 6), datetime(2025, 1, 7),
        )
        self.assertIsNotNone(snap)
        self.assertEqual(snap.scope_type, "RESOURCE_GROUP")

    def test_machine_and_labor_capacity_are_stored_separately(self):
        from django.contrib.auth import get_user_model
        from manufacturing.models import (
            Company, Department, LaborRequirement, OperatorAssignment, Plant,
            ResourceGroup, ScheduleAssignment,
        )

        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        schedule = WorkSchedule.objects.create(
            scope_type="RESOURCE_GROUP", scope_id=str(rg.id), name="RG Schedule",
            effective_from=datetime(2025, 1, 1), effective_to=datetime(2025, 1, 31),
        )
        WorkShift.objects.create(
            schedule=schedule, name="Shift", weekday=0,
            start_time="08:00", end_time="16:00",
            paid_minutes=480, break_minutes=0,
        )
        sched_assignment = ScheduleAssignment.objects.create(
            plant=plant, entity_type="RESOURCE_GROUP", entity_id=str(rg.id),
            work_schedule=schedule, is_active=True,
        )
        CapacityProfile.objects.create(
            scope_type="RESOURCE_GROUP", scope_id=str(rg.id),
            capacity_mode=CapacityMode.MANUAL, manual_capacity=100.0,
            capacity_uom="units",
        )
        LaborRequirement.objects.create(
            plant=plant, resource_group=rg, operators_required=1,
            labor_minutes_per_unit=10.0, effective_from=datetime(2025, 1, 1),
        )
        user = get_user_model().objects.create_user(username="operator1")
        OperatorAssignment.objects.create(
            plant=plant, operator=user, resource_group=rg,
            schedule_assignment=sched_assignment, effective_from=datetime(2025, 1, 1),
        )

        snap = NewCapacityService.calculate_scope_capacity(
            "RESOURCE_GROUP", str(rg.id),
            datetime(2025, 1, 6), datetime(2025, 1, 7),
        )

        self.assertEqual(snap.machine_capacity_units, 100.0)
        self.assertEqual(snap.labor_capacity_units, 48.0)
        self.assertEqual(snap.effective_capacity_units, 48.0)
        self.assertEqual(snap.effective_capacity, 48.0)
        self.assertEqual(snap.constraint_reason, "LABOR")
        self.assertEqual(snap.operators_required, 1)
        self.assertEqual(snap.operators_available, 1)

    def test_missing_labor_sets_no_labor_constraint(self):
        from manufacturing.models import Company, Department, Plant, ResourceGroup, ScheduleAssignment

        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        schedule = WorkSchedule.objects.create(
            scope_type="RESOURCE_GROUP", scope_id=str(rg.id), name="RG Schedule",
            effective_from=datetime(2025, 1, 1), effective_to=datetime(2025, 1, 31),
        )
        WorkShift.objects.create(
            schedule=schedule, name="Shift", weekday=0,
            start_time="08:00", end_time="16:00",
            paid_minutes=480, break_minutes=0,
        )
        ScheduleAssignment.objects.create(
            plant=plant, entity_type="RESOURCE_GROUP", entity_id=str(rg.id),
            work_schedule=schedule, is_active=True,
        )
        CapacityProfile.objects.create(
            scope_type="RESOURCE_GROUP", scope_id=str(rg.id),
            capacity_mode=CapacityMode.MANUAL, manual_capacity=100.0,
        )

        snap = NewCapacityService.calculate_scope_capacity(
            "RESOURCE_GROUP", str(rg.id),
            datetime(2025, 1, 6), datetime(2025, 1, 7),
        )

        self.assertEqual(snap.machine_capacity_units, 100.0)
        self.assertEqual(snap.labor_capacity_units, 0.0)
        self.assertEqual(snap.effective_capacity_units, 0.0)
        self.assertEqual(snap.constraint_reason, "NO_LABOR")

    def test_machine_constraint_reason_when_machine_limits_capacity(self):
        snap = type("snap", (), {})()
        reason = NewCapacityService._constraint_reason(40.0, 100.0)
        effective = NewCapacityService._effective_capacity(40.0, 100.0)
        snap.constraint_reason = reason
        snap.effective_capacity_units = effective
        self.assertEqual(snap.constraint_reason, "MACHINE")
        self.assertEqual(snap.effective_capacity_units, 40.0)

    def test_balanced_constraint_reason(self):
        self.assertEqual(NewCapacityService._constraint_reason(50.0, 50.0), "BALANCED")
        self.assertEqual(NewCapacityService._effective_capacity(50.0, 50.0), 50.0)

    def test_labor_requirement_rejects_cross_plant_resource_group(self):
        from manufacturing.models import Company, Department, LaborRequirement, Plant, ResourceGroup

        company = Company.objects.create(code="TEST", name="Test")
        plant_a = Plant.objects.create(company=company, code="P1", name="P1")
        plant_b = Plant.objects.create(company=company, code="P2", name="P2")
        dept = Department.objects.create(plant=plant_a, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        with self.assertRaises(ValidationError):
            LaborRequirement.objects.create(
                plant=plant_b,
                resource_group=rg,
                operators_required=1,
                labor_minutes_per_unit=10,
                effective_from=datetime(2025, 1, 1),
            )

    def test_operator_assignment_rejects_cross_plant_resource_group(self):
        from django.contrib.auth import get_user_model
        from manufacturing.models import Company, Department, OperatorAssignment, Plant, ResourceGroup, ScheduleAssignment

        company = Company.objects.create(code="TEST", name="Test")
        plant_a = Plant.objects.create(company=company, code="P1", name="P1")
        plant_b = Plant.objects.create(company=company, code="P2", name="P2")
        dept = Department.objects.create(plant=plant_a, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        schedule = WorkSchedule.objects.create(scope_type="RESOURCE_GROUP", scope_id=str(rg.id), name="S", effective_from=datetime(2025, 1, 1))
        sched_assignment = ScheduleAssignment.objects.create(plant=plant_a, entity_type="RESOURCE_GROUP", entity_id=str(rg.id), work_schedule=schedule, is_active=True)
        user = get_user_model().objects.create_user(username="op-cross")
        with self.assertRaises(ValidationError):
            OperatorAssignment.objects.create(
                plant=plant_b,
                operator=user,
                resource_group=rg,
                schedule_assignment=sched_assignment,
                effective_from=datetime(2025, 1, 1),
            )

    def test_operator_assignment_rejects_overlap_for_same_shift(self):
        from django.contrib.auth import get_user_model
        from manufacturing.models import Company, Department, OperatorAssignment, Plant, ResourceGroup, ScheduleAssignment

        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        schedule = WorkSchedule.objects.create(scope_type="RESOURCE_GROUP", scope_id=str(rg.id), name="S", effective_from=datetime(2025, 1, 1))
        sched_assignment = ScheduleAssignment.objects.create(plant=plant, entity_type="RESOURCE_GROUP", entity_id=str(rg.id), work_schedule=schedule, is_active=True)
        user = get_user_model().objects.create_user(username="op-overlap")
        OperatorAssignment.objects.create(
            plant=plant, operator=user, resource_group=rg, schedule_assignment=sched_assignment,
            effective_from=datetime(2025, 1, 1), effective_to=datetime(2025, 1, 10),
        )
        with self.assertRaises(ValidationError):
            OperatorAssignment.objects.create(
                plant=plant, operator=user, resource_group=rg, schedule_assignment=sched_assignment,
                effective_from=datetime(2025, 1, 5), effective_to=datetime(2025, 1, 12),
            )

    def test_resource_group_inherits_plant_schedule(self):
        from manufacturing.models import Plant, Company, Department, ResourceGroup

        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")

        plant_sched = WorkSchedule.objects.create(
            scope_type="PLANT", scope_id=str(plant.id),
            name="Plant Sched",
            effective_from="2025-01-01 00:00:00",
            effective_to="2025-01-31 00:00:00",
        )
        WorkShift.objects.create(
            schedule=plant_sched, name="Shift", weekday=0,
            start_time="08:00", end_time="17:00",
            paid_minutes=540, break_minutes=60, net_minutes=480,
        )

        snap = NewCapacityService.calculate_scope_capacity(
            "RESOURCE_GROUP", str(rg.id),
            datetime(2025, 1, 6), datetime(2025, 1, 7),
        )
        self.assertIsNotNone(snap)
        self.assertGreater(snap.available_minutes, 0)


    def test_resolve_schedule_rg_own_schedule_found(self):
        from manufacturing.models import Plant, Company, Department, ResourceGroup
        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        sched = WorkSchedule.objects.create(
            scope_type="RESOURCE_GROUP", scope_id=str(rg.id),
            name="RG Sched", effective_from="2025-01-01 00:00:00",
        )
        resolved = ScheduleService.resolve_schedule("RESOURCE_GROUP", str(rg.id))
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.id, sched.id)

    def test_resolve_schedule_rg_inherits_department(self):
        from manufacturing.models import Plant, Company, Department, ResourceGroup
        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        sched = WorkSchedule.objects.create(
            scope_type="DEPARTMENT", scope_id=str(dept.id),
            name="Dept Sched", effective_from="2025-01-01 00:00:00",
        )
        resolved = ScheduleService.resolve_schedule("RESOURCE_GROUP", str(rg.id))
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.id, sched.id)
        self.assertEqual(resolved.scope_type, "DEPARTMENT")

    def test_resolve_schedule_rg_inherits_plant(self):
        from manufacturing.models import Plant, Company, Department, ResourceGroup
        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        sched = WorkSchedule.objects.create(
            scope_type="PLANT", scope_id=str(plant.id),
            name="Plant Sched", effective_from="2025-01-01 00:00:00",
        )
        resolved = ScheduleService.resolve_schedule("RESOURCE_GROUP", str(rg.id))
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.id, sched.id)

    def test_resolve_schedule_rg_no_schedule(self):
        from manufacturing.models import Plant, Company, Department, ResourceGroup
        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        resolved = ScheduleService.resolve_schedule("RESOURCE_GROUP", str(rg.id))
        self.assertIsNone(resolved)

    def test_resolve_schedule_rg_own_overrides_department(self):
        from manufacturing.models import Plant, Company, Department, ResourceGroup
        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        rg = ResourceGroup.objects.create(department=dept, code="RG1", name="RG1")
        WorkSchedule.objects.create(
            scope_type="DEPARTMENT", scope_id=str(dept.id),
            name="Dept Sched", effective_from="2025-01-01 00:00:00",
        )
        rg_sched = WorkSchedule.objects.create(
            scope_type="RESOURCE_GROUP", scope_id=str(rg.id),
            name="RG Sched", effective_from="2025-01-01 00:00:00",
        )
        resolved = ScheduleService.resolve_schedule("RESOURCE_GROUP", str(rg.id))
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.id, rg_sched.id)
        self.assertEqual(resolved.scope_type, "RESOURCE_GROUP")


class CascadeServiceTests(TestCase):

    def test_get_impacted_scopes_plant(self):
        impacted = CapacityCascadeService.get_impacted_scopes("PLANT", "1")
        self.assertTrue(any(st == "PLANT" and sid == "1" for st, sid in impacted))

    def test_get_impacted_scopes_resource_not_found(self):
        impacted = CapacityCascadeService.get_impacted_scopes("RESOURCE", "999999")
        self.assertEqual(len(impacted), 0)

    @patch("manufacturing.domain.capacity_cascade_service.CapacityCascadeService.get_impacted_scopes")
    @patch("manufacturing.domain.capacity_cascade_service.CapacityCascadeService.recalculate_scope")
    def test_recalculation_job_created(self, mock_recalc, mock_impacted):
        mock_impacted.return_value = [("PLANT", "1")]
        mock_recalc.return_value = None
        jobs = CapacityCascadeService.recalculate_from_scope(
            "PLANT", "1",
            datetime(2025, 1, 1), datetime(2025, 1, 2),
            trigger_type="SCHEDULE_CHANGED",
        )
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0].status, "COMPLETED")

    @patch("manufacturing.domain.capacity_cascade_service.CapacityCascadeService.get_impacted_scopes")
    @patch("manufacturing.domain.capacity_cascade_service.CapacityCascadeService.recalculate_scope")
    def test_cascade_recalculates_all_impacted(self, mock_recalc, mock_impacted):
        mock_impacted.return_value = [("PLANT", "1")]
        CapacityCascadeService.recalculate_from_scope(
            "PLANT", "1",
            datetime(2025, 1, 1), datetime(2025, 1, 2),
        )
        self.assertTrue(mock_recalc.called)


class ScheduleServiceTests(TestCase):

    def setUp(self):
        from manufacturing.models import Plant, Company
        self.company = Company.objects.create(
            code="TEST", name="Test Company",
        )
        self.plant = Plant.objects.create(
            company=self.company, code="P1", name="Plant 1",
        )

    def test_create_schedule_valid(self):
        schedule = ScheduleService.create_schedule(
            scope_type="PLANT",
            scope_id=str(self.plant.id),
            name="Test",
            effective_from=datetime(2025, 1, 1),
            timezone="America/Los_Angeles",
        )
        self.assertIsNotNone(schedule.id)
        self.assertEqual(schedule.name, "Test")

    def test_create_schedule_invalid_scope(self):
        with self.assertRaises(ScheduleValidationError):
            ScheduleService.create_schedule(
                scope_type="INVALID", scope_id="x",
                name="Test", effective_from=datetime(2025, 1, 1),
                timezone="America/Los_Angeles",
            )

    def test_update_schedule_not_found(self):
        with self.assertRaises(ScheduleValidationError):
            ScheduleService.update_schedule("999999", name="New")

    def test_archive_schedule(self):
        s = ScheduleService.create_schedule(
            scope_type="PLANT", scope_id=str(self.plant.id),
            name="Archivable", effective_from=datetime(2025, 1, 1),
            timezone="America/Los_Angeles",
        )
        archived = ScheduleService.archive_schedule(str(s.id))
        self.assertFalse(archived.is_active)

    def test_create_shift(self):
        s = ScheduleService.create_schedule(
            scope_type="PLANT", scope_id=str(self.plant.id),
            name="Shift Test", effective_from=datetime(2025, 1, 1),
            timezone="America/Los_Angeles",
        )
        shift = ScheduleService.create_shift(
            schedule_id=str(s.id),
            name="Morning", weekday=0,
            start_time="06:00", end_time="14:00",
            paid_minutes=480, break_minutes=30,
        )
        self.assertEqual(shift.net_minutes, 450)
