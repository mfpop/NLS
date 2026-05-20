import strawberry
from typing import Optional
from django.contrib.auth.models import User
from django.db.models import Q

from api.queries.application import ApplicationSettingsQuery
from api.queries.execution import ExecutionQuery
from api.queries.improvement import ImprovementQuery
from api.queries.kpi import KpiQuery
from api.queries.manufacturing import ManufacturingQuery
from api.queries.integration import IntegrationQuery
from api.queries.mapping import MappingQuery
from api.queries.lineage import LineageQuery
from api.types.auth import UserNode
from docs_manager.schema import DocumentationQuery


@strawberry.type
class Query(
    ApplicationSettingsQuery,
    ManufacturingQuery,
    ExecutionQuery,
    ImprovementQuery,
    KpiQuery,
    DocumentationQuery,
    IntegrationQuery,
    MappingQuery,
    LineageQuery,
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

    @strawberry.field
    def users(self, search: Optional[str] = None) -> list[UserNode]:
        qs = User.objects.all().order_by("username")
        term = (search or "").strip()
        if term:
            qs = qs.filter(Q(username__icontains=term) | Q(email__icontains=term) | Q(first_name__icontains=term) | Q(last_name__icontains=term))
        return [UserNode.from_user(user) for user in qs[:50]]
