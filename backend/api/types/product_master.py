import typing
import strawberry
from datetime import datetime
from django.db.models import Q

from manufacturing.models import (
    ProductFamily, ProductModel, ProductVariant, PartNumber,
    ProcessFlow, ProcessStep,
    Routing, RoutingStep, BOM, BOMItem,
    OperationInput, OperationOutput, MaterialMovementRule,
    Material, InventoryLocation,
)
from manufacturing.models.capacity import CapacitySnapshot
from api.common.errors import MutationError
from api.utils.converters import _iso

@strawberry.type
class ProductFamilyAssignmentNode:
    id: strawberry.ID
    name: str
    code: str
    is_primary: bool = strawberry.field(name="isPrimary")
    status: str

    @classmethod
    def from_db(cls, obj) -> "ProductFamilyAssignmentNode":
        return cls(
            id=strawberry.ID(str(obj.product_family_id)),
            name=obj.product_family.name if obj.product_family else "",
            code=obj.product_family.code if obj.product_family else "",
            is_primary=obj.is_primary,
            status=obj.status,
        )


@strawberry.type
class ProductModelAssignmentNode:
    id: strawberry.ID
    name: str
    code: str
    family_id: typing.Optional[strawberry.ID] = strawberry.field(name="familyId", default=None)
    family_name: typing.Optional[str] = strawberry.field(name="familyName", default=None)
    is_primary: bool = strawberry.field(name="isPrimary")
    status: str

    @classmethod
    def from_db(cls, obj) -> "ProductModelAssignmentNode":
        return cls(
            id=strawberry.ID(str(obj.product_model_id)),
            name=obj.product_model.name if obj.product_model else "",
            code=obj.product_model.code if obj.product_model else "",
            family_id=strawberry.ID(str(obj.product_family_id)) if obj.product_family_id else None,
            family_name=obj.product_family.name if obj.product_family else None,
            is_primary=obj.is_primary,
            status=obj.status,
        )


@strawberry.type
class ProductModelByFamilyNode:
    id: strawberry.ID
    name: str
    code: str
    family_id: strawberry.ID = strawberry.field(name="familyId")
    status: str

    @classmethod
    def from_reference(cls, obj, family_id: str) -> "ProductModelByFamilyNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            name=obj.name,
            code=obj.code,
            family_id=strawberry.ID(str(family_id)),
            status=obj.status,
        )

    @classmethod
    def from_product_model(cls, obj: ProductModel) -> "ProductModelByFamilyNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            name=obj.name,
            code=obj.code,
            family_id=strawberry.ID(str(obj.family_id)),
            status=obj.status,
        )


# ── ProductionLineDepartmentAssignment ──


# ── Department ──


# ── ResourceGroup ──


# ── Resource ──


# ── Schedule ──

