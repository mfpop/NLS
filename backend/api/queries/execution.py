import strawberry

from api.types.execution import ExecutionSnapshot, WorkOrderNode


@strawberry.type
class ExecutionQuery:
	@strawberry.field
	def open_work_orders(self) -> list[WorkOrderNode]:
		return [
			WorkOrderNode(reference="WO-1001", status="OPEN", quantity=120),
			WorkOrderNode(reference="WO-1002", status="OPEN", quantity=80),
		]

	@strawberry.field
	def execution_snapshot(self) -> ExecutionSnapshot:
		return ExecutionSnapshot(
			open_work_orders=2,
			active_cycles=5,
			downtime_events_last_24h=1,
		)
