import strawberry

from api.permissions import ensure_access
from api.validators import require_non_empty


def _user(info):
    return info.context.user


@strawberry.type
class ProcessMutation:
    @strawberry.mutation
    def activate_process_flow(self, info: strawberry.types.Info, flow_code: str) -> str:
        ensure_access(user=_user(info), action="activate_process_flow")
        validated_flow_code = require_non_empty(flow_code, "flow_code")
        return f"Activated process flow {validated_flow_code}"
