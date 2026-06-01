from .entity_status import EntityStatus
from .company import Company
from .plant import Plant
from .department import Department
from .production_line import ProductionLine, ProductionLineProductFamily, ProductionLineProductModel
from .assignment import ProductionLineDepartmentAssignment
from .resource_group import ResourceGroup
from .production_line_resource_group import ProductionLineResourceGroup
from .resource import Resource
from .scheduling import Schedule, Shift, ScheduleAssignment
from .reference import ReferenceCategory, ReferenceValue, ResourceType, VisualIdentity
from .routing import (
    ProductFamily, ProductModel, ProductVariant, PartNumber,
    ProcessFlow, ProcessStep, Routing, RoutingStep, RoutingStatus, ScheduleSource,
    Material, MaterialState, BOM, BOMItem, InventoryLocation, InventoryLocationType,
    MaterialBin, MaterialBinType, ReplenishmentMode, Warehouse,
    OperationInput, OperationOutput, MaterialMovementRule, MaterialMovementRuleType,
    MaterialMovement, MaterialMovementType,
)
from .capacity import (
    CapacityPlan, CapacityPlanInput, CapacityPlanResult, CapacityScenario,
    CapacityPlanStatus, FeasibilityStatus,
)
from .capacity import (
    CapacityConstraintReason, CapacityMode, CapacitySnapshotStatus, CapacitySnapshotType, ScheduleScope,
    WorkSchedule, WorkShift,
    CapacityProfile, CapacitySnapshot, CapacityRecalculationJob,
    LaborRequirement, OperatorAssignment,
)
from .profile import Profile
from .role import UserRole

from .integration import ImportJob, ImportValidationError, MappingRule, ImportCompareResult, ImportAuditLog
from .mapping_profile import ImportProfile, ImportFieldMapping
from .lineage import (
    ErpSourceDefinition, ErpDefinitionField, ErpRelationshipDefinition,
    ErpImportBatch, ErpStagingRow, ErpValidationResult, ErpImportLog,
    ErpScope, ErpSourceType, ErpDefinitionStatus,
    ErpRelationshipType, ValidationSeverity,
)

# Legacy models (keep for migration compatibility)
from .reference_table import ReferenceTable
from .reference_item import ReferenceItem
from .config_option import ConfigOption
from .structure_document import StructureDocument, DocumentType, TargetType, DocumentStatus, LifecycleAction, StructureDocumentRevisionHistory, StructureDocumentAuditTrail

__all__ = [
    "EntityStatus",
    "Company",
    "Plant",
    "Department",
    "ProductionLine",
    "ProductionLineDepartmentAssignment",
    "ProductionLineProductFamily",
    "ProductionLineProductModel",
    "ResourceGroup",
    "Resource",
    "Schedule",
    "Shift",
    "ScheduleAssignment",
    "ReferenceCategory",
    "ReferenceValue",
    "ResourceType",
    "VisualIdentity",
    "ProductModel",
    "ProductFamily",
    "ProductVariant",
    "PartNumber",
    "ProcessFlow",
    "ProcessStep",
    "Routing",
    "RoutingStep",
    "RoutingStatus",
    "ScheduleSource",
    "Material",
    "MaterialState",
    "BOM",
    "BOMItem",
    "InventoryLocation",
    "InventoryLocationType",
    "MaterialBin",
    "MaterialBinType",
    "ReplenishmentMode",
    "Warehouse",
    "OperationInput",
    "OperationOutput",
    "MaterialMovementRule",
    "MaterialMovementRuleType",
    "MaterialMovement",
    "MaterialMovementType",
    "CapacityPlan",
    "CapacityPlanInput",
    "CapacityPlanResult",
    "CapacityScenario",
    "CapacityPlanStatus",
    "FeasibilityStatus",
    "CapacityConstraintReason",
    "CapacityMode",
    "CapacitySnapshotStatus",
    "CapacitySnapshotType",
    "ScheduleScope",
    "WorkSchedule",
    "WorkShift",
    "CapacityProfile",
    "CapacitySnapshot",
    "CapacityRecalculationJob",
    "LaborRequirement",
    "OperatorAssignment",
    "Profile",
    "UserRole",
    # Integration
    "ImportJob",
    "ImportValidationError",
    "MappingRule",
    # Lineage
    "ErpSourceDefinition",
    "ErpDefinitionField",
    "ErpRelationshipDefinition",
    "ErpImportBatch",
    "ErpStagingRow",
    "ErpValidationResult",
    "ErpImportLog",
    "ErpScope",
    "ErpSourceType",
    "ErpDefinitionStatus",
    "ErpRelationshipType",
    "ValidationSeverity",
    # Legacy
    "ReferenceTable",
    "ReferenceItem",
    "ConfigOption",
    # Document / Standard Framework
    "StructureDocument",
    "DocumentType",
    "TargetType",
    "DocumentStatus",
    "LifecycleAction",
    "StructureDocumentRevisionHistory",
    "StructureDocumentAuditTrail",
]