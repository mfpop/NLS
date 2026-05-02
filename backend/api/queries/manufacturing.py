import strawberry

from api.types.manufacturing import ManufacturingSnapshot, PlantNode


@strawberry.type
class ManufacturingQuery:
	@strawberry.field
	def plants(self) -> list[PlantNode]:
		return [
			PlantNode(code="PLT-01", name="Main Plant"),
			PlantNode(code="PLT-02", name="Secondary Plant"),
		]

	@strawberry.field
	def manufacturing_snapshot(self) -> ManufacturingSnapshot:
		return ManufacturingSnapshot(
			plant_count=2,
			department_count=6,
			resource_group_count=12,
			resource_count=48,
		)
