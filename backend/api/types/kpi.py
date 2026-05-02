import strawberry


@strawberry.type
class KpiSnapshot:
	oee: float
	lead_time_minutes: float
	bottleneck_resource_code: str
