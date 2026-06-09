import json
import strawberry
import typing
from datetime import datetime
from django.db.models import Q

from manufacturing.models import (
    Plant, Department, ProductionLine, ResourceGroup, Resource,
    ProductionLineDepartmentAssignment, Company,
    Schedule, Shift, ScheduleAssignment,
    ReferenceCategory, ReferenceValue, ResourceType, VisualIdentity,
    ProductModel, ProcessFlow, ProcessStep,
    Routing, RoutingStep, RoutingStatus,
    Material, BOM, BOMItem, InventoryLocation, OperationInput, OperationOutput, MaterialMovementRule,
    MaterialBin, CapacityPlan, CapacityPlanInput as CapacityPlanInputModel, CapacityPlanResult as CapacityPlanResultModel, CapacityScenario,
    ProductFamily, ProductVariant, PartNumber,
)
from manufacturing.models.capacity import CapacitySnapshot

# ── Inputs (imported from api/inputs/ domain modules) ──
from api.inputs.materials import WarehouseInput, MaterialBinInput
from api.inputs.product_master import (
    ProductFamilyInput, ProductModelInput, ProductVariantInput,
    PartNumberInput, BomInput,
    RoutingInput, OperationMaterialInput, MaterialMovementRuleInput,
    RoutingStepInput, ReorderStepsInput, SaveRoutingInput,
)
from api.inputs.planning import (
    CapacityPlanCreateInput, CapacityPlanInputUpdateInput, CapacityScenarioInput,
    WorkScheduleInput, WorkScheduleUpdateInput,
    WorkShiftInput, WorkShiftUpdateInput,
    CapacityProfileInput, CapacityProfileUpdateInput,
    CapacityRecalculationInput,
    LaborRequirementInput, LaborRequirementUpdateInput,
    OperatorAssignmentInput, OperatorAssignmentUpdateInput,
)
from api.inputs.documents import (
    StructureDocumentInput, StructureDocumentUpdateInput,
    CreateRevisionInput, ArchiveDocumentInput, ControlledCopyInput,
)
from api.inputs.audit import (
    AuditInput, AuditUpdateInput,
    AuditChecklistItemInput, AuditChecklistItemUpdateInput,
    AuditFindingInput, AuditFindingUpdateInput,
    AuditTemplateCreateInput, AuditTemplateUpdateInput,
    AuditTemplateCategoryInput, AuditTemplateCategoryUpdateInput,
    AuditTemplateQuestionInput, AuditTemplateQuestionUpdateInput,
    CreateAuditFromTemplateInput,
    SaveAuditAnswerInput, SaveAuditAnswersBulkInput,
    CreateAuditFindingFromAnswerInput,
)
from api.inputs.schedule import ScheduleInput, ScheduleAssignmentInput
from api.utils.converters import _iso

# ── Shared interfaces ──
from api.common.errors import MutationError


# ── Profile ──


# ── Company ──


# ── Plant ──


# ── ProductionLine ──


