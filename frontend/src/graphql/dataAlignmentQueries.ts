import { gql } from "@apollo/client";

export const ALIGNMENT_SOURCES_QUERY = gql`
  query AlignmentSources($scope: String) {
    erpSourceDefinitions(scope: $scope, limit: 1000) {
      items { id name scope sourceType destinationTable expectedFilePattern active status lastImportedAt }
      pageInfo { totalCount }
    }
    erpPatternDefinitions {
      name scope sourceType destinationTable expectedFilePattern status fileName
    }
  }
`;

export const ALIGNMENT_DEST_TABLES_QUERY = gql`
  query AlignmentDestTables($scope: String) {
    erpDestinationTables(scope: $scope)
  }
`;

export const DETECTED_COLUMNS_QUERY = gql`
  query DetectedColumns($filePath: String!) {
    detectedColumns(filePath: $filePath) {
      columnName sampleValues detectedType nullCount totalRows
    }
  }
`;

export const NEXUS_TARGET_FIELDS_QUERY = gql`
  query NexusTargetFields($entityType: String) {
    nexusTargetFields(entityType: $entityType)
  }
`;

export const ALIGNMENT_PROFILES_QUERY = gql`
  query AlignmentProfiles {
    importProfiles { id name domain version isActive notes createdAt }
  }
`;

export const ALIGNMENT_PROFILE_QUERY = gql`
  query AlignmentProfile($profileId: String!) {
    importProfile(profileId: $profileId) { id name domain version isActive notes createdAt }
    importFieldMappings(profileId: $profileId) {
      id profileId entityType sourceColumn targetField isRequired sortOrder
    }
  }
`;

export const AUTO_MATCH_MAPPING = gql`
  mutation AutoMatchMapping($profileId: String!) {
    validateImportMapping(profileId: $profileId) {
      ok issues { entityType severity code message }
      blockingErrorCount
    }
  }
`;

export const SAVE_ALIGNMENT_MAPPING = gql`
  mutation SaveAlignmentMapping($profileId: String!, $entityType: String!, $sourceColumn: String!, $targetField: String!, $isRequired: Boolean!) {
    saveImportFieldMapping(profileId: $profileId, entityType: $entityType, sourceColumn: $sourceColumn, targetField: $targetField, isRequired: $isRequired) {
      ok mapping { id entityType sourceColumn targetField isRequired }
      errors { field code message }
    }
  }
`;

export const VALIDATE_ALIGNMENT = gql`
  mutation ValidateAlignment($profileId: String!) {
    validateImportMapping(profileId: $profileId) {
      ok issues { entityType severity code message }
      blockingErrorCount
    }
  }
`;

export const CREATE_ALIGNMENT_PROFILE = gql`
  mutation CreateAlignmentProfile($name: String!, $domain: String!) {
    createImportProfile(name: $name, domain: $domain) {
      ok profile { id name domain isActive }
      errors { field code message }
    }
  }
`;
