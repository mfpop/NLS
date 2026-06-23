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
from api.mutations.administration import AdministrationMutation
from check.schema import CheckMutation
from maintenance.schema import MaintenanceMutation
from workspace.schema import WorkspaceMutation
from workspace.chat_schema import ChatMutation
from api.mutations.manufacturing_structure import ManufacturingStructureMutation
from api.mutations.manufacturing_schedule import ManufacturingScheduleMutation
from api.mutations.manufacturing_reference import ManufacturingReferenceMutation
from api.mutations.manufacturing_resources import ManufacturingResourcesMutation
from api.mutations.manufacturing_product_master import ManufacturingProductMasterMutation
from api.mutations.manufacturing_capacity import ManufacturingCapacityMutation
from api.mutations.manufacturing_audit import ManufacturingAuditMutation


@strawberry.type
class Mutation(
    ManufacturingStructureMutation,
    ManufacturingScheduleMutation,
    ManufacturingReferenceMutation,
    ManufacturingResourcesMutation,
    ManufacturingProductMasterMutation,
    ManufacturingCapacityMutation,
    ManufacturingAuditMutation,
    ApplicationSettingsMutation,
    ManufacturingMutation,
    AdministrationMutation,
    ExecutionMutation,
    ImprovementMutation,
    IntegrationMutation,
    AuthMutation,
    PlantStructureMutation,
    MappingMutation,
    LineageMutation,
    MERMutation,
    CheckMutation,
    MaintenanceMutation,
    WorkspaceMutation,
    ChatMutation,
):
    """Root mutation — domain mutations are added here as they get implemented."""

    @strawberry.mutation
    def ping(self) -> str:
        return "pong"
