import { gql } from "@apollo/client";

export const IMPORT_PROFILES_QUERY = gql`
  query ImportProfiles {
    importProfiles { id name domain version isActive createdBy notes createdAt }
  }
`;

export const IMPORT_PROFILE_QUERY = gql`
  query ImportProfile($profileId: String!) {
    importProfile(profileId: $profileId) {
      id name domain version isActive createdBy notes createdAt
    }
    importFieldMappings(profileId: $profileId) {
      id profileId entityType sourceColumn targetField isRequired sortOrder
    }
  }
`;

export const DETECTED_COLUMNS_QUERY = gql`
  query DetectedColumns($filePath: String!) {
    detectedColumns(filePath: $filePath) {
      columnName sampleValues detectedType nullCount totalRows sheetName
    }
  }
`;

export const NEXUS_TARGET_FIELDS_QUERY = gql`
  query NexusTargetFields($entityType: String) {
    nexusTargetFields(entityType: $entityType)
  }
`;

export const MAPPING_VALIDATION_QUERY = gql`
  query MappingValidation($profileId: String!) {
    mappingValidation(profileId: $profileId) {
      ok issues { entityType sourceColumn targetField severity code message }
      blockingErrorCount
    }
  }
`;

export const IMPORT_RESULT_TREE_QUERY = gql`
  query ImportResultTree($profileId: String!, $filePath: String!, $plantCode: String) {
    importResultTree(profileId: $profileId, filePath: $filePath, plantCode: $plantCode) {
      entityType entityKey action detailsJson
      children { entityType entityKey action detailsJson
        children { entityType entityKey action detailsJson
          children { entityType entityKey action detailsJson }
        }
      }
    }
  }
`;

export const COMPARE_SUMMARY_QUERY = gql`
  query CompareSummary($profileId: String!, $filePath: String!) {
    compareSummary(profileId: $profileId, filePath: $filePath) {
      entityType entityKey action incomingJson existingJson diffsJson
    }
  }
`;

export const EXPORT_MAPPING_QUERY = gql`
  query ExportMapping($profileId: String!) {
    exportMapping(profileId: $profileId) {
      entityType sourceColumn targetField isRequired transformRule
    }
  }
`;

export const CREATE_IMPORT_PROFILE = gql`
  mutation CreateImportProfile($name: String!, $domain: String!) {
    createImportProfile(name: $name, domain: $domain) {
      ok profile { id name domain isActive }
      errors { field code message }
    }
  }
`;

export const SAVE_IMPORT_FIELD_MAPPING = gql`
  mutation SaveImportFieldMapping($profileId: String!, $entityType: String!, $sourceColumn: String!, $targetField: String!, $isRequired: Boolean!) {
    saveImportFieldMapping(profileId: $profileId, entityType: $entityType, sourceColumn: $sourceColumn, targetField: $targetField, isRequired: $isRequired) {
      ok mapping { id entityType sourceColumn targetField isRequired }
      errors { field code message }
    }
  }
`;

export const REMOVE_IMPORT_FIELD_MAPPING = gql`
  mutation RemoveImportFieldMapping($profileId: String!, $mappingId: String!) {
    removeImportFieldMapping(profileId: $profileId, mappingId: $mappingId) {
      ok profile { id name }
      errors { field code message }
    }
  }
`;

export const VALIDATE_IMPORT_MAPPING = gql`
  mutation ValidateImportMapping($profileId: String!) {
    validateImportMapping(profileId: $profileId) {
      ok issues { entityType severity code message }
      blockingErrorCount
    }
  }
`;

export const ACTIVATE_IMPORT_PROFILE = gql`
  mutation ActivateImportProfile($profileId: String!) {
    activateImportProfile(profileId: $profileId) {
      ok profile { id name isActive }
      errors { field code message }
    }
  }
`;
