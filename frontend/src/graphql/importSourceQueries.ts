import { gql } from "@apollo/client";

export const IMPORT_SOURCE_CONFIGS_QUERY = gql`
  query ImportSourceConfigs($domain: String, $isActive: Boolean) {
    importSourceConfigs(domain: $domain, isActive: $isActive) {
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
  }
`;
