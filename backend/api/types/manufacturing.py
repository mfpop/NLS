import strawberry


@strawberry.type
class PlantNode:
	code: str
	name: str


@strawberry.type
class ManufacturingSnapshot:
	plant_count: int
	department_count: int
	resource_group_count: int
	resource_count: int
