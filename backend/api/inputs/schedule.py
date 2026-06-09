"""GraphQL inputs for legacy schedule entities.

Schedule, Shift, ScheduleAssignment, and pagination inputs.
"""

import typing
import strawberry


@strawberry.input
class ScheduleInput:
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"


@strawberry.input
class ScheduleAssignmentInput:
    entity_type: str = strawberry.field(name="entityType")
    entity_id: str = strawberry.field(name="entityId")
    plant_id: typing.Optional[strawberry.ID] = strawberry.field(name="plantId", default=None)
    schedule_id: typing.Optional[strawberry.ID] = strawberry.field(name="scheduleId", default=None)
    work_schedule_id: typing.Optional[strawberry.ID] = strawberry.field(name="workScheduleId", default=None)
    inheritance_mode: typing.Optional[str] = strawberry.field(name="inheritanceMode", default="NONE")
    priority: typing.Optional[int] = 0
    valid_from: typing.Optional[str] = strawberry.field(name="validFrom", default=None)
    valid_to: typing.Optional[str] = strawberry.field(name="validTo", default=None)
