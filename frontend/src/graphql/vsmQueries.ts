import { gql } from "@apollo/client";

// ── Existing derived diagram query ──

export const VSM_DIAGRAM_QUERY = gql`
  query VsmDiagram($lineId: String!, $productVariantCode: String) {
    vsmDiagram(lineId: $lineId, productVariantCode: $productVariantCode) {
      lineId
      lineName
      productName
      processNodes {
        id
        sequence
        label
        resourceGroupName
        cycleTimeSeconds
        changeoverSeconds
        uptimePercent
        operatorCount
        wipBefore
        wipAfter
        defectRate
        isBottleneck
        isPacemaker
        isActive
      }
      inventoryNodes {
        id
        label
        type
        quantity
        daysOfInventory
      }
      flowLinks {
        id
        fromId
        toId
        type
        label
        deliveryFrequency
      }
      informationFlows {
        id
        fromId
        toId
        label
        frequency
        flowStyle
        method
        transmissionType
        triggerType
        controlledProcessId
        notes
      }
      productionControl {
        id
        label
        schedulingType
        schedulingInterval
      }
      timeline {
        stepName
        processTimeMinutes
        waitTimeMinutes
        isBottleneck
      }
      supplierName
      customerName
      totalLeadTimeMinutes
      totalValueAddMinutes
      customerDemandRate
      customerDemandPeriod
      customerDemandUnit
      availableMinutesPerShift
      chartShiftsPerDay
      taktTimeSeconds
      lastUpdatedAt
    }
  }
`;

export const PROCESS_SNAPSHOT_QUERY = gql`
  query ProcessSnapshot {
    processSnapshot {
      productModelCount
      productVariantCount
      processFlowCount
      activeFlowCount
    }
  }
`;

// ── VSM Chart CRUD ──

const VSM_CHART_FIELDS = gql`
  fragment VsmChartFields on VsmChartNode {
    id
    name
    chartType
    sourceMode
    plantId
    productionLineId
    departmentId
    supplierName
    customerName
    productionControlTitle
    controlMethod
    scheduleFrequency
    customerDemandRate
    customerDemandPeriod
    customerDemandUnit
    availableMinutesPerShift
    chartShiftsPerDay
    breakTimePerShift
    plannedDowntimePerShift
    workingDaysPerWeek
    taktTimeSeconds
    status
    createdAt
    updatedAt
    processes {
      id
      sequence
      name
      departmentName
      resourceGroupName
      linkedDepartmentId
      linkedResourceGroupId
      linkedResourceId
      operatorCount
      cycleTimeValue
      cycleTimeUnit
      changeoverTimeValue
      changeoverTimeUnit
      uptimePercent
      yieldPercent
      wip
      shiftsPerDay
      isBottleneck
      isPacemaker
      processType
      valueAddType
      cycleTimeVsTakt
      targetWip
      targetCycleTimeValue
      notes
    }
    inventories {
      id
      sequence
      label
      quantity
      waitTimeValue
      waitTimeUnit
      severity
    }
    informationFlows {
      id
      fromType
      fromId
      toType
      toId
      label
      frequency
      flowStyle
      method
      transmissionType
      triggerType
      controlledProcessId
      notes
    }
    materialFlows {
      id
      fromType
      fromId
      toType
      toId
      label
      flowType
      deliveryFrequency
      equipmentType
      equipmentLabel
      distance
      distanceUnit
      tripFrequency
      batchSize
      handlingTime
      handlingTimeUnit
      transportSeverity
      transportCostLevel
      isInternalTransport
      isTransportationWaste
      notes
    }
    timelineSegments {
      id
      sequence
      processId
      waitTimeValue
      waitTimeUnit
      processTimeValue
      processTimeUnit
      label
    }
    improvementOpportunities {
      id
      processId
      inventoryId
      opportunityType
      severity
      label
      message
      acknowledged
    }
  }
`;

