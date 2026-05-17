from unittest.mock import patch
from datetime import datetime

from django.test import TestCase

from api.mutations.manufacturing import ManufacturingMutation
from api.types.manufacturing import WorkScheduleInput, WorkScheduleUpdateInput, WorkShiftInput


class Info:
    class Context:
        user = None
    context = Context()


class ScheduleGraphQLDelegationTests(TestCase):

    def test_graphql_schedule_pattern_mutation_calls_service(self):
        with patch("manufacturing.domain.schedule_service.ScheduleService.create_schedule") as mock_sched:
            with patch("manufacturing.domain.capacity_cascade_service.CapacityCascadeService.recalculate_from_scope") as mock_cascade:
                mock_sched.return_value = type("obj", (), {
                    "id": "1", "scope_type": "PLANT", "scope_id": "p1",
                    "name": "Test", "timezone": "UTC",
                    "effective_from": datetime(2025, 1, 1),
                    "effective_to": None, "is_active": True,
                    "created_at": datetime(2025, 1, 1),
                    "updated_at": datetime(2025, 1, 1),
                })()
                mock_cascade.return_value = []
                mutation = ManufacturingMutation()
                input_obj = WorkScheduleInput(
                    scope_type="PLANT", scope_id="p1", name="Test",
                    effective_from="2025-01-01T00:00:00",
                    timezone="UTC",
                )
                result = mutation.create_work_schedule(Info(), input=input_obj)
                mock_sched.assert_called_once()

    def test_graphql_shift_mutation_calls_service(self):
        from datetime import time as dt_time
        with patch("manufacturing.domain.schedule_service.ScheduleService.create_shift") as mock:
            mock.return_value = type("obj", (), {
                "id": "1", "schedule_id": "1",
                "name": "Morning", "weekday": 0,
                "start_time": dt_time(6, 0), "end_time": dt_time(14, 0),
                "crosses_midnight": False,
                "paid_minutes": 480, "break_minutes": 30,
                "net_minutes": 450, "is_active": True,
            })()
            mutation = ManufacturingMutation()
            input_obj = WorkShiftInput(
                schedule_id="1", name="Morning",
                weekday=0, start_time="06:00", end_time="14:00",
                paid_minutes=480, break_minutes=30,
            )
            result = mutation.create_work_shift(Info(), input=input_obj)
            mock.assert_called_once()

    def test_graphql_contains_no_validation_business_logic(self):
        import inspect
        from api.mutations.manufacturing import ManufacturingMutation

        source = inspect.getsource(ManufacturingMutation)
        self.assertNotIn("paid_minutes > 0", source)
        self.assertNotIn("break_minutes >= 0", source)
        self.assertNotIn("net_minutes == paid_minutes", source)
