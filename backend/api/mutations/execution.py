import strawberry

from api.permissions import ensure_access
from api.validators import require_non_empty


def _user(info):
    return info.context.user


@strawberry.type
class ExecutionMutation:
    @strawberry.mutation
    def start_work_order(self, info: strawberry.types.Info, work_order_reference: str) -> str:
        ensure_access(user=_user(info), action="start_work_order")
        validated_reference = require_non_empty(
            work_order_reference,
            "work_order_reference",
        )
        return f"Work order {validated_reference} started"
