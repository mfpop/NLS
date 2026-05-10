import strawberry
from typing import Optional

from api.queries.execution import ExecutionQuery
from api.queries.improvement import ImprovementQuery
from api.queries.kpi import KpiQuery
from api.queries.manufacturing import ManufacturingQuery
from api.types.auth import UserNode
from docs_manager.schema import DocumentationQuery


@strawberry.type
class Query(
    ManufacturingQuery,
    ExecutionQuery,
    ImprovementQuery,
    KpiQuery,
    DocumentationQuery,
):
    """Root query — domain resolvers are added here as fields get implemented."""

    @strawberry.field
    def health(self) -> str:
        return "ok"

    @strawberry.field
    def me(self, info: strawberry.types.Info) -> Optional[UserNode]:
        user = info.context.user
        if user is None:
            return None
        return UserNode.from_user(user)
