import { gql } from "@apollo/client";

export const IMPORT_JOBS_QUERY = gql`
  query ImportJobs($sourceId: String, $status: String, $domain: String, $offset: Int, $limit: Int) {
    importJobs(sourceId: $sourceId, status: $status, domain: $domain, offset: $offset, limit: $limit) {
      items {
        id
        sourceConfigId
        sourceConfigName
        domain
        fileName
        filePath
        fileSize
        fileHash
        startedAt
        completedAt
        status
        recordsProcessed
        recordsCreated
        recordsUpdated
        recordsFailed
        errorSummary
        triggeredBy
        createdAt
      }
      pageInfo {
        totalCount
        hasNextPage
        offset
        limit
      }
    }
    importSourceConfigs(isActive: true) {
      items {
        id
        name
        domain
        sourceType
        isActive
      }
    }
  }
`;
