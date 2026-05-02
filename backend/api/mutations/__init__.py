import strawberry

from api.mutations.execution import ExecutionMutation
from api.mutations.improvement import ImprovementMutation
from api.mutations.manufacturing import ManufacturingMutation
from api.mutations.process import ProcessMutation


@strawberry.type
class Mutation(
    ManufacturingMutation,
    ProcessMutation,
    ExecutionMutation,
    ImprovementMutation,
):
    """Root mutation — domain mutations are added here as they get implemented."""

    @strawberry.mutation
    def ping(self) -> str:
        return "pong"