@strawberry.type
class ProductFamilyNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    status: str
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProductFamily) -> "ProductFamilyNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status, is_active=obj.is_active,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ProductModelNode:
    id: strawberry.ID
    family_id: typing.Optional[str] = strawberry.field(name="familyId", default=None)
    family_name: typing.Optional[str] = strawberry.field(name="familyName", default=None)
    code: str
    name: str
    description: str
    status: str
    is_active: bool = strawberry.field(name="isActive", default=True)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProductModel) -> "ProductModelNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            family_id=str(obj.family_id) if obj.family_id else None,
            family_name=obj.family.name if obj.family_id else None,
            code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            is_active=getattr(obj, "is_active", obj.status != "ARCHIVED"),
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ProductVariantNode:
    id: strawberry.ID
    model_id: strawberry.ID = strawberry.field(name="modelId")
    model_name: str = strawberry.field(name="modelName")
    code: str
    name: str
    configuration_summary: str = strawberry.field(name="configurationSummary")
    part_number: typing.Optional[str] = strawberry.field(name="partNumber", default=None)
    status: str
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProductVariant) -> "ProductVariantNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            model_id=strawberry.ID(str(obj.model_id)),
            model_name=obj.model.name,
            code=obj.code,
            name=obj.name,
            configuration_summary=obj.configuration_summary,
            part_number=obj.part_number,
            status=obj.status,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class PartNumberNode:
    id: strawberry.ID
    family_id: strawberry.ID = strawberry.field(name="familyId")
    family_name: str = strawberry.field(name="familyName")
    model_id: strawberry.ID = strawberry.field(name="modelId")
    model_name: str = strawberry.field(name="modelName")
    variant_id: typing.Optional[strawberry.ID] = strawberry.field(name="variantId", default=None)
    variant_name: typing.Optional[str] = strawberry.field(name="variantName", default=None)
    part_number: str = strawberry.field(name="partNumber")
    description: str
    revision: str
    uom: str
    status: str
    is_active: bool = strawberry.field(name="isActive")
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: PartNumber) -> "PartNumberNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            family_id=strawberry.ID(str(obj.family_id)),
            family_name=obj.family.name,
            model_id=strawberry.ID(str(obj.model_id)),
            model_name=obj.model.name,
            variant_id=strawberry.ID(str(obj.variant_id)) if obj.variant_id else None,
            variant_name=obj.variant.name if obj.variant_id else None,
            part_number=obj.part_number,
            description=obj.description,
            revision=obj.revision,
            uom=obj.uom,
            status=obj.status,
            is_active=obj.is_active,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ProcessFlowNode:
    id: strawberry.ID
    code: str
    name: str
    description: str
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId")
    part_number_id: typing.Optional[str] = strawberry.field(name="partNumberId")
    part_number: typing.Optional[str] = strawberry.field(name="partNumber")
    product_variant_id: typing.Optional[str] = strawberry.field(name="productVariantId", default=None)
    production_line_id: typing.Optional[str] = strawberry.field(name="productionLineId")
    version: str
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProcessFlow) -> "ProcessFlowNode":
        return cls(
            id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name,
            description=obj.description, status=obj.status,
            product_model_id=str(obj.product_model_id) if obj.product_model_id else None,
            part_number_id=str(obj.part_number_id) if obj.part_number_id else None,
            part_number=obj.part_number.part_number if obj.part_number_id else None,
            production_line_id=str(obj.production_line_id) if obj.production_line_id else None,
            version=obj.version,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class ProcessStepNode:
    id: strawberry.ID
    process_flow_id: strawberry.ID = strawberry.field(name="processFlowId")
    sequence: int
    name: str
    description: str
    entity_type: str = strawberry.field(name="entityType")
    entity_id: str = strawberry.field(name="entityId")
    lead_time_minutes: typing.Optional[float] = strawberry.field(name="leadTimeMinutes")
    status: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: ProcessStep) -> "ProcessStepNode":
        return cls(
            id=strawberry.ID(str(obj.id)), process_flow_id=strawberry.ID(str(obj.process_flow_id)),
            sequence=obj.sequence, name=obj.name, description=obj.description,
            entity_type=obj.entity_type, entity_id=obj.entity_id,
            lead_time_minutes=obj.lead_time_minutes,
            status=obj.status,
            created_at=_iso(obj.created_at), updated_at=_iso(obj.updated_at),
        )


# ── ProductionStructureTree (read model) ──


# ── Read-only summaries ──


# ── Mutation payloads ──


