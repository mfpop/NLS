from datetime import datetime
from pathlib import Path

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from manufacturing.domain.capacity_invalidation import CapacityInvalidationService
from manufacturing.domain.capacity_service import NewCapacityService, NewCapacityValidationError
from manufacturing.domain.schedule_assignment_service import ScheduleAssignmentError, ScheduleAssignmentService
from manufacturing.models import (
    CapacityProfile,
    CapacityRecalculationJob,
    CapacitySnapshot,
    CapacitySnapshotStatus,
    CapacitySnapshotType,
    Company,
    Department,
    Plant,
    ProductionLine,
    ProductionLineDepartmentAssignment,
    Resource,
    ResourceGroup,
    ScheduleAssignment,
    WorkSchedule,
    WorkShift,
)


class CapacityArchitectureTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(code="C1", name="Company 1")
        self.plant = Plant.objects.create(company=self.company, code="P1", name="Plant 1")
        self.other_plant = Plant.objects.create(company=self.company, code="P2", name="Plant 2")
        self.line = ProductionLine.objects.create(plant=self.plant, code="L1", name="Line 1")
        self.department = Department.objects.create(plant=self.plant, code="D1", name="Department 1")
        ProductionLineDepartmentAssignment.objects.create(production_line=self.line, department=self.department, sequence=1)
        self.resource_group = ResourceGroup.objects.create(department=self.department, code="RG1", name="RG 1")
        self.resource = Resource.objects.create(resource_group=self.resource_group, code="R1", name="Resource 1")
        self.plant_schedule = self._schedule("Plant", "PLANT", str(self.plant.id), 480, 30)
        self.resource_schedule = self._schedule("Resource", "RESOURCE", str(self.resource.id), 600, 60)

    def _schedule(self, name, scope_type, scope_id, paid, breaks):
        schedule = WorkSchedule.objects.create(
            scope_type=scope_type,
            scope_id=scope_id,
            name=name,
            effective_from=timezone.make_aware(datetime(2025, 1, 1)),
        )
        WorkShift.objects.create(
            schedule=schedule,
            name="Day",
            weekday=0,
            start_time="06:00",
            end_time="14:00",
            paid_minutes=paid,
            break_minutes=breaks,
        )
        return schedule

    def test_schedule_assignment_same_plant_validation(self):
        with self.assertRaises(ScheduleAssignmentError):
            ScheduleAssignmentService.assign(
                plant_id=str(self.other_plant.id),
                scope_type="RESOURCE_GROUP",
                scope_id=str(self.resource_group.id),
                work_schedule_id=str(self.plant_schedule.id),
            )

    def test_resource_group_shift_save_creates_resolvable_schedule_assignment(self):
        from manufacturing.domain.structure_service import StructureService
        from manufacturing.models import ReferenceCategory, ReferenceValue

        category = ReferenceCategory.objects.create(code="shift_model", name="Shift Model")
        shift = ReferenceValue.objects.create(
            category=category,
            code="1_shift_day",
            name="1-shift (Day)",
            description="Day shift",
            usage_context="Tests",
        )
        input_data = type("Input", (), {
            "department_id": str(self.department.id),
            "code": "RG2",
            "name": "RG 2",
            "description": "",
            "status": "ACTIVE",
            "status_id": None,
            "members": 1,
            "leader": "",
            "supervisor": "",
            "group_type_id": None,
            "capability_type": "SHARED",
            "shift_pattern_id": str(shift.id),
            "capacity_model": "",
            "oee_target": None,
            "is_bottleneck": False,
            "is_constraint": False,
        })()

        group = StructureService.create_resource_group(input_data)
        assignment = ScheduleAssignmentService.resolve_assignment("RESOURCE_GROUP", str(group.id))

        self.assertIsNotNone(assignment)
        self.assertEqual(assignment.entity_type, "RESOURCE_GROUP")
        self.assertEqual(assignment.work_schedule.scope_type, "RESOURCE_GROUP")
        self.assertTrue(assignment.work_schedule.shifts.filter(name=shift.name, is_active=True).exists())

    def test_deterministic_schedule_inheritance_and_override(self):
        plant_assignment = ScheduleAssignmentService.assign(
            plant_id=str(self.plant.id),
            scope_type="PLANT",
            scope_id=str(self.plant.id),
            work_schedule_id=str(self.plant_schedule.id),
            priority=0,
        )
        self.assertEqual(
            ScheduleAssignmentService.resolve_assignment("RESOURCE", str(self.resource.id)).id,
            plant_assignment.id,
        )

        resource_assignment = ScheduleAssignmentService.assign(
            plant_id=str(self.plant.id),
            scope_type="RESOURCE",
            scope_id=str(self.resource.id),
            work_schedule_id=str(self.resource_schedule.id),
            priority=10,
        )
        self.assertEqual(
            ScheduleAssignmentService.resolve_assignment("RESOURCE", str(self.resource.id)).id,
            resource_assignment.id,
        )

    def test_resource_to_plant_rollup_with_real_objects(self):
        ScheduleAssignmentService.assign(
            plant_id=str(self.plant.id),
            scope_type="PLANT",
            scope_id=str(self.plant.id),
            work_schedule_id=str(self.plant_schedule.id),
        )
        for scope_type, scope_id in [
            ("RESOURCE", str(self.resource.id)),
            ("RESOURCE_GROUP", str(self.resource_group.id)),
            ("DEPARTMENT", str(self.department.id)),
            ("PRODUCTION_LINE", str(self.line.id)),
            ("PLANT", str(self.plant.id)),
        ]:
            CapacityProfile.objects.create(scope_type=scope_type, scope_id=scope_id, capacity_mode="RESOURCE_SUM")

        snap = NewCapacityService.calculate_scope_capacity(
            "PLANT",
            str(self.plant.id),
            timezone.make_aware(datetime(2025, 1, 6)),
            timezone.make_aware(datetime(2025, 1, 7)),
        )
        self.assertEqual(snap.scope_type, "PLANT")
        self.assertGreaterEqual(snap.effective_capacity, 0)

    def test_parent_rollup_does_not_create_child_snapshots(self):
        ScheduleAssignmentService.assign(
            plant_id=str(self.plant.id),
            scope_type="PLANT",
            scope_id=str(self.plant.id),
            work_schedule_id=str(self.plant_schedule.id),
        )
        for scope_type, scope_id in [
            ("RESOURCE", str(self.resource.id)),
            ("RESOURCE_GROUP", str(self.resource_group.id)),
            ("DEPARTMENT", str(self.department.id)),
            ("PRODUCTION_LINE", str(self.line.id)),
            ("PLANT", str(self.plant.id)),
        ]:
            CapacityProfile.objects.create(scope_type=scope_type, scope_id=scope_id, capacity_mode="RESOURCE_SUM")

        NewCapacityService.calculate_scope_capacity(
            "PLANT",
            str(self.plant.id),
            timezone.make_aware(datetime(2025, 1, 6)),
            timezone.make_aware(datetime(2025, 1, 7)),
        )
        scopes = set(CapacitySnapshot.objects.values_list("scope_type", flat=True))
        self.assertEqual(scopes, {"PLANT"})

    def test_relationship_change_invalidates_capacity(self):
        self.resource.name = "Resource 1 Updated"
        self.resource.save()
        self.assertTrue(
            CapacityRecalculationJob.objects.filter(
                trigger_type="STRUCTURE_CHANGED",
                scope_type="RESOURCE",
                scope_id=str(self.resource.id),
            ).exists()
        )

    def test_invalidation_deduplicates_repeated_changes(self):
        start = timezone.make_aware(datetime(2025, 1, 1))
        end = timezone.make_aware(datetime(2025, 2, 1))
        CapacityInvalidationService.enqueue("STRUCTURE_CHANGED", "RESOURCE", str(self.resource.id), start, end)
        CapacityInvalidationService.enqueue("STRUCTURE_CHANGED", "RESOURCE", str(self.resource.id), start, end)
        count = CapacityRecalculationJob.objects.filter(
            trigger_type="STRUCTURE_CHANGED",
            scope_type="RESOURCE",
            scope_id=str(self.resource.id),
            from_datetime=start,
            to_datetime=end,
        ).count()
        self.assertEqual(count, 1)

    def test_rollup_uses_bounded_query_count(self):
        ScheduleAssignmentService.assign(
            plant_id=str(self.plant.id),
            scope_type="PLANT",
            scope_id=str(self.plant.id),
            work_schedule_id=str(self.plant_schedule.id),
        )
        CapacityProfile.objects.create(scope_type="PLANT", scope_id=str(self.plant.id), capacity_mode="RESOURCE_SUM")
        with CaptureQueriesContext(connection) as ctx:
            NewCapacityService.calculate_scope_capacity(
                "PLANT",
                str(self.plant.id),
                timezone.make_aware(datetime(2025, 1, 6)),
                timezone.make_aware(datetime(2025, 1, 7)),
            )
        self.assertLessEqual(len(ctx), 65)

    def test_historical_snapshots_are_append_only_and_frozen_is_immutable(self):
        snap = CapacitySnapshot.objects.create(
            scope_type="PLANT",
            scope_id=str(self.plant.id),
            from_datetime=timezone.make_aware(datetime(2025, 1, 1)),
            to_datetime=timezone.make_aware(datetime(2025, 1, 2)),
            snapshot_type=CapacitySnapshotType.EXECUTION,
            status=CapacitySnapshotStatus.FROZEN,
            available_minutes=450,
            theoretical_capacity=450,
            effective_capacity=450,
        )
        snap.effective_capacity = 400
        with self.assertRaises(ValueError):
            snap.save()

    def test_future_planning_snapshot_recalculation_versions_when_allowed(self):
        ScheduleAssignmentService.assign(
            plant_id=str(self.plant.id),
            scope_type="PLANT",
            scope_id=str(self.plant.id),
            work_schedule_id=str(self.plant_schedule.id),
        )
        start = timezone.make_aware(datetime(2025, 1, 6))
        end = timezone.make_aware(datetime(2025, 1, 7))
        first = NewCapacityService.calculate_scope_capacity("PLANT", str(self.plant.id), start, end)
        second = NewCapacityService.calculate_scope_capacity("PLANT", str(self.plant.id), start, end)
        self.assertEqual(first.version, 1)
        self.assertEqual(second.version, 2)
        first.refresh_from_db()
        self.assertEqual(first.status, CapacitySnapshotStatus.DRAFT)

    def test_execution_snapshot_recalculation_rejected(self):
        ScheduleAssignmentService.assign(
            plant_id=str(self.plant.id),
            scope_type="PLANT",
            scope_id=str(self.plant.id),
            work_schedule_id=str(self.plant_schedule.id),
        )
        start = timezone.make_aware(datetime(2025, 1, 6))
        end = timezone.make_aware(datetime(2025, 1, 7))
        NewCapacityService.calculate_scope_capacity(
            "PLANT",
            str(self.plant.id),
            start,
            end,
            snapshot_type=CapacitySnapshotType.EXECUTION,
            status=CapacitySnapshotStatus.FROZEN,
        )
        with self.assertRaises(NewCapacityValidationError):
            NewCapacityService.calculate_scope_capacity(
                "PLANT",
                str(self.plant.id),
                start,
                end,
                snapshot_type=CapacitySnapshotType.EXECUTION,
                status=CapacitySnapshotStatus.FROZEN,
            )

    def test_frontend_does_not_derive_capacity_inputs(self):
        source = Path(__file__).resolve().parents[3] / "frontend" / "src" / "pages" / "plan" / "CapacityPage.tsx"
        text = source.read_text(encoding="utf-8")
        self.assertNotIn("deriveShiftTime", text)
        self.assertNotIn("shiftValues", text)
        self.assertNotIn('setInput("availableTimeMinutes"', text)
        self.assertNotIn('setInput("breakTimeMinutes"', text)
        self.assertNotIn('setInput("plannedDowntimeMinutes"', text)
        self.assertNotIn('setInput("operatorsAvailable"', text)
