from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from manufacturing.models import CapacityRecalculationJob


class CapacityInvalidationService:
    DEFAULT_WINDOW_DAYS = 90

    @staticmethod
    def default_window(from_dt=None, to_dt=None):
        start = from_dt or timezone.now().replace(minute=0, second=0, microsecond=0)
        end = to_dt or start + timedelta(days=CapacityInvalidationService.DEFAULT_WINDOW_DAYS)
        return start, end

    @staticmethod
    @transaction.atomic
    def enqueue(trigger_type: str, scope_type: str, scope_id: str, from_dt=None, to_dt=None) -> CapacityRecalculationJob:
        start, end = CapacityInvalidationService.default_window(from_dt, to_dt)
        job, _ = CapacityRecalculationJob._default_manager.get_or_create(
            trigger_type=trigger_type,
            scope_type=scope_type,
            scope_id=str(scope_id),
            from_datetime=start,
            to_datetime=end,
            status=CapacityRecalculationJob.JobStatus.PENDING,
        )
        return job

    @staticmethod
    def enqueue_many(trigger_type: str, scopes: list[tuple[str, str]], from_dt=None, to_dt=None) -> list[CapacityRecalculationJob]:
        return [
            CapacityInvalidationService.enqueue(trigger_type, scope_type, scope_id, from_dt, to_dt)
            for scope_type, scope_id in dict.fromkeys((st, str(sid)) for st, sid in scopes if sid)
        ]

    @staticmethod
    def schedule_assignment_changed(assignment) -> list[CapacityRecalculationJob]:
        return CapacityInvalidationService.enqueue_many(
            "SCHEDULE_CHANGED",
            [(assignment.entity_type, assignment.entity_id)],
        )

    @staticmethod
    def work_schedule_changed(schedule) -> list[CapacityRecalculationJob]:
        assignments = schedule.assignments.filter(is_active=True).only("entity_type", "entity_id")
        return CapacityInvalidationService.enqueue_many(
            "SCHEDULE_CHANGED",
            [(assignment.entity_type, assignment.entity_id) for assignment in assignments],
        )

    @staticmethod
    def work_shift_changed(shift) -> list[CapacityRecalculationJob]:
        return CapacityInvalidationService.work_schedule_changed(shift.schedule)

    @staticmethod
    def capacity_profile_changed(profile) -> list[CapacityRecalculationJob]:
        return CapacityInvalidationService.enqueue_many(
            "PROFILE_CHANGED",
            [(profile.scope_type, profile.scope_id)],
        )

    @staticmethod
    def resource_changed(resource) -> list[CapacityRecalculationJob]:
        return CapacityInvalidationService.enqueue_many(
            "STRUCTURE_CHANGED",
            [("RESOURCE", resource.id), ("RESOURCE_GROUP", resource.resource_group_id)],
        )

    @staticmethod
    def resource_group_changed(group) -> list[CapacityRecalculationJob]:
        return CapacityInvalidationService.enqueue_many(
            "STRUCTURE_CHANGED",
            [("RESOURCE_GROUP", group.id), ("DEPARTMENT", group.department_id)],
        )

    @staticmethod
    def department_changed(department) -> list[CapacityRecalculationJob]:
        return CapacityInvalidationService.enqueue_many(
            "STRUCTURE_CHANGED",
            [("DEPARTMENT", department.id), ("PLANT", department.plant_id)],
        )

    @staticmethod
    def production_line_changed(line) -> list[CapacityRecalculationJob]:
        return CapacityInvalidationService.enqueue_many(
            "STRUCTURE_CHANGED",
            [("PRODUCTION_LINE", line.id), ("PLANT", line.plant_id)],
        )

    @staticmethod
    def line_department_assignment_changed(assignment) -> list[CapacityRecalculationJob]:
        return CapacityInvalidationService.enqueue_many(
            "STRUCTURE_CHANGED",
            [("DEPARTMENT", assignment.department_id), ("PRODUCTION_LINE", assignment.production_line_id)],
        )