@strawberry.type
class ProductFamilyAssignmentPayload:
    ok: bool
    assignments: typing.Optional[list[ProductFamilyAssignmentNode]] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ProductModelAssignmentPayload:
    ok: bool
    assignments: typing.Optional[list[ProductModelAssignmentNode]] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ProductFamilyPayload:
    ok: bool
    family: typing.Optional[ProductFamilyNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ProductModelPayload:
    ok: bool
    model: typing.Optional[ProductModelNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class ProductVariantPayload:
    ok: bool
    variant: typing.Optional[ProductVariantNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class PartNumberPayload:
    ok: bool
    part_number: typing.Optional[PartNumberNode] = strawberry.field(name="partNumber", default=None)
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class BomPayload:
    ok: bool
    bom: typing.Optional["BOMNode"] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)


@strawberry.type
class PaginatedProductModelResponse:
    items: list[ProductModelNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedProductFamilyResponse:
    items: list[ProductFamilyNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedProductVariantResponse:
    items: list[ProductVariantNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedPartNumberResponse:
    items: list[PartNumberNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedProcessFlowResponse:
    items: list[ProcessFlowNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class PaginatedProcessStepResponse:
    items: list[ProcessStepNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


# ── Routing ──

@strawberry.type
class RoutingStepNode:
    id: strawberry.ID
    routing_id: strawberry.ID = strawberry.field(name="routingId")
    sequence: int
    department_id: typing.Optional[strawberry.ID] = strawberry.field(name="departmentId", default=None)
    department_name: typing.Optional[str] = strawberry.field(name="departmentName", default=None)
    resource_group_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceGroupId", default=None)
    resource_group_name: typing.Optional[str] = strawberry.field(name="resourceGroupName", default=None)
    resource_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceId", default=None)
    resource_name: typing.Optional[str] = strawberry.field(name="resourceName", default=None)
    standard_work_id: typing.Optional[strawberry.ID] = strawberry.field(name="standardWorkId", default=None)
    standard_work_name: typing.Optional[str] = strawberry.field(name="standardWorkName", default=None)
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")
    setup_time_sec: typing.Optional[float] = strawberry.field(name="setupTimeSec", default=0)
    changeover_time_sec: typing.Optional[float] = strawberry.field(name="changeoverTimeSec", default=0)
    required_operators: typing.Optional[int] = strawberry.field(name="requiredOperators", default=1)
    schedule_source: str = strawberry.field(name="scheduleSource")
    buffer_type: typing.Optional[str] = strawberry.field(name="bufferType", default=None)
    wip_min: typing.Optional[int] = strawberry.field(name="wipMin", default=None)
    wip_max: typing.Optional[int] = strawberry.field(name="wipMax", default=None)
    quality_checkpoint: bool = strawberry.field(name="qualityCheckpoint")
    rework_allowed: bool = strawberry.field(name="reworkAllowed")
    notes: str
    material_inputs: list["MaterialFlowItemNode"] = strawberry.field(name="materialInputs")
    material_outputs: list["MaterialFlowItemNode"] = strawberry.field(name="materialOutputs")
    movement_rule: typing.Optional["MaterialMovementRuleNode"] = strawberry.field(name="movementRule", default=None)
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: RoutingStep) -> "RoutingStepNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            routing_id=strawberry.ID(str(obj.routing_id)),
            sequence=obj.sequence,
            department_id=strawberry.ID(str(obj.department_id)) if obj.department_id else None,
            department_name=obj.department.name if obj.department else None,
            resource_group_id=strawberry.ID(str(obj.resource_group_id)) if obj.resource_group_id else None,
            resource_group_name=obj.resource_group.name if obj.resource_group else None,
            resource_id=strawberry.ID(str(obj.resource_id)) if obj.resource_id else None,
            resource_name=obj.resource.name if obj.resource else None,
            standard_work_id=strawberry.ID(str(obj.standard_work_id)) if obj.standard_work_id else None,
            standard_work_name=obj.standard_work.name if obj.standard_work else None,
            cycle_time_sec=obj.cycle_time_sec,
            setup_time_sec=obj.setup_time_sec,
            changeover_time_sec=obj.changeover_time_sec,
            required_operators=obj.required_operators,
            schedule_source=obj.schedule_source,
            buffer_type=obj.buffer_type,
            wip_min=obj.wip_min,
            wip_max=obj.wip_max,
            quality_checkpoint=obj.quality_checkpoint,
            rework_allowed=obj.rework_allowed,
            notes=obj.notes,
            material_inputs=[MaterialFlowItemNode.from_input(item) for item in obj.material_inputs.all()],
            material_outputs=[MaterialFlowItemNode.from_output(item) for item in obj.material_outputs.all()],
            movement_rule=MaterialMovementRuleNode.from_db(obj.material_movement_rule) if hasattr(obj, "material_movement_rule") else None,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class RoutingNode:
    id: strawberry.ID
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    production_line_name: str = strawberry.field(name="productionLineName")
    product_family_id: typing.Optional[strawberry.ID] = strawberry.field(name="productFamilyId", default=None)
    product_family_name: typing.Optional[str] = strawberry.field(name="productFamilyName", default=None)
    product_model_id: typing.Optional[strawberry.ID] = strawberry.field(name="productModelId", default=None)
    product_model_name: typing.Optional[str] = strawberry.field(name="productModelName", default=None)
    part_number_id: typing.Optional[strawberry.ID] = strawberry.field(name="partNumberId", default=None)
    part_number: typing.Optional[str] = strawberry.field(name="partNumber", default=None)
    part_description: typing.Optional[str] = strawberry.field(name="partDescription", default=None)
    product_variant_id: typing.Optional[strawberry.ID] = strawberry.field(name="productVariantId", default=None)
    version: str
    status: str
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    notes: str
    steps: list[RoutingStepNode]
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, obj: Routing, steps: typing.Optional[list[RoutingStep]] = None) -> "RoutingNode":
        step_nodes = [RoutingStepNode.from_db(s) for s in (steps or list(obj.steps.all().order_by("sequence")))]
        return cls(
            id=strawberry.ID(str(obj.id)),
            production_line_id=strawberry.ID(str(obj.production_line_id)),
            production_line_name=obj.production_line.name if obj.production_line else "",
            product_family_id=strawberry.ID(str(obj.product_family_id)) if obj.product_family_id else None,
            product_family_name=obj.product_family.name if obj.product_family_id else None,
            product_model_id=strawberry.ID(str(obj.product_model_id)) if obj.product_model_id else None,
            product_model_name=obj.product_model.name if obj.product_model else None,
            part_number_id=strawberry.ID(str(obj.part_number_id)) if obj.part_number_id else None,
            part_number=obj.part_number.part_number if obj.part_number_id else None,
            part_description=obj.part_number.description if obj.part_number_id else None,
            version=obj.version,
            status=obj.status,
            effective_from=obj.effective_from.isoformat() if obj.effective_from else None,
            effective_to=obj.effective_to.isoformat() if obj.effective_to else None,
            notes=obj.notes,
            steps=step_nodes,
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class RoutingSummaryNode:
    routing_id: typing.Optional[strawberry.ID] = strawberry.field(name="routingId", default=None)
    status: str
    version: typing.Optional[str] = None
    routing_scope: typing.Optional[str] = strawberry.field(name="routingScope", default=None)
    message: typing.Optional[str] = None
    sequence_count: int = strawberry.field(name="sequenceCount")
    first_department_name: typing.Optional[str] = strawberry.field(name="firstDepartmentName", default=None)
    last_department_name: typing.Optional[str] = strawberry.field(name="lastDepartmentName", default=None)
    bottleneck_step_name: typing.Optional[str] = strawberry.field(name="bottleneckStepName", default=None)
    bottleneck_resource_group_name: typing.Optional[str] = strawberry.field(name="bottleneckResourceGroupName", default=None)
    constraint_status: typing.Optional[str] = strawberry.field(name="constraintStatus", default=None)
    updated_at: typing.Optional[str] = strawberry.field(name="updatedAt", default=None)


@strawberry.type
class FlowValidationMessageNode:
    field: str
    code: str
    message: str

    @classmethod
    def from_dict(cls, item: dict) -> "FlowValidationMessageNode":
        return cls(field=item.get("field", "_form"), code=item.get("code", "VALIDATION"), message=item.get("message", "Validation issue"))


@strawberry.type
class InventoryLocationNode:
    id: strawberry.ID
    code: str
    name: str
    location_type: str = strawberry.field(name="locationType")
    status: str

    @classmethod
    def from_db(cls, obj: InventoryLocation) -> "InventoryLocationNode":
        return cls(id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name, location_type=obj.location_type, status=obj.status)


@strawberry.type
class MaterialNode:
    id: strawberry.ID
    code: str
    name: str
    material_state: str = strawberry.field(name="materialState")
    status: str

    @classmethod
    def from_db(cls, obj: Material) -> "MaterialNode":
        return cls(id=strawberry.ID(str(obj.id)), code=obj.code, name=obj.name, material_state=obj.material_state, status=obj.status)


@strawberry.type
class MaterialFlowItemNode:
    id: strawberry.ID
    material_id: strawberry.ID = strawberry.field(name="materialId")
    material_code: str = strawberry.field(name="materialCode")
    material_name: str = strawberry.field(name="materialName")
    quantity: float
    material_state: str = strawberry.field(name="materialState")
    location_id: typing.Optional[strawberry.ID] = strawberry.field(name="locationId", default=None)
    location_name: typing.Optional[str] = strawberry.field(name="locationName", default=None)
    bin_id: typing.Optional[strawberry.ID] = strawberry.field(name="binId", default=None)
    bin_code: typing.Optional[str] = strawberry.field(name="binCode", default=None)
    bin_name: typing.Optional[str] = strawberry.field(name="binName", default=None)

    @classmethod
    def from_input(cls, obj: OperationInput) -> "MaterialFlowItemNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            material_id=strawberry.ID(str(obj.material_id)),
            material_code=obj.material.code,
            material_name=obj.material.name,
            quantity=obj.quantity,
            material_state=obj.material_state,
            location_id=strawberry.ID(str(obj.source_location_id)) if obj.source_location_id else None,
            location_name=obj.source_location.name if obj.source_location else None,
            bin_id=strawberry.ID(str(obj.source_bin_id)) if obj.source_bin_id else None,
            bin_code=obj.source_bin.code if obj.source_bin_id else None,
            bin_name=obj.source_bin.name if obj.source_bin_id else None,
        )

    @classmethod
    def from_output(cls, obj: OperationOutput) -> "MaterialFlowItemNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            material_id=strawberry.ID(str(obj.material_id)),
            material_code=obj.material.code,
            material_name=obj.material.name,
            quantity=obj.quantity,
            material_state=obj.material_state,
            location_id=strawberry.ID(str(obj.target_location_id)) if obj.target_location_id else None,
            location_name=obj.target_location.name if obj.target_location else None,
            bin_id=strawberry.ID(str(obj.destination_bin_id)) if obj.destination_bin_id else None,
            bin_code=obj.destination_bin.code if obj.destination_bin_id else None,
            bin_name=obj.destination_bin.name if obj.destination_bin_id else None,
        )


@strawberry.type
class MaterialMovementRuleNode:
    id: strawberry.ID
    rule_type: str = strawberry.field(name="ruleType")
    source_location_id: typing.Optional[strawberry.ID] = strawberry.field(name="sourceLocationId", default=None)
    source_location_name: typing.Optional[str] = strawberry.field(name="sourceLocationName", default=None)
    destination_location_id: typing.Optional[strawberry.ID] = strawberry.field(name="destinationLocationId", default=None)
    destination_location_name: typing.Optional[str] = strawberry.field(name="destinationLocationName", default=None)
    source_bin_id: typing.Optional[strawberry.ID] = strawberry.field(name="sourceBinId", default=None)
    source_bin_name: typing.Optional[str] = strawberry.field(name="sourceBinName", default=None)
    destination_bin_id: typing.Optional[strawberry.ID] = strawberry.field(name="destinationBinId", default=None)
    destination_bin_name: typing.Optional[str] = strawberry.field(name="destinationBinName", default=None)
    notes: str

    @classmethod
    def from_db(cls, obj: MaterialMovementRule) -> "MaterialMovementRuleNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            rule_type=obj.rule_type,
            source_location_id=strawberry.ID(str(obj.source_location_id)) if obj.source_location_id else None,
            source_location_name=obj.source_location.name if obj.source_location else None,
            destination_location_id=strawberry.ID(str(obj.destination_location_id)) if obj.destination_location_id else None,
            destination_location_name=obj.destination_location.name if obj.destination_location else None,
            source_bin_id=strawberry.ID(str(obj.source_bin_id)) if obj.source_bin_id else None,
            source_bin_name=obj.source_bin.name if obj.source_bin_id else None,
            destination_bin_id=strawberry.ID(str(obj.destination_bin_id)) if obj.destination_bin_id else None,
            destination_bin_name=obj.destination_bin.name if obj.destination_bin_id else None,
            notes=obj.notes,
        )


@strawberry.type
class ProcessFlowOperationNode:
    sequence: int
    department_name: typing.Optional[str] = strawberry.field(name="departmentName", default=None)
    resource_group_id: typing.Optional[strawberry.ID] = strawberry.field(name="resourceGroupId", default=None)
    resource_group_name: typing.Optional[str] = strawberry.field(name="resourceGroupName", default=None)
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")
    inputs: list[MaterialFlowItemNode]
    outputs: list[MaterialFlowItemNode]

    @classmethod
    def from_step(cls, obj: RoutingStep) -> "ProcessFlowOperationNode":
        return cls(
            sequence=obj.sequence,
            department_name=obj.department.name if obj.department else None,
            resource_group_id=strawberry.ID(str(obj.resource_group_id)) if obj.resource_group_id else None,
            resource_group_name=obj.resource_group.name if obj.resource_group else None,
            cycle_time_sec=obj.cycle_time_sec,
            inputs=[MaterialFlowItemNode.from_input(item) for item in obj.material_inputs.all()],
            outputs=[MaterialFlowItemNode.from_output(item) for item in obj.material_outputs.all()],
        )


@strawberry.type
class BOMItemNode:
    material_id: strawberry.ID = strawberry.field(name="materialId")
    material_code: str = strawberry.field(name="materialCode")
    material_name: str = strawberry.field(name="materialName")
    quantity: float
    scrap_factor: float = strawberry.field(name="scrapFactor")

    @classmethod
    def from_db(cls, obj: BOMItem) -> "BOMItemNode":
        return cls(
            material_id=strawberry.ID(str(obj.material_id)),
            material_code=obj.material.code,
            material_name=obj.material.name,
            quantity=obj.quantity,
            scrap_factor=obj.scrap_factor,
        )


@strawberry.type
class BOMNode:
    id: strawberry.ID
    product_model_id: strawberry.ID = strawberry.field(name="productModelId")
    part_number_id: typing.Optional[strawberry.ID] = strawberry.field(name="partNumberId", default=None)
    part_number: typing.Optional[str] = strawberry.field(name="partNumber", default=None)
    product_variant_id: typing.Optional[strawberry.ID] = strawberry.field(name="productVariantId", default=None)
    version: str
    status: str
    notes: str = ""
    item_count: int = strawberry.field(name="itemCount", default=0)
    items: list[BOMItemNode]
    created_at: str = strawberry.field(name="createdAt", default="")
    updated_at: str = strawberry.field(name="updatedAt", default="")

    @classmethod
    def from_db(cls, obj: BOM) -> "BOMNode":
        return cls(
            id=strawberry.ID(str(obj.id)),
            product_model_id=strawberry.ID(str(obj.product_model_id)),
            part_number_id=strawberry.ID(str(obj.part_number_id)) if obj.part_number_id else None,
            part_number=obj.part_number.part_number if obj.part_number_id else None,
            version=obj.version,
            status=obj.status,
            notes=obj.notes or "",
            item_count=obj.items.count() if hasattr(obj, "items") else 0,
            items=[BOMItemNode.from_db(item) for item in obj.items.all()],
            created_at=_iso(obj.created_at),
            updated_at=_iso(obj.updated_at),
        )


@strawberry.type
class PaginatedBOMResponse:
    items: list[BOMNode]
    total: int
    has_more: bool = strawberry.field(name="hasMore")


@strawberry.type
class ProductionLineFlowContextNode:
    ok: bool
    message: typing.Optional[str] = None
    is_blocked: bool = strawberry.field(name="isBlocked", default=False)
    routing: typing.Optional[RoutingNode] = None
    operations: list[ProcessFlowOperationNode] = strawberry.field(default_factory=list)
    bom: typing.Optional[BOMNode] = None
    inventory_locations: list[InventoryLocationNode] = strawberry.field(name="inventoryLocations", default_factory=list)
    validations: list[FlowValidationMessageNode] = strawberry.field(default_factory=list)

    @classmethod
    def from_service(cls, data: dict) -> "ProductionLineFlowContextNode":
        routing = data.get("routing")
        return cls(
            ok=data.get("ok", False),
            message=data.get("message"),
            is_blocked=data.get("is_blocked", False),
            routing=RoutingNode.from_db(routing) if routing else None,
            operations=[ProcessFlowOperationNode.from_step(step) for step in routing.steps.all().order_by("sequence")] if routing else [],
            bom=BOMNode.from_db(data["bom"]) if data.get("bom") else None,
            inventory_locations=[InventoryLocationNode.from_db(location) for location in data.get("inventory_locations", [])],
            validations=[FlowValidationMessageNode.from_dict(item) for item in data.get("validations", [])],
        )


@strawberry.type
class RoutingPayload:
    ok: bool
    routing: typing.Optional[RoutingNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class RoutingStepPayload:
    ok: bool
    step: typing.Optional[RoutingStepNode] = None
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class RoutingListPayload:
    ok: bool
    routings: list[RoutingNode] = strawberry.field(name="routings", default_factory=list)
    errors: typing.Optional[list[MutationError]] = None


@strawberry.type
class StepCapacityNode:
    sequence: int
    department_name: typing.Optional[str] = strawberry.field(name="departmentName", default=None)
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")
    available_time_sec: float = strawberry.field(name="availableTimeSec")
    demand_units: int = strawberry.field(name="demandUnits")
    takt_time_sec: float = strawberry.field(name="taktTimeSec")
    capacity_units: float = strawberry.field(name="capacityUnits")
    load_percent: float = strawberry.field(name="loadPercent")
    capacity_gap_units: float = strawberry.field(name="capacityGapUnits")
    is_bottleneck: bool = strawberry.field(name="isBottleneck")


@strawberry.type
class YamazumiStepNode:
    sequence: int
    department_name: typing.Optional[str] = strawberry.field(name="departmentName", default=None)
    resource_group_name: typing.Optional[str] = strawberry.field(name="resourceGroupName", default=None)
    resource_name: typing.Optional[str] = strawberry.field(name="resourceName", default=None)
    standard_work_name: typing.Optional[str] = strawberry.field(name="standardWorkName", default=None)
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")
    setup_time_sec: float = strawberry.field(name="setupTimeSec")
    changeover_time_sec: float = strawberry.field(name="changeoverTimeSec")
    work_content_sec: float = strawberry.field(name="workContentSec")
    takt_time_sec: float = strawberry.field(name="taktTimeSec")
    load_percent: float = strawberry.field(name="loadPercent")
    required_operators: int = strawberry.field(name="requiredOperators")
    is_bottleneck: bool = strawberry.field(name="isBottleneck")
    is_overloaded: bool = strawberry.field(name="isOverloaded")


@strawberry.type
class YamazumiAnalysisNode:
    ok: bool
    message: str
    routing_id: typing.Optional[strawberry.ID] = strawberry.field(name="routingId", default=None)
    routing_status: str = strawberry.field(name="routingStatus", default="")
    routing_version: str = strawberry.field(name="routingVersion", default="")
    production_line_id: typing.Optional[strawberry.ID] = strawberry.field(name="productionLineId", default=None)
    product_model_id: typing.Optional[strawberry.ID] = strawberry.field(name="productModelId", default=None)
    planned_quantity: int = strawberry.field(name="plannedQuantity")
    net_available_time_sec: float = strawberry.field(name="netAvailableTimeSec")
    takt_time_sec: float = strawberry.field(name="taktTimeSec")
    total_work_content_sec: float = strawberry.field(name="totalWorkContentSec")
    bottleneck_step_name: str = strawberry.field(name="bottleneckStepName", default="")
    balance_loss_percent: float = strawberry.field(name="balanceLossPercent")
    operators_required: int = strawberry.field(name="operatorsRequired")
    overloaded_resources: list[str] = strawberry.field(name="overloadedResources", default_factory=list)
    steps: list[YamazumiStepNode] = strawberry.field(default_factory=list)
    capacity_source: str = strawberry.field(name="capacitySource", default="")

