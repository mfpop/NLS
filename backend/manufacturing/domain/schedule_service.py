from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from manufacturing.models.capacity import (
    WorkSchedule, WorkShift, ScheduleScope,
)


class ScheduleValidationError(Exception):
    def __init__(self, message: str, field: str = "_form", code: str = "VALIDATION"):
        self.message = message
        self.field = field
        self.code = code
        super().__init__(message)


class ScheduleService:

    @staticmethod
    def _reject_empty(value, field: str, label: str):
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ScheduleValidationError(f"{label} is required.", field, "REQUIRED")

    @staticmethod
    @transaction.atomic
    def create_schedule(
        scope_type: str,
        scope_id: str,
        name: str,
        effective_from: datetime,
        effective_to: Optional[datetime] = None,
        timezone: str = "",
    ) -> WorkSchedule:
        ScheduleService._reject_empty(scope_type, "scopeType", "Scope type")
        ScheduleService._reject_empty(scope_id, "scopeId", "Scope id")
        ScheduleService._reject_empty(name, "name", "Name")
        ScheduleService._reject_empty(timezone, "timezone", "Timezone")
        if not effective_from:
            raise ScheduleValidationError("Effective from is required.", "effectiveFrom", "REQUIRED")
        ScheduleService._validate_scope(scope_type, scope_id)
        if effective_to and effective_to <= effective_from:
            raise ScheduleValidationError(
                "Effective to must be after effective from.",
                "effectiveTo", "INVALID_RANGE",
            )
        schedule = WorkSchedule.objects.create(
            scope_type=scope_type,
            scope_id=scope_id,
            name=name.strip(),
            timezone=timezone.strip() or "UTC",
            effective_from=effective_from,
            effective_to=effective_to,
        )
        return schedule

    @staticmethod
    @transaction.atomic
    def update_schedule(schedule_id: str, **kwargs) -> WorkSchedule:
        try:
            schedule = WorkSchedule.objects.select_for_update().get(id=schedule_id)
        except (WorkSchedule.DoesNotExist, ValueError, ValidationError):
            raise ScheduleValidationError("Schedule not found.", "id", "NOT_FOUND")

        for field in ("name", "timezone", "effective_from", "effective_to", "is_active"):
            if field in kwargs and kwargs[field] is not None:
                val = kwargs[field]
                if field in ("name", "timezone") and isinstance(val, str) and not val.strip():
                    raise ScheduleValidationError(
                        f"{field.title()} cannot be empty.", field, "REQUIRED",
                    )
                setattr(schedule, field, val if field not in ("name", "timezone") else val.strip())

        if schedule.effective_to and schedule.effective_to <= schedule.effective_from:
            raise ScheduleValidationError(
                "Effective to must be after effective from.",
                "effectiveTo", "INVALID_RANGE",
            )
        schedule.save()
        return schedule

    @staticmethod
    @transaction.atomic
    def archive_schedule(schedule_id: str) -> WorkSchedule:
        try:
            schedule = WorkSchedule.objects.get(id=schedule_id)
        except (WorkSchedule.DoesNotExist, ValueError, ValidationError):
            raise ScheduleValidationError("Schedule not found.", "id", "NOT_FOUND")
        schedule.is_active = False
        schedule.save()
        return schedule

    @staticmethod
    def resolve_schedule(scope_type: str, scope_id: str) -> Optional[WorkSchedule]:
        st = scope_type.value if hasattr(scope_type, 'value') else scope_type

        hierarchy = [
            ("RESOURCE", scope_id),
            ("RESOURCE_GROUP", None),
            ("DEPARTMENT", None),
            ("PRODUCTION_LINE", None),
            ("PLANT", None),
        ]

        from manufacturing.models import Resource, ResourceGroup, Department, ProductionLine

        if st == "RESOURCE":
            try:
                resource = Resource.objects.select_related(
                    "resource_group__department__plant"
                ).get(id=scope_id)
                hierarchy[1] = ("RESOURCE_GROUP", str(resource.resource_group_id))
                hierarchy[2] = ("DEPARTMENT", str(resource.resource_group.department_id))
                rg = resource.resource_group
                from manufacturing.models import ProductionLineDepartmentAssignment
                line_assignments = ProductionLineDepartmentAssignment.objects.filter(
                    department_id=rg.department_id
                ).select_related("production_line")
                if line_assignments.exists():
                    hierarchy[3] = ("PRODUCTION_LINE", str(line_assignments.first().production_line_id))
                hierarchy[4] = ("PLANT", str(rg.department.plant_id))
            except Resource.DoesNotExist:
                pass

        elif st == "RESOURCE_GROUP":
            try:
                rg = ResourceGroup.objects.select_related("department__plant").get(id=scope_id)
                hierarchy[0] = ("RESOURCE_GROUP", scope_id)
                hierarchy[1] = ("DEPARTMENT", str(rg.department_id))
                hierarchy[4] = ("PLANT", str(rg.department.plant_id))
            except ResourceGroup.DoesNotExist:
                raise ScheduleValidationError("Resource group not found.", "scopeId", "NOT_FOUND")

        elif st == "DEPARTMENT":
            try:
                dept = Department.objects.select_related("plant").get(id=scope_id)
                hierarchy[4] = ("PLANT", str(dept.plant_id))
            except Department.DoesNotExist:
                raise ScheduleValidationError("Department not found.", "scopeId", "NOT_FOUND")

        elif st == "PRODUCTION_LINE":
            try:
                line = ProductionLine.objects.select_related("plant").get(id=scope_id)
                hierarchy[4] = ("PLANT", str(line.plant_id))
            except ProductionLine.DoesNotExist:
                raise ScheduleValidationError("Production line not found.", "scopeId", "NOT_FOUND")

        elif st == "PLANT":
            from manufacturing.models import Plant
            try:
                Plant.objects.get(id=scope_id)
            except Plant.DoesNotExist:
                raise ScheduleValidationError("Plant not found.", "scopeId", "NOT_FOUND")

        for stype, sid in hierarchy:
            if sid is None:
                continue
            schedule = WorkSchedule.objects.filter(
                scope_type=stype,
                scope_id=sid,
                is_active=True,
            ).order_by("-effective_from").first()
            if schedule:
                return schedule

        return None

    @staticmethod
    def _validate_scope(scope_type: str, scope_id: str):
        st = scope_type.value if hasattr(scope_type, 'value') else scope_type
        valid_scopes = {"RESOURCE", "RESOURCE_GROUP", "DEPARTMENT", "PRODUCTION_LINE", "PLANT"}
        if st not in valid_scopes:
            raise ScheduleValidationError(f"Invalid scope type: {scope_type}", "scopeType", "INVALID_SCOPE")
        if not scope_id:
            raise ScheduleValidationError("Scope id is required.", "scopeId", "REQUIRED")

    @staticmethod
    @transaction.atomic
    def create_shift(
        schedule_id: str,
        name: str,
        weekday: int,
        start_time,
        end_time,
        paid_minutes: int = 0,
        break_minutes: int = 0,
    ) -> WorkShift:
        ScheduleService._reject_empty(name, "name", "Name")
        if not schedule_id:
            raise ScheduleValidationError("Schedule is required.", "scheduleId", "REQUIRED")
        if weekday is None:
            raise ScheduleValidationError("Weekday is required.", "weekday", "REQUIRED")
        if weekday < 0 or weekday > 6:
            raise ScheduleValidationError("Weekday must be 0-6.", "weekday", "INVALID_WEEKDAY")
        if not start_time:
            raise ScheduleValidationError("Start time is required.", "startTime", "REQUIRED")
        if not end_time:
            raise ScheduleValidationError("End time is required.", "endTime", "REQUIRED")
        if paid_minutes is None:
            raise ScheduleValidationError("Paid minutes is required.", "paidMinutes", "REQUIRED")
        if paid_minutes <= 0:
            raise ScheduleValidationError("Paid minutes must be greater than 0.", "paidMinutes", "INVALID_VALUE")
        if break_minutes is None:
            raise ScheduleValidationError("Break minutes is required.", "breakMinutes", "REQUIRED")
        if break_minutes < 0:
            raise ScheduleValidationError("Break minutes cannot be negative.", "breakMinutes", "INVALID_VALUE")
        net_minutes = paid_minutes - break_minutes
        if net_minutes <= 0:
            raise ScheduleValidationError("Net minutes must be greater than 0.", "netMinutes", "INVALID_VALUE")
        if net_minutes > paid_minutes:
            raise ScheduleValidationError("Net minutes cannot exceed paid minutes.", "netMinutes", "INVALID_VALUE")
        if net_minutes != paid_minutes - break_minutes:
            raise ScheduleValidationError("Net minutes must equal paid minus break.", "netMinutes", "MISMATCH")

        try:
            schedule = WorkSchedule.objects.get(id=schedule_id)
        except (WorkSchedule.DoesNotExist, ValueError, ValidationError):
            raise ScheduleValidationError("Schedule not found.", "scheduleId", "NOT_FOUND")

        crosses = end_time <= start_time if hasattr(end_time, 'hour') else False

        shift = WorkShift.objects.create(
            schedule=schedule,
            name=name.strip(),
            weekday=weekday,
            start_time=start_time,
            end_time=end_time,
            crosses_midnight=crosses,
            paid_minutes=paid_minutes,
            break_minutes=break_minutes,
            net_minutes=net_minutes,
        )
        return shift
