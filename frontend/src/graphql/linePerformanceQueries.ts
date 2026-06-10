import { gql } from "@apollo/client";

export const LINE_PERFORMANCE_DASHBOARD_QUERY = gql`
  query LinePerformanceDashboard($lineId: String!, $shiftId: String, $date: String) {
    linePerformanceDashboard(lineId: $lineId, shiftId: $shiftId, date: $date) {
      line {
        id
        code
        name
        plantId
        plantName
        status
      }
      shift {
        id
        name
        startTime
        endTime
        date
      }
      kpis {
        planQuantity
        actualQuantity
        gap
        gapStatus
        runRate
        runRateUnit
        oeeSignal
        oeeStatus
        availability
        performance
        quality
        downtimeMinutes
        firstPassYield
        qualityStatus
      }
      planVsActual {
        plannedQuantity
        actualQuantity
        remainingQuantity
        gap
        targetRunRate
        actualRunRate
        runRateUnit
        projectedEndOfShift
        progressPercent
        status
      }
      oeeSignal {
        availability
        performance
        quality
        overall
        availabilityStatus
        performanceStatus
        qualityStatus
        overallStatus
        explanation
      }
      downtimeSummary {
        totalDowntimeMinutes
        topReason
        topReasonDurationMinutes
        activeDowntimeEvent {
          id
          startTime
          reason
          reasonCode
          durationMinutes
          status
          linkedIssueId
          linkedActionId
        }
        totalEvents
      }
      downtimeEvents {
        id
        startTime
        endTime
        durationMinutes
        reason
        reasonCode
        status
        description
        linkedIssueId
        linkedActionId
        resourceName
        resourceGroupName
      }
      qualitySummary {
        goodQuantity
        rejectedQuantity
        reworkQuantity
        scrapQuantity
        firstPassYield
        defectCount
        topDefectReason
        linkedIssueCount
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
      linkedIssues {
        id
        title
        severity
        status
        owner
        dueDate
        createdAt
      }
      linkedActions {
        id
        title
        priority
        status
        assignedTo
        dueDate
        createdAt
      }
      timelineEvents {
        id
        eventType
        description
        timestamp
        severity
        userId
        userName
      }
      allowedActions
      lastUpdatedAt
    }
  }
`;

export const LINE_PERFORMANCE_RECORDS_QUERY = gql`
  query LinePerformanceRecords($lineId: String!, $filters: LinePerformanceRecordFilters) {
    linePerformanceRecords(lineId: $lineId, filters: $filters) {
      id
      shiftName
      date
      startTime
      endTime
      plannedQuantity
      actualQuantity
      gap
      oeeStatus
      downtimeMinutes
      qualityIssueCount
      status
    }
  }
`;

export const LINE_PERFORMANCE_FILTERS_QUERY = gql`
  query LinePerformanceFilters($lineId: String!) {
    linePerformanceFilters(lineId: $lineId) {
      shifts {
        id
        name
        startTime
        endTime
      }
      dates
      statuses
      downtimeReasons {
        id
        code
        name
      }
    }
  }
`;
