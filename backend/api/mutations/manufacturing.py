import strawberry

from api.permissions import ensure_access
from api.validators import require_non_empty


@strawberry.type
class ManufacturingMutation:
	@strawberry.mutation
	def rename_plant(self, plant_code: str, name: str) -> str:
		ensure_access(action="rename_plant")
		cleaned_name = require_non_empty(name, "name")
		return f"Plant {plant_code} renamed to {cleaned_name}"
