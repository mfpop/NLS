import { gql } from "@apollo/client";

const ROUTING_STEP_FIELDS = `
  id
  routingId
  sequence
  departmentId
  departmentName
  resourceGroupId
  resourceGroupName
  resourceId
  resourceName
  standardWorkId
  standardWorkName
  cycleTimeSec
  setupTimeSec
  changeoverTimeSec
  requiredOperators
  scheduleSource
  bufferType
  wipMin
  wipMax
  qualityCheckpoint
  reworkAllowed
  notes
  materialInputs {
    id
    materialId
    materialCode
    materialName
    quantity
    materialState
    locationId
    locationName
    binId
    binCode
    binName
  }
  materialOutputs {
    id
    materialId
    materialCode
    materialName
    quantity
    materialState
    locationId
    locationName
    binId
    binCode
    binName
  }
  movementRule {
    id
    ruleType
    sourceLocationId
    sourceLocationName
    destinationLocationId
    destinationLocationName
    sourceBinId
    sourceBinName
    destinationBinId
    destinationBinName
    notes
  }
  createdAt
  updatedAt
`;

export const MATERIALS_QUERY = gql`
  query Materials($status: String, $limit: Int, $offset: Int) {
    materials(status: $status, limit: $limit, offset: $offset) {
      id
      code
      name
      materialState
      status
    }
  }
`;

export const INVENTORY_LOCATIONS_QUERY = gql`
  query InventoryLocations($plantId: String, $status: String, $limit: Int, $offset: Int) {
    inventoryLocations(plantId: $plantId, status: $status, limit: $limit, offset: $offset) {
      id
      code
      name
      locationType
      status
    }
  }
`;

export const MATERIAL_BINS_QUERY = gql`
  query MaterialBins($plantId: String, $warehouseCode: String, $productionLineId: String, $resourceGroupId: String, $binType: String, $replenishmentMode: String, $isActive: Boolean, $search: String, $limit: Int, $offset: Int) {
    materialBins(plantId: $plantId, warehouseCode: $warehouseCode, productionLineId: $productionLineId, resourceGroupId: $resourceGroupId, binType: $binType, replenishmentMode: $replenishmentMode, isActive: $isActive, search: $search, limit: $limit, offset: $offset) {
      id
      plantId
      plantName
      productionLineId
      productionLineName
      resourceGroupId
      resourceGroupName
      code
      name
      description
      binType
      materialId
      materialCode
      materialName
      materialGroup
      capacity
      uomId
      uomName
      replenishmentMode
      fifoEnabled
      supermarketEnabled
      locationCode
      locationReference
      warehouseCode
      isActive
      createdAt
      updatedAt
    }
  }
`;

const ROUTING_FIELDS = `
  id
  productionLineId
  productionLineName
  productFamilyId
  productFamilyName
  productModelId
  productModelName
  partNumberId
  partNumber
  partDescription
  productVariantId
  version
  status
  effectiveFrom
  effectiveTo
  notes
  createdAt
  updatedAt
  steps {
    ${ROUTING_STEP_FIELDS}
  }
`;

export const PRODUCTION_LINE_ROUTING_SUMMARY_QUERY = gql`
  query ProductionLineRoutingSummary($productionLineId: String!) {
    productionLineRoutingSummary(productionLineId: $productionLineId) {
      routingId
      status
      version
      routingScope
      message
      sequenceCount
      firstDepartmentName
      lastDepartmentName
      bottleneckStepName
      bottleneckResourceGroupName
      constraintStatus
      updatedAt
    }
  }
`;

export const ROUTINGS_QUERY = gql`
  query Routings($productionLineId: String, $productModelId: String, $productFamilyId: String, $limit: Int, $offset: Int) {
    routings(productionLineId: $productionLineId, productModelId: $productModelId, productFamilyId: $productFamilyId, limit: $limit, offset: $offset) {
      ${ROUTING_FIELDS}
    }
  }
`;

export const ROUTING_QUERY = gql`
  query Routing($id: String!) {
    routing(id: $id) {
      ${ROUTING_FIELDS}
    }
  }
`;

export const ROUTING_STEP_CAPACITIES_QUERY = gql`
  query RoutingStepCapacities($routingId: String!, $demand: Int, $availableHours: Float) {
    routingStepCapacities(routingId: $routingId, demand: $demand, availableHours: $availableHours) {
      sequence
      departmentName
      cycleTimeSec
      availableTimeSec
      demandUnits
      taktTimeSec
      capacityUnits
      loadPercent
      capacityGapUnits
      isBottleneck
    }
  }
`;

export const YAMAZUMI_ANALYSIS_QUERY = gql`
  query YamazumiAnalysis(
    $routingId: String!
    $plannedQuantity: Int!
    $availableTimeMin: Float!
    $breakTimeMin: Float
    $downtimeMin: Float
    $operators: Int
  ) {
    yamazumiAnalysis(
      routingId: $routingId
      plannedQuantity: $plannedQuantity
      availableTimeMin: $availableTimeMin
      breakTimeMin: $breakTimeMin
      downtimeMin: $downtimeMin
      operators: $operators
    ) {
      ok
      message
      routingId
      routingStatus
      routingVersion
      productionLineId
      productModelId
      plannedQuantity
      netAvailableTimeSec
      taktTimeSec
      totalWorkContentSec
      bottleneckStepName
      balanceLossPercent
      operatorsRequired
      overloadedResources
      steps {
        sequence
        departmentName
        resourceGroupName
        resourceName
        standardWorkName
        cycleTimeSec
        setupTimeSec
        changeoverTimeSec
        workContentSec
        taktTimeSec
        loadPercent
        requiredOperators
        isBottleneck
        isOverloaded
      }
    }
  }
`;

export const CREATE_ROUTING_MUTATION = gql`
  mutation CreateRouting($input: RoutingInput!) {
    createRouting(input: $input) {
      ok
      routing {
        ${ROUTING_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_ROUTING_MUTATION = gql`
  mutation UpdateRouting($id: String!, $input: RoutingInput!) {
    updateRouting(id: $id, input: $input) {
      ok
      routing {
        ${ROUTING_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ACTIVATE_ROUTING_MUTATION = gql`
  mutation ActivateRouting($id: String!) {
    activateRouting(id: $id) {
      ok
      routing {
        ${ROUTING_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ARCHIVE_ROUTING_MUTATION = gql`
  mutation ArchiveRouting($id: String!) {
    archiveRouting(id: $id) {
      ok
      routing {
        ${ROUTING_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const SAVE_ROUTING_MUTATION = gql`
  mutation SaveRouting($input: SaveRoutingInput!) {
    saveRouting(input: $input) {
      ok
      routing {
        ${ROUTING_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_ROUTING_STEP_MUTATION = gql`
  mutation CreateRoutingStep($input: RoutingStepInput!) {
    createRoutingStep(input: $input) {
      ok
      step {
        ${ROUTING_STEP_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_ROUTING_STEP_MUTATION = gql`
  mutation UpdateRoutingStep($id: String!, $input: RoutingStepInput!) {
    updateRoutingStep(id: $id, input: $input) {
      ok
      step {
        ${ROUTING_STEP_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const DELETE_ROUTING_STEP_MUTATION = gql`
  mutation DeleteRoutingStep($id: String!) {
    deleteRoutingStep(id: $id) {
      ok
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REORDER_ROUTING_STEPS_MUTATION = gql`
  mutation ReorderRoutingSteps($input: ReorderStepsInput!) {
    reorderRoutingSteps(input: $input) {
      ok
      errors {
        field
        code
        message
      }
    }
  }
`;
