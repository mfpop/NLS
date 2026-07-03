import strawberry
from typing import Optional

from api.types.vsm import VsmDiagramNode, VsmChartNode, VsmChartListPayload, VsmChartPayload
from api.types.vsm_helpers import chart_to_node
from execution.services.vsm import VsmDiagramBuilder, VsmChartService


_builder = VsmDiagramBuilder()
_chart_service = VsmChartService()


@strawberry.type
class VsmQuery:
    @strawberry.field(name="vsmDiagram")
    def vsm_diagram(
        self,
        info: strawberry.types.Info,
        line_id: str,
        product_variant_code: Optional[str] = None,
    ) -> Optional[VsmDiagramNode]:
        return _builder.build(line_id=line_id, product_variant_code=product_variant_code)

    @strawberry.field(name="vsmCharts")
    def vsm_charts(
        self,
        production_line_id: Optional[str] = None,
        source_mode: Optional[str] = None,
        chart_type: Optional[str] = None,
    ) -> VsmChartListPayload:
        charts = _chart_service.list_charts(
            production_line_id=production_line_id,
            source_mode=source_mode,
            chart_type=chart_type,
        )
        return VsmChartListPayload(
            charts=[chart_to_node(c) for c in charts],
            total=len(charts),
        )

    @strawberry.field(name="vsmChart")
    def vsm_chart(self, id: str) -> Optional[VsmChartNode]:
        chart = _chart_service.get_chart(id)
        if not chart:
            return None
        return chart_to_node(chart)
