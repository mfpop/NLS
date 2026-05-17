from datetime import time
from django.db import IntegrityError
from django.test import TestCase

from manufacturing.models.capacity import WorkSchedule, WorkShift, ScheduleScope


class WorkScheduleModelTests(TestCase):

    def test_create_schedule_pattern_requires_name(self):
        with self.assertRaises(IntegrityError):
            WorkSchedule.objects.create(
                scope_type=ScheduleScope.PLANT,
                scope_id="1",
                name=None,
                effective_from="2025-01-01 00:00:00",
            )

    def test_create_schedule_pattern_requires_scope_type(self):
        with self.assertRaises(IntegrityError):
            WorkSchedule.objects.create(
                scope_type=None,
                scope_id="1",
                name="Test",
                effective_from="2025-01-01 00:00:00",
            )

    def test_create_schedule_pattern_requires_scope_id(self):
        with self.assertRaises(IntegrityError):
            WorkSchedule.objects.create(
                scope_type=ScheduleScope.PLANT,
                scope_id=None,
                name="Test",
                effective_from="2025-01-01 00:00:00",
            )

    def test_create_schedule_pattern_requires_effective_from(self):
        with self.assertRaises(IntegrityError):
            WorkSchedule.objects.create(
                scope_type=ScheduleScope.PLANT,
                scope_id="1",
                name="Test",
                effective_from=None,
            )


class WorkShiftModelTests(TestCase):

    def setUp(self):
        self.schedule = WorkSchedule.objects.create(
            scope_type=ScheduleScope.PLANT, scope_id="1",
            name="Test Schedule", effective_from="2025-01-01 00:00:00",
        )

    def test_create_shift_requires_name(self):
        with self.assertRaises(IntegrityError):
            WorkShift.objects.create(
                schedule=self.schedule, name=None,
                weekday=0, start_time="06:00", end_time="14:00",
                paid_minutes=480, net_minutes=450,
            )

    def test_create_shift_requires_weekday(self):
        with self.assertRaises(IntegrityError):
            WorkShift.objects.create(
                schedule=self.schedule, name="Shift",
                weekday=None, start_time="06:00", end_time="14:00",
                paid_minutes=480, net_minutes=450,
            )

    def test_create_shift_requires_start_time(self):
        with self.assertRaises(IntegrityError):
            WorkShift.objects.create(
                schedule=self.schedule, name="Shift",
                weekday=0, start_time=None, end_time="14:00",
                paid_minutes=480, net_minutes=450,
            )

    def test_create_shift_requires_end_time(self):
        with self.assertRaises(IntegrityError):
            WorkShift.objects.create(
                schedule=self.schedule, name="Shift",
                weekday=0, start_time="06:00", end_time=None,
                paid_minutes=480, net_minutes=450,
            )

    def test_create_shift_requires_paid_minutes(self):
        with self.assertRaises(IntegrityError):
            WorkShift.objects.create(
                schedule=self.schedule, name="Shift",
                weekday=0, start_time="06:00", end_time="14:00",
                paid_minutes=None, net_minutes=450,
            )

    def test_create_shift_requires_net_minutes(self):
        from django.db import connection
        from django.db import transaction
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                with connection.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO manufacturing_work_shift "
                        "(schedule_id, name, weekday, start_time, end_time, crosses_midnight, paid_minutes, break_minutes, net_minutes) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NULL)",
                        [self.schedule.id, "Shift", 0, "06:00", "14:00", False, 480, 0],
                    )

    def test_shift_rejects_invalid_weekday(self):
        from django.db import transaction
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                WorkShift.objects.create(
                    schedule=self.schedule, name="Shift",
                    weekday=7, start_time="06:00", end_time="14:00",
                    paid_minutes=480, break_minutes=0, net_minutes=480,
                )
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                WorkShift.objects.create(
                    schedule=self.schedule, name="Shift",
                    weekday=-1, start_time="06:00", end_time="14:00",
                    paid_minutes=480, break_minutes=0, net_minutes=480,
                )

    def test_shift_rejects_negative_break_minutes(self):
        from django.db import transaction
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                WorkShift.objects.create(
                    schedule=self.schedule, name="Shift",
                    weekday=0, start_time="06:00", end_time="14:00",
                    paid_minutes=480, break_minutes=-10, net_minutes=470,
                )

    def test_shift_rejects_zero_paid_minutes(self):
        from django.db import transaction
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                WorkShift.objects.create(
                    schedule=self.schedule, name="Shift",
                    weekday=0, start_time="06:00", end_time="14:00",
                    paid_minutes=0, break_minutes=0, net_minutes=0,
                )

    def test_shift_rejects_net_minutes_greater_than_paid_minutes(self):
        from django.db import connection
        from django.db import transaction
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                with connection.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO manufacturing_work_shift "
                        "(schedule_id, name, weekday, start_time, end_time, crosses_midnight, is_active, paid_minutes, break_minutes, net_minutes) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 500)",
                        [self.schedule.id, "Shift", 0, "06:00", "14:00", False, True, 480, 0],
                    )

    def test_shift_net_minutes_computed_on_save(self):
        shift = WorkShift(
            schedule=self.schedule, name="Shift",
            weekday=0, start_time="06:00", end_time="14:00",
            paid_minutes=480, break_minutes=30, net_minutes=0,
        )
        shift.save()
        self.assertEqual(shift.net_minutes, 450)
