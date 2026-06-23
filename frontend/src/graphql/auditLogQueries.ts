import { gql } from "@apollo/client";

export const AUDIT_LOGS_QUERY = gql`
  query AuditLogs(
    $eventType: String,
    $search: String,
    $action: String,
    $username: String,
    $entityType: String,
    $dateFrom: String,
    $dateTo: String,
    $limit: Int,
    $offset: Int,
  ) {
    auditLogs(
      eventType: $eventType,
      search: $search,
      action: $action,
      username: $username,
      entityType: $entityType,
      dateFrom: $dateFrom,
      dateTo: $dateTo,
      limit: $limit,
      offset: $offset,
    ) {
      items {
        id
        eventType
        userId
        username
        action
        description
        entityType
        entityId
        ipAddress
        details
        createdAt
      }
      total
      hasMore
    }
  }
`;
