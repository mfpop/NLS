import strawberry

from api.types.execution import ExecutionSnapshot, WorkOrderNode


@strawberry.type
class ExecutionQuery:
	@strawberry.field
	def open_work_orders(self) -> list[WorkOrderNode]:
		from execution.models import WorkOrder, WorkOrderStatus
		orders = WorkOrder.objects.filter(status=WorkOrderStatus.OPEN).order_by("-created_at")
		return [
			WorkOrderNode(reference=o.reference, status=o.status, quantity=o.planned_quantity)
			for o in orders
		]

	@strawberry.field
	def execution_snapshot(self) -> ExecutionSnapshot:
		from execution.models import WorkOrder, WorkOrderStatus
		open_count = WorkOrder.objects.filter(status=WorkOrderStatus.OPEN).count()
		return ExecutionSnapshot(
			open_work_orders=open_count,
			active_cycles=5,
			downtime_events_last_24h=1,
		)
