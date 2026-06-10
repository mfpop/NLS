import { gql } from "@apollo/client";

export const LOG_LINE_DOWNTIME_MUTATION = gql`
  mutation LogLineDowntime($input: LogDowntimeInput!) {
    logLineDowntime(input: $input) {
      ok
      downtimeEvent {
        id
        startTime
        endTime
        durationMinutes
        reason
        reasonCode
        status
        description
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_CONTROL_ISSUE_FROM_LINE_PERFORMANCE_MUTATION = gql`
  mutation CreateControlIssueFromLinePerformance($input: CreateIssueFromLinePerformanceInput!) {
    createControlIssueFromLinePerformance(input: $input) {
      ok
      issue {
        id
        title
        severity
        status
        owner
        dueDate
        createdAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_CONTROL_ACTION_FROM_LINE_PERFORMANCE_MUTATION = gql`
  mutation CreateControlActionFromLinePerformance($input: CreateActionFromLinePerformanceInput!) {
    createControlActionFromLinePerformance(input: $input) {
      ok
      action {
        id
        title
        priority
        status
        assignedTo
        dueDate
        createdAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REFRESH_LINE_PERFORMANCE_SNAPSHOT_MUTATION = gql`
  mutation RefreshLinePerformanceSnapshot($lineId: String!, $shiftId: String, $date: String) {
    refreshLinePerformanceSnapshot(lineId: $lineId, shiftId: $shiftId, date: $date) {
      ok
      dashboard {
        lastUpdatedAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const EXPORT_LINE_PERFORMANCE_MUTATION = gql`
  mutation ExportLinePerformance($lineId: String!, $shiftId: String, $date: String) {
    exportLinePerformance(lineId: $lineId, shiftId: $shiftId, date: $date) {
      ok
      exportUrl
      errors {
        field
        code
        message
      }
    }
  }
`;
