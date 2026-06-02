import strawberry

from api.mutations.application import ApplicationSettingsMutation
from api.mutations.execution import ExecutionMutation
from api.mutations.improvement import ImprovementMutation
from api.mutations.manufacturing import ManufacturingMutation
from api.mutations.integration import IntegrationMutation
from api.mutations.auth import AuthMutation
from api.mutations.plant_structure import PlantStructureMutation
from api.mutations.mapping import MappingMutation
from api.mutations.lineage import LineageMutation
from api.mutations.mer import MERMutation
from check.schema import CheckMutation


@strawberry.type
class Mutation(
    ApplicationSettingsMutation,
    ManufacturingMutation,
    ExecutionMutation,
    ImprovementMutation,
    IntegrationMutation,
    AuthMutation,
    PlantStructureMutation,
    MappingMutation,
    LineageMutation,
    MERMutation,
    CheckMutation,
):
    """Root mutation — domain mutations are added here as they get implemented."""

    @strawberry.mutation
    def ping(self) -> str:
        return "pong"
