import strawberry

from api.permissions import ensure_access
from api.validators import require_non_empty


@strawberry.type
class ImprovementMutation:
	@strawberry.mutation
	def create_kaizen(self, title: str) -> str:
		ensure_access(action="create_kaizen")
		validated_title = require_non_empty(title, "title")
		return f"Created kaizen: {validated_title}"
