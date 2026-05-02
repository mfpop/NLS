import strawberry


@strawberry.type
class KaizenNode:
	code: str
	title: str
	status: str


@strawberry.type
class ImprovementSnapshot:
	open_kaizens: int
	gemba_walks_this_week: int
	observations_this_week: int
