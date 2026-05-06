import strawberry

from api.permissions import ensure_access
from api.validators import require_non_empty


def _user(info):
    return info.context.user


@strawberry.type
class ImprovementMutation:
    @strawberry.mutation
    def create_kaizen(self, info: strawberry.types.Info, title: str) -> str:
        ensure_access(user=_user(info), action="create_kaizen")
        validated_title = require_non_empty(title, "title")
        return f"Created kaizen: {validated_title}"