@strawberry.type
class ScheduleNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Schedule) -> "ScheduleNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ShiftNode:
    id: strawberry.ID
    schedule_id: strawberry.ID = strawberry.field(name="scheduleId")
    name: str
    start_time: str = strawberry.field(name="startTime")
    end_time: str = strawberry.field(name="endTime")
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Shift) -> "ShiftNode":
        return cls(
            id=strawberry.ID(str(obj.id)), schedule_id=strawberry.ID(str(obj.schedule_id)),
            name=obj.name,
            start_time=obj.start_time.isoformat() if obj.start_time else "",
            end_time=obj.end_time.isoformat() if obj.end_time else "",
            status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ScheduleAssignmentNode:
    id: strawberry.ID
    plant_id: typing.Optional[strawberry.ID] = strawberry.field(name="plantId", default=None)
    entity_type: str = strawberry.field(name="entityType")
    entity_id: str = strawberry.field(name="entityId")
    schedule_id: typing.Optional[strawberry.ID] = strawberry.field(name="scheduleId", default=None)
    work_schedule_id: typing.Optional[strawberry.ID] = strawberry.field(name="workScheduleId", default=None)
    inheritance_mode: str = strawberry.field(name="inheritanceMode")
    priority: int
    is_active: bool = strawberry.field(name="isActive")
    valid_from: typing.Optional[str] = strawberry.field(name="validFrom")
    valid_to: typing.Optional[str] = strawberry.field(name="validTo")
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ScheduleAssignment) -> "ScheduleAssignmentNode":
        return cls(
            id=strawberry.ID(str(obj.id)), plant_id=strawberry.ID(str(obj.plant_id)) if obj.plant_id else None,
            entity_type=obj.entity_type,
            entity_id=obj.entity_id, schedule_id=strawberry.ID(str(obj.schedule_id)) if obj.schedule_id else None,
            work_schedule_id=strawberry.ID(str(obj.work_schedule_id)) if obj.work_schedule_id else None,
            inheritance_mode=obj.inheritance_mode,
            priority=obj.priority,
            is_active=obj.is_active,
            valid_from=obj.valid_from.isoformat() if obj.valid_from else None,
            valid_to=obj.valid_to.isoformat() if obj.valid_to else None,
            status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── Reference Data & Response Types ──


@strawberry.type
class ResourceTypeNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ResourceType) -> "ResourceTypeNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class VisualIdentityNode:
    id: strawberry.ID
    entity_type: str = strawberry.field(name="entityType")
    entity_id: str = strawberry.field(name="entityId")
    icon_key: str = strawberry.field(name="iconKey")
    color_key: str = strawberry.field(name="colorKey")
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: VisualIdentity) -> "VisualIdentityNode":
        return cls(
            id=strawberry.ID(str(obj.id)), entity_type=obj.entity_type,
            entity_id=obj.entity_id, icon_key=obj.icon_key,
            color_key=obj.color_key, status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── Product Routing ──

@strawberry.type
class MaterialBinPayload:
    ok: bool
    material_bin: typing.Optional["MaterialBinNode"] = strawberry.field(name="materialBin", default=None)
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class SchedulePayload:
    ok: bool
    schedule: typing.Optional[ScheduleNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ScheduleAssignmentPayload:
    ok: bool
    assignment: typing.Optional[ScheduleAssignmentNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class SeedGptLinePayload:
    ok: bool
    messages: list[str] = strawberry.field(default_factory=list)
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class CleanupGptLinePayload:
    ok: bool
    messages: list[str] = strawberry.field(default_factory=list)
    errors: list[MutationError] = strawberry.field(default_factory=list)


# ── Warehouse ──

@strawberry.type
class WarehouseNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")
    code: str
    name: str
    warehouse_type: str = strawberry.field(name="warehouseType")
    location: str
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj) -> "WarehouseNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            plant_name=obj.plant.name if obj.plant else "",
            code=obj.code,
            name=obj.name,
            warehouse_type=obj.warehouse_type,
            location=obj.location or "",
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class WarehousePayload:
    ok: bool
    warehouse: typing.Optional[WarehouseNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


# ── Mutation inputs ──

@strawberry.type
class PaginatedShiftResponse:
    items: list[ShiftNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedScheduleAssignmentResponse:
    items: list[ScheduleAssignmentNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedVisualIdentityResponse:
    items: list[VisualIdentityNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class MaterialBinNode:
    id: strawberry.ID
    plant_id: strawberry.ID = strawberry.field(name="plantId")
    plant_name: str = strawberry.field(name="plantName")
    production_line_id: typing.Optional[strawberry.ID] = strawberry.field(name="productionLineId", default=None)
    production_line_name: typing.Optional[str] = strawberry.field(name="productionLineName", default=None)
    resource_group_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceGroupId", default=None)
    resource_group_name: typing.Optional[str] = strawberry.field(name="resourceGroupName", default=None)
    code: str
    name: str
    description: str
    bin_type: str = strawberry.field(name="binType")
    material_id: typing.Optional[strawberry.ID] = strawberry.field(name="materialId", default=None)
    material_code: typing.Optional[str] = strawberry.field(name="materialCode", default=None)
    material_name: typing.Optional[str] = strawberry.field(name="materialName", default=None)
    material_group: str = strawberry.field(name="materialGroup")
    capacity: float
    uom_id: typing.Optional[strawberry.ID] = strawberry.field(name="uomId", default=None)
    uom_name: typing.Optional[str] = strawberry.field(name="uomName", default=None)
    replenishment_mode: typing.Optional[str] = strawberry.field(name="replenishmentMode", default=None)
    fifo_enabled: bool = strawberry.field(name="fifoEnabled")
    supermarket_enabled: bool = strawberry.field(name="supermarketEnabled")
    location_code: str = strawberry.field(name="locationCode")
    location_reference: str = strawberry.field(name="locationReference")
    warehouse_code: str = strawberry.field(name="warehouseCode")
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: MaterialBin) -> "MaterialBinNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            plant_id=strawberry.ID(str(obj.plant_id)),
            plant_name=obj.plant.name if obj.plant_id else "",
            production_line_id=strawberry.ID(str(obj.production_line_id)) if obj.production_line_id else None,
            production_line_name=obj.production_line.name if obj.production_line_id else None,
            resource_group_id=strawberry.ID(str(obj.resource_group_id)) if obj.resource_group_id else None,
            resource_group_name=obj.resource_group.name if obj.resource_group_id else None,
            code=obj.code,
            name=obj.name,
            description=obj.description,
            bin_type=obj.bin_type,
            material_id=strawberry.ID(str(obj.material_id)) if obj.material_id else None,
            material_code=obj.material.code if obj.material_id else None,
            material_name=obj.material.name if obj.material_id else None,
            material_group=obj.material_group,
            capacity=obj.capacity,
            uom_id=strawberry.ID(str(obj.uom_id)) if obj.uom_id else None,
            uom_name=obj.uom.name if obj.uom_id else None,
            replenishment_mode=obj.replenishment_mode,
            fifo_enabled=obj.fifo_enabled,
            supermarket_enabled=obj.supermarket_enabled,
            location_code=obj.location_code,
            location_reference=obj.location_reference,
            warehouse_code=obj.warehouse_code,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


def _ref_val(obj) -> typing.Optional["ReferenceValueNode"]:
    if obj is None:
        return None
    return ReferenceValueNode.from_db(obj)


# ── Re-exports from domain type files ──
from api.types.product_master import (  # noqa: F401
    BOMItemNode, BOMNode, BomPayload, FlowValidationMessageNode,
    InventoryLocationNode, MaterialFlowItemNode, MaterialMovementRuleNode,
    MaterialNode, PaginatedBOMResponse, PaginatedPartNumberResponse,
    PaginatedProcessFlowResponse, PaginatedProcessStepResponse,
    PaginatedProductFamilyResponse, PaginatedProductModelResponse,
    PaginatedProductVariantResponse, PartNumberNode, PartNumberPayload,
    ProcessFlowNode, ProcessFlowOperationNode, ProcessStepNode,
    ProductFamilyAssignmentNode, ProductFamilyAssignmentPayload,
    ProductFamilyNode, ProductFamilyPayload, ProductModelAssignmentNode,
    ProductModelAssignmentPayload, ProductModelByFamilyNode,
    ProductModelNode, ProductModelPayload, ProductVariantNode,
    ProductVariantPayload, ProductionLineFlowContextNode,
    RoutingListPayload, RoutingNode, RoutingPayload, RoutingStepNode,
    RoutingStepPayload, RoutingSummaryNode, StepCapacityNode,
    YamazumiAnalysisNode, YamazumiStepNode,
)
from api.types.planning import (  # noqa: F401
    CapacityConstraintNode, CapacityLoadRowNode, CapacityPlanInputNode,
    CapacityPlanNode, CapacityPlanPayload, CapacityPlanResultNode,
    CapacityProfileNode, CapacityProfilePayload, CapacityRecalculationJobNode,
    CapacityRecalculationPayload, CapacityResultNode, CapacityScenarioNode,
    CapacityScenarioPayload, CapacitySnapshotNode, CapacityWarningNode,
    CapacityYamazumiItemNode, CapacityYamazumiNode,
    LaborRequirementNode, LaborRequirementPayload,
    OperatorAssignmentNode, OperatorAssignmentPayload,
    PaginatedCapacitySnapshotResponse, WorkScheduleNode,
    WorkSchedulePayload, WorkShiftNode, WorkShiftPayload,
)
from api.types.documents import (  # noqa: F401
    AuditTrailPayload, DocumentAuditTrailNode, DocumentControlPayload,
    DocumentRevisionHistoryNode, RevisionHistoryPayload,
    StructureDocumentNode, StructureDocumentPayload,
    StructureDocumentTreeNode,
)
from api.types.audit import (  # noqa: F401
    AuditAnswerNode, AuditAnswerPayload, AuditChecklistItemNode,
    AuditChecklistItemPayload, AuditExecutionForm, AuditExecutionQuestion,
    AuditExecutionSection, AuditExecutionSummary, AuditFindingNode,
    AuditFindingPayload, AuditFindingsPayload, AuditInstallTemplatesPayload,
    AuditNode, AuditPayload, AuditTemplateCategoryNode, AuditTemplateInfo,
    AuditTemplateNode, AuditTemplatePayload, AuditTemplateQuestionNode,
    CreateLinkedIssuePayload, CreateLinkedActionPayload,
    SaveAuditAnswersBulkPayload,
)

# ── Re-export manufacturing structure types ──
from api.types.manufacturing_structure import (  # noqa: F401
    AssignDepartmentInput,
    AssignDepartmentToLinesInput,
    AssignedResourceGroupNode,
    AssignmentPayload,
    CompanyInput,
    CompanyNode,
    CompanyPayload,
    DeletePayload,
    DepartmentInput,
    DepartmentListInput,
    DepartmentNode,
    DepartmentPayload,
    DepartmentProductionLineNode,
    DepartmentResourceGroupNode,
    EducationEntry,
    EducationInput,
    ManufacturingSnapshot,
    PaginatedReferenceCategoryResponse,
    PaginatedReferenceValueResponse,
    PaginationInput,
    PersonRefNode,
    PlantInput,
    PlantNode,
    PlantPaginationInput,
    PlantPayload,
    ProductionLineAssignmentPayload,
    ProductionLineDepartmentAssignmentNode,
    ProductionLineDepartmentLinkNode,
    ProductionLineInput,
    ProductionLineListInput,
    ProductionLineNode,
    ProductionLinePayload,
    ProductionLineResourceGroupOptionNode,
    ProductionStructureTree,
    ProfileInput,
    ProfileNode,
    ProfilePayload,
    ReferenceCategoryNode,
    ReferenceListInput,
    ReferenceTableCatalogEntryNode,
    ReferenceTableCatalogGroupNode,
    ReferenceTableNode,
    ReferenceValueNode,
    ResolvedScheduleNode,
    ResourceGroupFlowUsageNode,
    ResourceGroupInput,
    ResourceGroupListInput,
    ResourceGroupNode,
    ResourceGroupPayload,
    ResourceInput,
    ResourceListInput,
    ResourceNode,
    ResourcePayload,
    StructureChildNode,
    WorkHistoryEntry,
    WorkHistoryInput,
    _iso,
)