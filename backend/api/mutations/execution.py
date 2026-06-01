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
        from execution.models import WorkOrder, WorkOrderStatus
        try:
            wo = WorkOrder.objects.get(reference=validated_reference)
            if wo.status == WorkOrderStatus.OPEN:
                wo.status = WorkOrderStatus.IN_PROGRESS
                wo.save(update_fields=["status", "updated_at"])
                return f"Work order {validated_reference} started."
            return f"Work order {validated_reference} is already {wo.status}."
        except WorkOrder.DoesNotExist:
            return f"Work order {validated_reference} not found."
