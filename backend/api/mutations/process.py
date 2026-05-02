import strawberry

from api.permissions import ensure_access
from api.validators import require_non_empty


@strawberry.type
class ProcessMutation:
	@strawberry.mutation
	def activate_process_flow(self, flow_code: str) -> str:
		ensure_access(action="activate_process_flow")
		validated_flow_code = require_non_empty(flow_code, "flow_code")
		return f"Activated process flow {validated_flow_code}"
