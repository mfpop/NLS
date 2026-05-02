import strawberry


@strawberry.type
class ProcessFlowNode:
	code: str
	product_variant_code: str
	version: int
	is_active: bool


@strawberry.type
class ProcessSnapshot:
	product_model_count: int
	product_variant_count: int
	process_flow_count: int
	active_flow_count: int
