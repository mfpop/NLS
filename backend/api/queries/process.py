import strawberry

from api.types.process import ProcessFlowNode, ProcessSnapshot


@strawberry.type
class ProcessQuery:
	@strawberry.field
	def active_process_flows(self) -> list[ProcessFlowNode]:
		return [
			ProcessFlowNode(
				code="FLOW-A1",
				product_variant_code="PV-A1",
				version=3,
				is_active=True,
			)
		]

	@strawberry.field
	def process_snapshot(self) -> ProcessSnapshot:
		return ProcessSnapshot(
			product_model_count=8,
			product_variant_count=20,
			process_flow_count=32,
			active_flow_count=20,
		)
