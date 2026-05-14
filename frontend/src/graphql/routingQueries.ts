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
  createdAt
  updatedAt
`;

const ROUTING_FIELDS = `
  id
  productionLineId
  productionLineName
  productFamilyId
  productFamilyName
  productModelId
  productModelName
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
