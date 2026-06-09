"""GraphQL inputs for product master entities.

ProductFamily, ProductModel, ProductVariant, PartNumber, BOM,
Routing, RoutingStep, and material flow inputs.
"""

import typing
import strawberry


# ── Product Identity ──

@strawberry.input
class ProductFamilyInput:
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=True)


@strawberry.input
class ProductModelInput:
    family_id: str = strawberry.field(name="familyId")
    code: str
    name: str
    description: typing.Optional[str] = ""
    status: typing.Optional[str] = "ACTIVE"


@strawberry.input
class ProductVariantInput:
    model_id: str = strawberry.field(name="modelId")
    code: str
    name: str
    configuration_summary: typing.Optional[str] = strawberry.field(name="configurationSummary", default="")
    part_number: typing.Optional[str] = strawberry.field(name="partNumber", default=None)
    status: typing.Optional[str] = "ACTIVE"
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=True)


@strawberry.input
class PartNumberInput:
    family_id: str = strawberry.field(name="familyId")
    model_id: str = strawberry.field(name="modelId")
    variant_id: typing.Optional[str] = strawberry.field(name="variantId", default=None)
    part_number: str = strawberry.field(name="partNumber")
    description: typing.Optional[str] = ""
    revision: typing.Optional[str] = ""
    uom: typing.Optional[str] = "EA"
    status: typing.Optional[str] = "ACTIVE"
    is_active: typing.Optional[bool] = strawberry.field(name="isActive", default=True)


# ── BOM ──

@strawberry.input
class BomInput:
    part_number_id: typing.Optional[str] = strawberry.field(name="partNumberId", default=None)
    product_variant_id: typing.Optional[str] = strawberry.field(name="productVariantId", default=None)
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId", default=None)
    version: typing.Optional[str] = "1.0"
    status: typing.Optional[str] = "DRAFT"
    notes: typing.Optional[str] = ""


# ── Routing ──

@strawberry.input
class RoutingInput:
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    product_family_id: typing.Optional[str] = strawberry.field(name="productFamilyId", default=None)
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId", default=None)
    part_number_id: typing.Optional[str] = strawberry.field(name="partNumberId", default=None)
    product_variant_id: typing.Optional[str] = strawberry.field(name="productVariantId", default=None)
    version: typing.Optional[str] = "1.0"
    status: typing.Optional[str] = "DRAFT"
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)
    notes: typing.Optional[str] = ""


@strawberry.input
class OperationMaterialInput:
    id: typing.Optional[str] = strawberry.field(default=None)
    material_id: typing.Optional[str] = strawberry.field(name="materialId", default=None)
    quantity: float = 1
    material_state: typing.Optional[str] = strawberry.field(name="materialState", default=None)
    location_id: typing.Optional[str] = strawberry.field(name="locationId", default=None)
    bin_id: typing.Optional[str] = strawberry.field(name="binId", default=None)


@strawberry.input
class MaterialMovementRuleInput:
    rule_type: typing.Optional[str] = strawberry.field(name="ruleType", default=None)
    source_location_id: typing.Optional[str] = strawberry.field(name="sourceLocationId", default=None)
    destination_location_id: typing.Optional[str] = strawberry.field(name="destinationLocationId", default=None)
    source_bin_id: typing.Optional[str] = strawberry.field(name="sourceBinId", default=None)
    destination_bin_id: typing.Optional[str] = strawberry.field(name="destinationBinId", default=None)
    notes: typing.Optional[str] = ""


@strawberry.input
class RoutingStepInput:
    id: typing.Optional[str] = strawberry.field(default=None)
    routing_id: typing.Optional[strawberry.ID] = strawberry.field(name="routingId", default=None)
    sequence: int
    department_id: typing.Optional[str] = strawberry.field(name="departmentId", default=None)
    resource_group_id: typing.Optional[str] = strawberry.field(name="resourceGroupId", default=None)
    resource_id: typing.Optional[str] = strawberry.field(name="resourceId", default=None)
    standard_work_id: typing.Optional[str] = strawberry.field(name="standardWorkId", default=None)
    cycle_time_sec: float = strawberry.field(name="cycleTimeSec")
    setup_time_sec: typing.Optional[float] = strawberry.field(name="setupTimeSec", default=0)
    changeover_time_sec: typing.Optional[float] = strawberry.field(name="changeoverTimeSec", default=0)
    required_operators: typing.Optional[int] = strawberry.field(name="requiredOperators", default=1)
    schedule_source: typing.Optional[str] = strawberry.field(name="scheduleSource", default="LINE")
    buffer_type: typing.Optional[str] = strawberry.field(name="bufferType", default=None)
    wip_min: typing.Optional[int] = strawberry.field(name="wipMin", default=None)
    wip_max: typing.Optional[int] = strawberry.field(name="wipMax", default=None)
    quality_checkpoint: typing.Optional[bool] = strawberry.field(name="qualityCheckpoint", default=False)
    rework_allowed: typing.Optional[bool] = strawberry.field(name="reworkAllowed", default=False)
    notes: typing.Optional[str] = ""
    material_inputs: list[OperationMaterialInput] = strawberry.field(name="materialInputs", default_factory=list)
    material_outputs: list[OperationMaterialInput] = strawberry.field(name="materialOutputs", default_factory=list)
    movement_rule: typing.Optional[MaterialMovementRuleInput] = strawberry.field(name="movementRule", default=None)


@strawberry.input
class ReorderStepsInput:
    routing_id: strawberry.ID = strawberry.field(name="routingId")
    ordered_step_ids: list[str] = strawberry.field(name="orderedStepIds")


@strawberry.input
class SaveRoutingInput:
    routing_id: typing.Optional[strawberry.ID] = strawberry.field(name="routingId", default=None)
    production_line_id: strawberry.ID = strawberry.field(name="productionLineId")
    product_family_id: typing.Optional[str] = strawberry.field(name="productFamilyId", default=None)
    product_model_id: typing.Optional[str] = strawberry.field(name="productModelId", default=None)
    part_number_id: typing.Optional[str] = strawberry.field(name="partNumberId", default=None)
    product_variant_id: typing.Optional[str] = strawberry.field(name="productVariantId", default=None)
    version: typing.Optional[str] = "1.0"
    notes: typing.Optional[str] = ""
    steps: list[RoutingStepInput]
