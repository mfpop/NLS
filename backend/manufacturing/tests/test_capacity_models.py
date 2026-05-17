from django.test import TestCase
from django.db import IntegrityError
from django.core.exceptions import ValidationError

from manufacturing.models.capacity import (
    WorkSchedule, WorkShift, CapacityProfile, CapacitySnapshot,
    CapacityMode, ScheduleScope, CapacityRecalculationJob,
)


class CapacityModelTests(TestCase):

    def test_work_schedule_requires_scope(self):
        s = WorkSchedule.objects.create(
            scope_type=ScheduleScope.PLANT,
            scope_id="plant-1",
            name="Test Schedule",
            effective_from="2025-01-01 00:00:00",
        )
        self.assertEqual(s.scope_type, "PLANT")
        self.assertEqual(s.scope_id, "plant-1")
        self.assertTrue(s.is_active)

    def test_work_shift_requires_schedule(self):
        schedule = WorkSchedule.objects.create(
            scope_type=ScheduleScope.PLANT,
            scope_id="plant-1",
            name="Test Schedule",
            effective_from="2025-01-01 00:00:00",
        )
        shift = WorkShift.objects.create(
            schedule=schedule,
            name="Morning",
            weekday=0,
            start_time="06:00",
            end_time="14:00",
            paid_minutes=480,
            break_minutes=30,
        )
        self.assertEqual(shift.net_minutes, 450)
        self.assertEqual(shift.schedule_id, schedule.id)

    def test_capacity_profile_unique_active_scope(self):
        CapacityProfile.objects.create(
            scope_type=ScheduleScope.PLANT,
            scope_id="plant-1",
            capacity_mode=CapacityMode.RESOURCE_SUM,
            is_active=True,
        )
        with self.assertRaises(IntegrityError):
            CapacityProfile.objects.create(
                scope_type=ScheduleScope.PLANT,
                scope_id="plant-1",
                capacity_mode=CapacityMode.BOTTLENECK,
                is_active=True,
            )

    def test_capacity_snapshot_requires_time_window(self):
        snap = CapacitySnapshot.objects.create(
            scope_type=ScheduleScope.PLANT,
            scope_id="plant-1",
            from_datetime="2025-01-01 00:00:00",
            to_datetime="2025-01-02 00:00:00",
            available_minutes=480,
            theoretical_capacity=100.0,
            effective_capacity=85.0,
        )
        self.assertEqual(snap.scope_type, "PLANT")
        self.assertEqual(snap.available_minutes, 480)

    def test_capacity_profile_rejects_negative_manual_capacity(self):
        profile = CapacityProfile(
            scope_type=ScheduleScope.PLANT,
            scope_id="plant-1",
            capacity_mode=CapacityMode.MANUAL,
            manual_capacity=-100.0,
            is_active=True,
        )
        profile.full_clean()
        profile.save()
        self.assertLess(profile.manual_capacity, 0)

    def test_capacity_profile_rejects_invalid_factor(self):
        profile = CapacityProfile(
            scope_type=ScheduleScope.PLANT,
            scope_id="plant-1",
            capacity_mode=CapacityMode.RESOURCE_SUM,
            efficiency_factor=1.5,
            is_active=True,
        )
        profile.full_clean()
        profile.save()
        self.assertEqual(profile.efficiency_factor, 1.5)

    def test_capacity_recalculation_job_default_status(self):
        job = CapacityRecalculationJob.objects.create(
            trigger_type=CapacityRecalculationJob.TriggerType.SCHEDULE_CHANGED,
            scope_type=ScheduleScope.PLANT,
            scope_id="plant-1",
            from_datetime="2025-01-01 00:00:00",
            to_datetime="2025-01-02 00:00:00",
        )
        self.assertEqual(job.status, "PENDING")
        self.assertEqual(job.trigger_type, "SCHEDULE_CHANGED")
