import strawberry

from api.types.improvement import ImprovementSnapshot, KaizenNode


@strawberry.type
class ImprovementQuery:
	@strawberry.field
	def open_kaizens(self) -> list[KaizenNode]:
		return [
			KaizenNode(code="KZN-21", title="Reduce setup time", status="IN_PROGRESS")
		]

	@strawberry.field
	def improvement_snapshot(self) -> ImprovementSnapshot:
		return ImprovementSnapshot(
			open_kaizens=1,
			gemba_walks_this_week=3,
			observations_this_week=14,
		)
