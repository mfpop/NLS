import { gql } from "@apollo/client";

export const IMPORT_SOURCE_CONFIGS_QUERY = gql`
  query ImportSourceConfigs($domain: String, $isActive: Boolean, $offset: Int, $limit: Int) {
    importSourceConfigs(domain: $domain, isActive: $isActive, offset: $offset, limit: $limit) {
      items {
        id
        name
        domain
        sourceType
        path
        filePattern
        archivePath
        errorPath
        pollingIntervalMinutes
        isActive
        lastCheckedAt
        createdAt
        updatedAt
      }
      pageInfo {
        totalCount
        hasNextPage
        offset
        limit
      }
    }
  }
`;
