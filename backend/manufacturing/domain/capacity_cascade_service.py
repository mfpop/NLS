from __future__ import annotations

from datetime import datetime
from typing import Optional

from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from manufacturing.models.capacity import (
    CapacityRecalculationJob, CapacitySnapshot, ScheduleScope,
    CapacityProfile, WorkSchedule,
)
from manufacturing.domain.schedule_service import ScheduleService
from manufacturing.domain.capacity_service import NewCapacityService


class CapacityCascadeService:

    @staticmethod
    @transaction.atomic
    def recalculate_from_scope(
        scope_type: str,
        scope_id: str,
        from_dt: datetime,
        to_dt: datetime,
        trigger_type: str = "SCHEDULE_CHANGED",
    ) -> list[CapacityRecalculationJob]:
        st = scope_type.value if hasattr(scope_type, 'value') else scope_type

        job = CapacityRecalculationJob.objects.create(
            trigger_type=trigger_type,
            scope_type=st,
            scope_id=scope_id,
            from_datetime=from_dt,
            to_datetime=to_dt,
            status=CapacityRecalculationJob.JobStatus.RUNNING,
            started_at=timezone.now(),
        )
        try:
            impacted = CapacityCascadeService.get_impacted_scopes(st, scope_id)
            for impacted_scope_type, impacted_scope_id in impacted:
                CapacityCascadeService.recalculate_scope(
                    impacted_scope_type, impacted_scope_id, from_dt, to_dt,
                )
            job.status = CapacityRecalculationJob.JobStatus.COMPLETED
            job.completed_at = timezone.now()
            job.save()
        except Exception as e:
            job.status = CapacityRecalculationJob.JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
            raise

        return [job]

    @staticmethod
    def get_impacted_scopes(scope_type: str, scope_id: str) -> list[tuple[str, str]]:
        st = scope_type.value if hasattr(scope_type, 'value') else scope_type
        impacted: list[tuple[str, str]] = []
        from manufacturing.models import (
            Resource, ResourceGroup, Department,
            ProductionLine, ProductionLineDepartmentAssignment, Plant,
        )

        if st == "RESOURCE":
            try:
                resource = Resource.objects.select_related(
                    "resource_group__department__plant"
                ).get(id=scope_id)
                rg = resource.resource_group
                impacted.append(("RESOURCE", scope_id))
                impacted.append(("RESOURCE_GROUP", str(rg.id)))
                impacted.append(("DEPARTMENT", str(rg.department_id)))
                line_assignments = ProductionLineDepartmentAssignment.objects.filter(
                    department_id=rg.department_id
                ).select_related("production_line")
                for a in line_assignments:
                    impacted.append(("PRODUCTION_LINE", str(a.production_line_id)))
                impacted.append(("PLANT", str(rg.department.plant_id)))
            except (Resource.DoesNotExist, ValueError, ValidationError):
                pass

        elif st == "RESOURCE_GROUP":
            try:
                rg = ResourceGroup.objects.select_related("department__plant").get(id=scope_id)
                impacted.append(("RESOURCE_GROUP", scope_id))
                child_resources = Resource.objects.filter(resource_group_id=scope_id)
                for r in child_resources:
                    impacted.append(("RESOURCE", str(r.id)))
                impacted.append(("DEPARTMENT", str(rg.department_id)))
                line_assignments = ProductionLineDepartmentAssignment.objects.filter(
                    department_id=rg.department_id
                ).select_related("production_line")
                for a in line_assignments:
                    impacted.append(("PRODUCTION_LINE", str(a.production_line_id)))
                impacted.append(("PLANT", str(rg.department.plant_id)))
            except (ResourceGroup.DoesNotExist, ValueError, ValidationError):
                pass

        elif st == "DEPARTMENT":
            try:
                dept = Department.objects.select_related("plant").get(id=scope_id)
                impacted.append(("DEPARTMENT", scope_id))
                rgs = ResourceGroup.objects.filter(department_id=scope_id)
                for rg in rgs:
                    impacted.append(("RESOURCE_GROUP", str(rg.id)))
                    child_resources = Resource.objects.filter(resource_group=rg)
                    for r in child_resources:
                        impacted.append(("RESOURCE", str(r.id)))
                line_assignments = ProductionLineDepartmentAssignment.objects.filter(
                    department_id=dept.id
                ).select_related("production_line")
                for a in line_assignments:
                    impacted.append(("PRODUCTION_LINE", str(a.production_line_id)))
                impacted.append(("PLANT", str(dept.plant_id)))
            except (Department.DoesNotExist, ValueError, ValidationError):
                pass

        elif st == "PRODUCTION_LINE":
            try:
                line = ProductionLine.objects.select_related("plant").get(id=scope_id)
                impacted.append(("PRODUCTION_LINE", scope_id))
                line_assignments = ProductionLineDepartmentAssignment.objects.filter(
                    production_line_id=scope_id
                ).select_related("department")
                for a in line_assignments:
                    impacted.append(("DEPARTMENT", str(a.department_id)))
                impacted.append(("PLANT", str(line.plant_id)))
            except (ProductionLine.DoesNotExist, ValueError, ValidationError):
                pass

        elif st == "PLANT":
            impacted.append(("PLANT", scope_id))
            try:
                lines = ProductionLine.objects.filter(plant_id=scope_id)
            except (ValueError, ValidationError):
                lines = []
            for line in lines:
                impacted.append(("PRODUCTION_LINE", str(line.id)))

        return impacted

    @staticmethod
    def recalculate_scope(
        scope_type: str,
        scope_id: str,
        from_dt: datetime,
        to_dt: datetime,
    ):
        st = scope_type.value if hasattr(scope_type, 'value') else scope_type
        NewCapacityService.calculate_scope_capacity(st, scope_id, from_dt, to_dt)

    @staticmethod
    def create_recalculation_job(
        scope_type: str,
        scope_id: str,
        from_dt: datetime,
        to_dt: datetime,
        trigger_type: str = "SCHEDULE_CHANGED",
    ) -> CapacityRecalculationJob:
        return CapacityRecalculationJob.objects.create(
            trigger_type=trigger_type,
            scope_type=scope_type.value if hasattr(scope_type, 'value') else scope_type,
            scope_id=scope_id,
            from_datetime=from_dt,
            to_datetime=to_dt,
        )
