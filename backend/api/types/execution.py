import strawberry


@strawberry.type
class WorkOrderNode:
	reference: str
	status: str
	quantity: int


@strawberry.type
class ExecutionSnapshot:
	open_work_orders: int
	active_cycles: int
	downtime_events_last_24h: int
