from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from django.db import transaction

from manufacturing.models import (
    Department,
    Plant,
    ProductionLine,
    Resource,
    ResourceGroup,
    ScheduleAssignment,
)
from manufacturing.models.capacity import ScheduleScope, WorkSchedule


@dataclass
class ScheduleAssignmentError(Exception):
    field: str
    code: str
    message: str


class ScheduleAssignmentService:
    ORDER = [
        ScheduleScope.RESOURCE,
        ScheduleScope.RESOURCE_GROUP,
        ScheduleScope.DEPARTMENT,
        ScheduleScope.PRODUCTION_LINE,
        ScheduleScope.PLANT,
    ]

    @staticmethod
    def _scope_plant(scope_type: str, scope_id: str) -> Plant:
        if scope_type == ScheduleScope.PLANT:
            return Plant.objects.get(id=scope_id)
        if scope_type == ScheduleScope.PRODUCTION_LINE:
            return ProductionLine.objects.select_related("plant").get(id=scope_id).plant
        if scope_type == ScheduleScope.DEPARTMENT:
            return Department.objects.select_related("plant").get(id=scope_id).plant
        if scope_type == ScheduleScope.RESOURCE_GROUP:
            return ResourceGroup.objects.select_related("department__plant").get(id=scope_id).department.plant
        if scope_type == ScheduleScope.RESOURCE:
            return Resource.objects.select_related("resource_group__department__plant").get(id=scope_id).resource_group.department.plant
        raise ScheduleAssignmentError("scopeType", "INVALID_SCOPE", f"Invalid schedule scope: {scope_type}")

    @classmethod
    def validate_scope_plant(cls, scope_type: str, scope_id: str, plant_id: str) -> Plant:
        try:
            plant = cls._scope_plant(scope_type, scope_id)
        except Exception as exc:
            raise ScheduleAssignmentError("scopeId", "NOT_FOUND", "Schedule scope not found.") from exc
        if str(plant.id) != str(plant_id):
            raise ScheduleAssignmentError("plantId", "CROSS_PLANT", "Schedule assignment plant must match the scoped entity plant.")
        return plant

    @staticmethod
    def _line_for_department(department_id: str) -> Optional[str]:
        from manufacturing.models import ProductionLineDepartmentAssignment

        link = (
            ProductionLineDepartmentAssignment.objects.filter(department_id=department_id)
            .order_by("sequence", "id")
            .first()
        )
        return str(link.production_line_id) if link else None

    @classmethod
    def scope_chain(cls, scope_type: str, scope_id: str) -> list[tuple[str, str]]:
        if scope_type == ScheduleScope.RESOURCE:
            resource = Resource.objects.select_related("resource_group__department__plant").get(id=scope_id)
            rg = resource.resource_group
            line_id = cls._line_for_department(str(rg.department_id))
            chain = [
                (ScheduleScope.RESOURCE, str(resource.id)),
                (ScheduleScope.RESOURCE_GROUP, str(rg.id)),
                (ScheduleScope.DEPARTMENT, str(rg.department_id)),
            ]
            if line_id:
                chain.append((ScheduleScope.PRODUCTION_LINE, line_id))
            chain.append((ScheduleScope.PLANT, str(rg.department.plant_id)))
            return chain
        if scope_type == ScheduleScope.RESOURCE_GROUP:
            rg = ResourceGroup.objects.select_related("department__plant").get(id=scope_id)
            chain = [(ScheduleScope.RESOURCE_GROUP, str(rg.id)), (ScheduleScope.DEPARTMENT, str(rg.department_id))]
            chain.append((ScheduleScope.PLANT, str(rg.department.plant_id)))
            return chain
        if scope_type == ScheduleScope.DEPARTMENT:
            dept = Department.objects.select_related("plant").get(id=scope_id)
            chain = [(ScheduleScope.DEPARTMENT, str(dept.id))]
            chain.append((ScheduleScope.PLANT, str(dept.plant_id)))
            return chain
        if scope_type == ScheduleScope.PRODUCTION_LINE:
            line = ProductionLine.objects.select_related("plant").get(id=scope_id)
            return [(ScheduleScope.PRODUCTION_LINE, str(line.id)), (ScheduleScope.PLANT, str(line.plant_id))]
        if scope_type == ScheduleScope.PLANT:
            return [(ScheduleScope.PLANT, str(scope_id))]
        raise ScheduleAssignmentError("scopeType", "INVALID_SCOPE", f"Invalid schedule scope: {scope_type}")

    @classmethod
    def resolve_assignment(cls, scope_type: str, scope_id: str, at: Optional[datetime] = None) -> Optional[ScheduleAssignment]:
        chain = cls.scope_chain(scope_type, scope_id)
        for level, entity_id in chain:
            qs = ScheduleAssignment.objects.select_related("work_schedule", "plant").filter(
                entity_type=level,
                entity_id=entity_id,
                is_active=True,
                status="ACTIVE",
                work_schedule__isnull=False,
            )
            if at:
                qs = qs.filter(valid_from__isnull=True) | qs.filter(valid_from__lte=at)
                qs = qs.filter(valid_to__isnull=True) | qs.filter(valid_to__gte=at)
            assignment = qs.order_by("-priority", "-valid_from", "-id").first()
            if assignment:
                return assignment
        return None

    @classmethod
    @transaction.atomic
    def assign(
        cls,
        *,
        plant_id: str,
        scope_type: str,
        scope_id: str,
        work_schedule_id: str,
        effective_from=None,
        effective_to=None,
        priority: int = 0,
    ) -> ScheduleAssignment:
        plant = cls.validate_scope_plant(scope_type, scope_id, plant_id)
        try:
            schedule = WorkSchedule.objects.get(id=work_schedule_id)
        except WorkSchedule.DoesNotExist as exc:
            raise ScheduleAssignmentError("scheduleId", "NOT_FOUND", "Work schedule not found.") from exc
        return ScheduleAssignment.objects.create(
            plant=plant,
            entity_type=scope_type,
            entity_id=str(scope_id),
            work_schedule=schedule,
            schedule_id=None,
            valid_from=effective_from,
            valid_to=effective_to,
            priority=priority,
            is_active=True,
            status="ACTIVE",
        )
