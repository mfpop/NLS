from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from manufacturing.domain.capacity_invalidation import CapacityInvalidationService
from manufacturing.models import (
    CapacityProfile,
    Department,
    ProductionLine,
    ProductionLineDepartmentAssignment,
    Resource,
    ResourceGroup,
    ScheduleAssignment,
    WorkSchedule,
    WorkShift,
)


@receiver(post_save, sender=ScheduleAssignment)
def invalidate_schedule_assignment(sender, instance, **kwargs):  # pylint: disable=unused-argument
    CapacityInvalidationService.schedule_assignment_changed(instance)


@receiver(post_save, sender=WorkSchedule)
def invalidate_work_schedule(sender, instance, **kwargs):  # pylint: disable=unused-argument
    CapacityInvalidationService.work_schedule_changed(instance)


@receiver(post_save, sender=WorkShift)
def invalidate_work_shift(sender, instance, **kwargs):  # pylint: disable=unused-argument
    CapacityInvalidationService.work_shift_changed(instance)


@receiver(post_save, sender=CapacityProfile)
def invalidate_capacity_profile(sender, instance, **kwargs):  # pylint: disable=unused-argument
    CapacityInvalidationService.capacity_profile_changed(instance)


@receiver(post_save, sender=Resource)
def invalidate_resource(sender, instance, **kwargs):  # pylint: disable=unused-argument
    CapacityInvalidationService.resource_changed(instance)


@receiver(post_save, sender=ResourceGroup)
def invalidate_resource_group(sender, instance, **kwargs):  # pylint: disable=unused-argument
    CapacityInvalidationService.resource_group_changed(instance)


@receiver(post_save, sender=Department)
def invalidate_department(sender, instance, **kwargs):  # pylint: disable=unused-argument
    CapacityInvalidationService.department_changed(instance)


@receiver(post_save, sender=ProductionLine)
def invalidate_production_line(sender, instance, **kwargs):  # pylint: disable=unused-argument
    CapacityInvalidationService.production_line_changed(instance)


@receiver(post_save, sender=ProductionLineDepartmentAssignment)
def invalidate_line_department_assignment(sender, instance, **kwargs):  # pylint: disable=unused-argument
    CapacityInvalidationService.line_department_assignment_changed(instance)
