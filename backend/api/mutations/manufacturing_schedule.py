import strawberry
from strawberry.types import Info
from api.permissions import ensure_access
from api.types.manufacturing import (
    MutationError,
    ScheduleNode, SchedulePayload, ScheduleInput,
    ScheduleAssignmentNode, ScheduleAssignmentPayload, ScheduleAssignmentInput,
)
from manufacturing.models import Schedule, ScheduleAssignment


def _user(info):
    return info.context.user


@strawberry.type
class ManufacturingScheduleMutation:
    @strawberry.mutation
    def create_schedule(self, info: Info, input: ScheduleInput) -> SchedulePayload:
        ensure_access(user=_user(info), action="manage_schedules")
        s = Schedule.objects.create(
            code=input.code, name=input.name, description=input.description or "",
            status=input.status or "ACTIVE",
        )
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))


    @strawberry.mutation
    def update_schedule(self, info: Info, id: str, input: ScheduleInput) -> SchedulePayload:
        ensure_access(user=_user(info), action="manage_schedules")
        try:
            s = Schedule.objects.get(id=id)
        except Schedule.DoesNotExist:
            return SchedulePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Schedule not found"}])
        for f in ("code", "name", "description", "status"):
            v = getattr(input, f)
            if v is not None:
                setattr(s, f, v)
        s.save()
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))


    @strawberry.mutation
    def archive_schedule(self, info: Info, id: str) -> SchedulePayload:
        ensure_access(user=_user(info), action="manage_schedules")
        try:
            s = Schedule.objects.get(id=id)
        except Schedule.DoesNotExist:
            return SchedulePayload(ok=False, errors=[{"field": "id", "code": "NOT_FOUND", "message": "Schedule not found"}])
        s.status = "ARCHIVED"
        s.save()
        return SchedulePayload(ok=True, schedule=ScheduleNode.from_db(s))


    @strawberry.mutation
    def assign_schedule(self, info: Info, input: ScheduleAssignmentInput) -> ScheduleAssignmentPayload:
        ensure_access(user=_user(info), action="manage_schedule_assignments")
        if input.work_schedule_id:
            from manufacturing.domain.schedule_assignment_service import ScheduleAssignmentError, ScheduleAssignmentService
            try:
                a = ScheduleAssignmentService.assign(
                    plant_id=str(input.plant_id or ""),
                    scope_type=input.entity_type,
                    scope_id=input.entity_id,
                    work_schedule_id=str(input.work_schedule_id),
                    effective_from=input.valid_from,
                    effective_to=input.valid_to,
                    priority=input.priority or 0,
                )
            except ScheduleAssignmentError as exc:
                return ScheduleAssignmentPayload(ok=False, errors=[MutationError(field=exc.field, code=exc.code, message=exc.message)])
            return ScheduleAssignmentPayload(ok=True, assignment=ScheduleAssignmentNode.from_db(a))

        a = ScheduleAssignment.objects.create(
            entity_type=input.entity_type, entity_id=input.entity_id,
            schedule_id=input.schedule_id, inheritance_mode=input.inheritance_mode or "NONE",
            valid_from=input.valid_from, valid_to=input.valid_to,
            priority=input.priority or 0,
        )
        return ScheduleAssignmentPayload(ok=True, assignment=ScheduleAssignmentNode.from_db(a))


    @strawberry.mutation
    def remove_schedule_assignment(self, info: Info, id: str) -> ScheduleAssignmentPayload:
        ensure_access(user=_user(info), action="manage_schedule_assignments")
        deleted, _ = ScheduleAssignment.objects.filter(id=id).delete()
        return ScheduleAssignmentPayload(ok=deleted > 0)

    # ── Legacy reference item mutations ──


