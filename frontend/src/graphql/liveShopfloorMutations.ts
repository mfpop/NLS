import { gql } from "@apollo/client";

export const LOG_SHOPFLOOR_DOWNTIME_MUTATION = gql`
  mutation LogShopfloorDowntime($input: LogShopfloorDowntimeInput!) {
    logShopfloorDowntime(input: $input) {
      ok
      downtimeEvent {
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
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CLOSE_SHOPFLOOR_DOWNTIME_MUTATION = gql`
  mutation CloseShopfloorDowntime($id: String!) {
    closeShopfloorDowntime(id: $id) {
      ok
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_CONTROL_ISSUE_FROM_LIVE_SHOPFLOOR_MUTATION = gql`
  mutation CreateControlIssueFromLiveShopfloor($input: CreateIssueFromLiveShopfloorInput!) {
    createControlIssueFromLiveShopfloor(input: $input) {
      ok
      issue {
        id
        title
        severity
        displaySeverity
        status
        displayStatus
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

export const CREATE_CONTROL_ACTION_FROM_LIVE_SHOPFLOOR_MUTATION = gql`
  mutation CreateControlActionFromLiveShopfloor($input: CreateActionFromLiveShopfloorInput!) {
    createControlActionFromLiveShopfloor(input: $input) {
      ok
      action {
        id
        title
        priority
        displayPriority
        status
        displayStatus
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

export const REFRESH_LIVE_SHOPFLOOR_SNAPSHOT_MUTATION = gql`
  mutation RefreshLiveShopfloorSnapshot($lineId: String!, $shiftId: String) {
    refreshLiveShopfloorSnapshot(lineId: $lineId, shiftId: $shiftId) {
      ok
      errors {
        field
        code
        message
      }
    }
  }
`;

export const EXPORT_LIVE_SHOPFLOOR_MUTATION = gql`
  mutation ExportLiveShopfloor($lineId: String!) {
    exportLiveShopfloor(lineId: $lineId) {
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