export const VSM_CHARTS_QUERY = gql`
  query VsmCharts($productionLineId: String, $sourceMode: String, $chartType: String) {
    vsmCharts(productionLineId: $productionLineId, sourceMode: $sourceMode, chartType: $chartType) {
      charts {
        ...VsmChartFields
      }
      total
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const VSM_CHART_QUERY = gql`
  query VsmChart($id: String!) {
    vsmChart(id: $id) {
      ...VsmChartFields
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const CREATE_VSM_CHART = gql`
  mutation CreateVsmChart($input: CreateVsmChartInput!) {
    createVsmChart(input: $input) {
      chart {
        ...VsmChartFields
      }
      errors
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const UPDATE_VSM_CHART = gql`
  mutation UpdateVsmChart($id: String!, $input: UpdateVsmChartInput!) {
    updateVsmChart(id: $id, input: $input) {
      chart {
        ...VsmChartFields
      }
      errors
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const DELETE_VSM_CHART = gql`
  mutation DeleteVsmChart($id: String!) {
    deleteVsmChart(id: $id) {
      errors
    }
  }
`;

export const ADD_VSM_PROCESS = gql`
  mutation AddVsmChartProcess($chartId: String!, $input: VsmChartProcessInput!) {
    addVsmChartProcess(chartId: $chartId, input: $input) {
      chart { ...VsmChartFields }
      errors
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const UPDATE_VSM_PROCESS = gql`
  mutation UpdateVsmChartProcess($id: String!, $input: VsmChartProcessInput!) {
    updateVsmChartProcess(id: $id, input: $input) {
      chart { ...VsmChartFields }
      errors
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const DELETE_VSM_PROCESS = gql`
  mutation DeleteVsmChartProcess($id: String!) {
    deleteVsmChartProcess(id: $id) {
      errors
    }
  }
`;

export const ADD_VSM_INVENTORY = gql`
  mutation AddVsmChartInventory($chartId: String!, $input: VsmChartInventoryInput!) {
    addVsmChartInventory(chartId: $chartId, input: $input) {
      chart { ...VsmChartFields }
      errors
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const DELETE_VSM_INVENTORY = gql`
  mutation DeleteVsmChartInventory($id: String!) {
    deleteVsmChartInventory(id: $id) {
      errors
    }
  }
`;

export const SYNC_VSM_CHART = gql`
  mutation SyncVsmChartFromLine($chartId: String!) {
    syncVsmChartFromLine(chartId: $chartId) {
      chart { ...VsmChartFields }
      errors
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const ADD_VSM_INFO_FLOW = gql`
  mutation AddVsmChartInfoFlow($chartId: String!, $input: VsmChartInfoFlowInput!) {
    addVsmChartInfoFlow(chartId: $chartId, input: $input) {
      chart { ...VsmChartFields }
      errors
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const DELETE_VSM_INFO_FLOW = gql`
  mutation DeleteVsmChartInfoFlow($id: String!) {
    deleteVsmChartInfoFlow(id: $id) {
      errors
    }
  }
`;

export const ADD_VSM_MATERIAL_FLOW = gql`
  mutation AddVsmChartMaterialFlow($chartId: String!, $input: VsmChartMaterialFlowInput!) {
    addVsmChartMaterialFlow(chartId: $chartId, input: $input) {
      chart { ...VsmChartFields }
      errors
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const UPDATE_VSM_MATERIAL_FLOW = gql`
  mutation UpdateVsmChartMaterialFlow($id: String!, $input: VsmChartMaterialFlowInput!) {
    updateVsmChartMaterialFlow(id: $id, input: $input) {
      chart { ...VsmChartFields }
      errors
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const DELETE_VSM_MATERIAL_FLOW = gql`
  mutation DeleteVsmChartMaterialFlow($id: String!) {
    deleteVsmChartMaterialFlow(id: $id) {
      errors
    }
  }
`;

export const ADD_VSM_TIMELINE = gql`
  mutation AddVsmChartTimelineSegment($chartId: String!, $input: VsmChartTimelineInput!) {
    addVsmChartTimelineSegment(chartId: $chartId, input: $input) {
      chart { ...VsmChartFields }
      errors
    }
  }
  ${VSM_CHART_FIELDS}
`;

export const DELETE_VSM_TIMELINE = gql`
  mutation DeleteVsmChartTimelineSegment($id: String!) {
    deleteVsmChartTimelineSegment(id: $id) {
      errors
    }
  }
`;

export const UPDATE_VSM_DEMAND_AND_TAKT = gql`
  mutation UpdateVsmDemandAndTakt($chartId: String!, $input: DemandAndTaktInput!) {
    updateVsmDemandAndTakt(chartId: $chartId, input: $input) {
      chartId
      taktTimeSeconds
      taktTimeDisplay
      taktStatus
      taktMissingReason
      demandSummary
      demandPerDay
      availableProductionTimePerShift
      availableProductionTimePerDay
      availableProductionTimeSeconds
      breakTimePerShift
      plannedDowntimePerShift
      shiftsPerDay
      workingDaysPerWeek
      errors
    }
  }
`;
