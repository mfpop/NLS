import strawberry

from api.queries.execution import ExecutionQuery
from api.queries.improvement import ImprovementQuery
from api.queries.kpi import KpiQuery
from api.queries.manufacturing import ManufacturingQuery
from api.queries.process import ProcessQuery
from docs_manager.schema import DocumentationQuery


@strawberry.type
class Query(
    ManufacturingQuery,
    ProcessQuery,
    ExecutionQuery,
    ImprovementQuery,
    KpiQuery,
    DocumentationQuery,
):
    """Root query — domain resolvers are added here as fields get implemented."""

    @strawberry.field
    def health(self) -> str:
        return "ok"
