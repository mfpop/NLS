import { gql } from "@apollo/client";

export const LIVE_SHOPFLOOR_DASHBOARD_QUERY = gql`
  query LiveShopfloorDashboard($lineId: String!, $shiftId: String) {
    liveShopfloorDashboard(lineId: $lineId, shiftId: $shiftId) {
      lineSummary {
        id
        code
        name
        plantId
        plantName
        status
        displayStatus
      }
      shiftSummary {
        id
        name
        startTime
        endTime
        date
        elapsedPercent
        remainingMinutes
        supervisor
        crew
      }
      currentProduction {
        productName
        productCode
        partNumber
        productionOrderId
        productionOrderNumber
        plannedQuantity
        actualQuantity
        operationName
        routingStep
      }
      liveStatus {
        lineStatus
        displayStatus
        runState
        bottleneckResource
        lastUpdatedAt
      }
      assignedResourceGroups {
        id
        resourceGroupId
        resourceGroupCode
        resourceGroupName
        departmentName
        sequence
        status
        displayStatus
        activeOperation
        activeDowntimeReason
        issueCount
        actionCount
        lastUpdated
      }
      resourceStatuses {
        id
        name
        code
        resourceGroupId
        resourceGroupName
        status
        displayStatus
        currentOperation
        activeDowntimeEventId
        activeDowntimeReason
        lastUpdated
      }
      resourceGroupStatusSummary {
        runningCount
        stoppedCount
        blockedCount
        starvedCount
        maintenanceCount
        unknownCount
        activeBottleneckResource
      }
      activeDowntime {
        id
        startTime
        reason
        reasonCode
        durationMinutes
        status
        displayStatus
        affectedResourceName
        affectedResourceGroupName
        linkedIssueId
        linkedActionId
        owner
      }
      recentDowntimeEvents {
        id
        startTime
        endTime
        durationMinutes
        reason
        reasonCode
        status
        displayStatus
        affectedResourceName
        affectedResourceGroupName
      }
      bottleneckSignal {
        resourceName
        resourceGroupName
        cycleTimeSignal
        queueWipSignal
        blockedStatus
        starvedStatus
        runningStatus
        reasonSummary
        attentionMessage
        isConstrained
      }
      openIssues {
        id
        title
        severity
        displaySeverity
        status
        displayStatus
        owner
        dueDate
        createdAt
        sourceType
        linkedResourceName
        linkedResourceGroupName
      }
      openActions {
        id
        title
        priority
        displayPriority
        status
        displayStatus
        assignedTo
        dueDate
        createdAt
        sourceType
        linkedResourceName
        linkedResourceGroupName
      }
      timelineEvents {
        id
        eventType
        description
        timestamp
        severity
        displaySeverity
        userId
        userName
        linkedResourceName
        linkedResourceGroupName
      }
      allowedActions
      lastUpdatedAt
    }
  }
`;

export const LIVE_SHOPFLOOR_EVENTS_QUERY = gql`
  query LiveShopfloorEvents($lineId: String!, $filters: LiveShopfloorEventFilters) {
    liveShopfloorEvents(lineId: $lineId, filters: $filters) {
      id
      eventType
      displayType
      title
      summary
      description
      severity
      displaySeverity
      status
      displayStatus
      timestamp
      linkedResourceName
      linkedResourceGroupName
      linkedIssueId
      linkedActionId
    }
  }
`;

export const LIVE_SHOPFLOOR_FILTERS_QUERY = gql`
  query LiveShopfloorFilters($lineId: String!) {
    liveShopfloorFilters(lineId: $lineId) {
      shifts {
        id
        name
        startTime
        endTime
      }
      downtimeReasons {
        id
        code
        name
      }
      eventTypes
      statusFilters
    }
  }
`;
