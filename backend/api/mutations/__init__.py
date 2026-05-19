import strawberry

from api.mutations.application import ApplicationSettingsMutation
from api.mutations.execution import ExecutionMutation
from api.mutations.improvement import ImprovementMutation
from api.mutations.manufacturing import ManufacturingMutation
from api.mutations.integration import IntegrationMutation
from api.mutations.auth import AuthMutation


@strawberry.type
class Mutation(
    ApplicationSettingsMutation,
    ManufacturingMutation,
    ExecutionMutation,
    ImprovementMutation,
    IntegrationMutation,
    AuthMutation,
):
    """Root mutation — domain mutations are added here as they get implemented."""

    @strawberry.mutation
    def ping(self) -> str:
        return "pong"
