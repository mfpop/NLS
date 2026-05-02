import strawberry

from api.types.kpi import KpiSnapshot


@strawberry.type
class KpiQuery:
	@strawberry.field
	def kpi_snapshot(self) -> KpiSnapshot:
		return KpiSnapshot(
			oee=0.84,
			lead_time_minutes=132.5,
			bottleneck_resource_code="RES-WELD-02",
		)
