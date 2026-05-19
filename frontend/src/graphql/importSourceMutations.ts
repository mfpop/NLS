import { gql } from "@apollo/client";

export const CREATE_IMPORT_SOURCE_CONFIG = gql`
  mutation CreateImportSourceConfig($input: ImportSourceConfigInput!) {
    createImportSourceConfig(input: $input) {
      ok
      config {
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
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_IMPORT_SOURCE_CONFIG = gql`
  mutation UpdateImportSourceConfig($id: String!, $input: ImportSourceConfigInput!) {
    updateImportSourceConfig(id: $id, input: $input) {
      ok
      config {
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
      errors {
        field
        message
      }
    }
  }
`;

export const ARCHIVE_IMPORT_SOURCE_CONFIG = gql`
  mutation ArchiveImportSourceConfig($id: String!) {
    archiveImportSourceConfig(id: $id) {
      ok
      config {
        id
      }
      errors {
        field
        message
      }
    }
  }
`;
