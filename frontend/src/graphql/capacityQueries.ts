import { gql } from "@apollo/client";

const CAPACITY_PLAN_FIELDS = `
  id
  plantId
  plantName
  productionLineId
  productionLineName
  productModelId
  productModelName
  routingVersionId
  routingVersion
  planningHorizonStart
  planningHorizonEnd
  status
  createdByName
  updatedByName
  calculatedAt
  approvedAt
  createdAt
  updatedAt
  inputs {
    id
    capacityPlanId
    plannedQuantity
    availableTimeMinutes
    breakTimeMinutes
    plannedDowntimeMinutes
    netAvailableTimeMinutes
    operatorsAvailable
    efficiencyFactor
    taktTimeSeconds
  }
  result {
    id
    capacityPlanId
    totalWorkContentSeconds
    requiredCapacityMinutes
    availableCapacityMinutes
    capacityUtilizationPercent
    bottleneckStepId
    bottleneckStepName
    bottleneckResourceId
    bottleneckResourceName
    balanceLossPercent
    operatorsRequired
    feasibilityStatus
    warnings { message }
    loadRows {
      level
      area
      availableCapacityMinutes
      requiredCapacityMinutes
      utilizationPercent
      gapMinutes
      status
    }
    yamazumi {
      metric
      taktTimeSeconds
      balanceLossPercent
      items {
        stepId
        sequence
        departmentName
        resourceGroupName
        resourceName
        standardWorkName
        operator
        cycleTimeSeconds
        manualTimeSeconds
        autoTimeSeconds
        setupInclusiveSeconds
        workContentSeconds
        taktTimeSeconds
        loadPercent
        isBottleneck
        isOverloaded
      }
    }
    constraints {
      severity
      source
      type
      message
      affected
      recommendedAction
      action
    }
  }
  warnings { message }
  constraints {
    severity
    source
    type
    message
    affected
    recommendedAction
    action
  }
`;

export const CAPACITY_PLANS_QUERY = gql`
  query CapacityPlans($plantId: String, $productionLineId: String, $productModelId: String, $status: String) {
    capacityPlans(plantId: $plantId, productionLineId: $productionLineId, productModelId: $productModelId, status: $status) {
      ${CAPACITY_PLAN_FIELDS}
    }
  }
`;

export const CAPACITY_PLAN_DETAIL_QUERY = gql`
  query CapacityPlanDetail($id: String!) {
    capacityPlanDetail(id: $id) {
      ${CAPACITY_PLAN_FIELDS}
    }
  }
`;

export const CAPACITY_SCENARIOS_QUERY = gql`
  query CapacityScenarios($capacityPlanId: String!) {
    capacityScenarios(capacityPlanId: $capacityPlanId) {
      id
      capacityPlanId
      name
      assumptionsJson
      resultJson
      isBaseline
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_CAPACITY_PLAN_MUTATION = gql`
  mutation CreateCapacityPlan($input: CapacityPlanCreateInput!) {
    createCapacityPlan(input: $input) {
      ok
      plan { ${CAPACITY_PLAN_FIELDS} }
      errors { field code message }
    }
  }
`;

export const UPDATE_CAPACITY_PLAN_INPUT_MUTATION = gql`
  mutation UpdateCapacityPlanInput($input: CapacityPlanInputUpdateInput!) {
    updateCapacityPlanInput(input: $input) {
      ok
      plan { ${CAPACITY_PLAN_FIELDS} }
      errors { field code message }
    }
  }
`;

export const CALCULATE_CAPACITY_PLAN_MUTATION = gql`
  mutation CalculateCapacityPlan($id: String!) {
    calculateCapacityPlan(id: $id) {
      ok
      plan { ${CAPACITY_PLAN_FIELDS} }
      errors { field code message }
    }
  }
`;

export const CREATE_CAPACITY_SCENARIO_MUTATION = gql`
  mutation CreateCapacityScenario($input: CapacityScenarioInput!) {
    createCapacityScenario(input: $input) {
      ok
      scenario {
        id
        capacityPlanId
        name
        assumptionsJson
        resultJson
        isBaseline
        createdAt
        updatedAt
      }
      errors { field code message }
    }
  }
`;

export const APPROVE_CAPACITY_PLAN_MUTATION = gql`
  mutation ApproveCapacityPlan($id: String!) {
    approveCapacityPlan(id: $id) {
      ok
      plan { ${CAPACITY_PLAN_FIELDS} }
      errors { field code message }
    }
  }
`;

export const ARCHIVE_CAPACITY_PLAN_MUTATION = gql`
  mutation ArchiveCapacityPlan($id: String!) {
    archiveCapacityPlan(id: $id) {
      ok
      plan { ${CAPACITY_PLAN_FIELDS} }
      errors { field code message }
    }
  }
`;
