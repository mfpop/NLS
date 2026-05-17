from datetime import datetime, time
from django.test import TestCase

from manufacturing.domain.schedule_service import ScheduleService, ScheduleValidationError
from manufacturing.models.capacity import WorkSchedule, WorkShift


class ScheduleServiceTests(TestCase):

    def _make_schedule(self):
        from manufacturing.models import Plant, Company, Department
        company = Company.objects.create(code="TEST", name="Test")
        plant = Plant.objects.create(company=company, code="P1", name="P1")
        dept = Department.objects.create(plant=plant, code="D1", name="D1")
        return ScheduleService.create_schedule(
            scope_type="DEPARTMENT", scope_id=str(dept.id),
            name="Test", effective_from=datetime(2025, 1, 1),
            timezone="UTC",
        )

    def test_create_schedule_pattern_requires_name(self):
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_schedule(
                scope_type="PLANT", scope_id="1",
                name="", effective_from=datetime(2025, 1, 1),
            )
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_create_schedule_pattern_requires_scope_type(self):
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_schedule(
                scope_type="", scope_id="1",
                name="Test", effective_from=datetime(2025, 1, 1),
            )
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_create_schedule_pattern_requires_scope_id(self):
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_schedule(
                scope_type="PLANT", scope_id="",
                name="Test", effective_from=datetime(2025, 1, 1),
            )
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_create_schedule_pattern_requires_timezone(self):
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_schedule(
                scope_type="PLANT", scope_id="1",
                name="Test", effective_from=datetime(2025, 1, 1),
                timezone="",
            )
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_create_schedule_pattern_requires_effective_from(self):
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_schedule(
                scope_type="PLANT", scope_id="1",
                name="Test", effective_from=None,
            )
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_create_schedule_pattern_rejects_invalid_effective_range(self):
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_schedule(
                scope_type="PLANT", scope_id="1",
                name="Test", effective_from=datetime(2025, 1, 10),
                effective_to=datetime(2025, 1, 5),
                timezone="UTC",
            )
        self.assertIn("INVALID_RANGE", str(ctx.exception.code))

    def test_update_schedule_cannot_null_required_fields(self):
        s = ScheduleService.create_schedule(
            scope_type="PLANT", scope_id="1",
            name="Test", effective_from=datetime(2025, 1, 1),
            timezone="UTC",
        )
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.update_schedule(str(s.id), name="")
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_create_shift_requires_name(self):
        s = self._make_schedule()
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_shift(
                schedule_id=str(s.id), name="",
                weekday=0, start_time=time(6, 0), end_time=time(14, 0),
                paid_minutes=480, break_minutes=0,
            )
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_create_shift_requires_weekday(self):
        s = self._make_schedule()
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_shift(
                schedule_id=str(s.id), name="Shift",
                weekday=None, start_time=time(6, 0), end_time=time(14, 0),
                paid_minutes=480, break_minutes=0,
            )
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_create_shift_requires_start_time(self):
        s = self._make_schedule()
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_shift(
                schedule_id=str(s.id), name="Shift",
                weekday=0, start_time=None, end_time=time(14, 0),
                paid_minutes=480, break_minutes=0,
            )
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_create_shift_requires_end_time(self):
        s = self._make_schedule()
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_shift(
                schedule_id=str(s.id), name="Shift",
                weekday=0, start_time=time(6, 0), end_time=None,
                paid_minutes=480, break_minutes=0,
            )
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_create_shift_requires_paid_minutes(self):
        s = self._make_schedule()
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_shift(
                schedule_id=str(s.id), name="Shift",
                weekday=0, start_time=time(6, 0), end_time=time(14, 0),
                paid_minutes=None, break_minutes=0,
            )
        self.assertIn("REQUIRED", str(ctx.exception.code))

    def test_shift_rejects_invalid_weekday(self):
        s = self._make_schedule()
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_shift(
                schedule_id=str(s.id), name="Shift",
                weekday=7, start_time=time(6, 0), end_time=time(14, 0),
                paid_minutes=480, break_minutes=0,
            )
        self.assertIn("INVALID_WEEKDAY", str(ctx.exception.code))

    def test_shift_rejects_negative_break_minutes(self):
        s = self._make_schedule()
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_shift(
                schedule_id=str(s.id), name="Shift",
                weekday=0, start_time=time(6, 0), end_time=time(14, 0),
                paid_minutes=480, break_minutes=-10,
            )
        self.assertIn("INVALID_VALUE", str(ctx.exception.code))

    def test_shift_rejects_zero_paid_minutes(self):
        s = self._make_schedule()
        with self.assertRaises(ScheduleValidationError) as ctx:
            ScheduleService.create_shift(
                schedule_id=str(s.id), name="Shift",
                weekday=0, start_time=time(6, 0), end_time=time(14, 0),
                paid_minutes=0, break_minutes=0,
            )
        self.assertIn("INVALID_VALUE", str(ctx.exception.code))

    def test_shift_net_minutes_matches_paid_minus_break(self):
        s = self._make_schedule()
        shift = ScheduleService.create_shift(
            schedule_id=str(s.id), name="Shift",
            weekday=0, start_time=time(6, 0), end_time=time(14, 0),
            paid_minutes=480, break_minutes=60,
        )
        self.assertEqual(shift.net_minutes, 420)
        self.assertEqual(shift.net_minutes, shift.paid_minutes - shift.break_minutes)

    def test_shift_net_minutes_computed_correctly(self):
        s = self._make_schedule()
        shift = ScheduleService.create_shift(
            schedule_id=str(s.id), name="Shift",
            weekday=0, start_time=time(6, 0), end_time=time(14, 0),
            paid_minutes=480, break_minutes=60,
        )
        self.assertEqual(shift.net_minutes, 420)
        self.assertEqual(shift.paid_minutes, 480)
        self.assertEqual(shift.break_minutes, 60)

    def test_update_shift_cannot_null_required_fields(self):
        s = self._make_schedule()
        shift = ScheduleService.create_shift(
            schedule_id=str(s.id), name="Shift",
            weekday=0, start_time=time(6, 0), end_time=time(14, 0),
            paid_minutes=480, break_minutes=0,
        )
        self.assertIsNotNone(shift)
        self.assertEqual(shift.name, "Shift")
