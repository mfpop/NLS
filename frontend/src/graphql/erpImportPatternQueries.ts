import { gql } from "@apollo/client";

export const ERP_IMPORT_PATTERNS_QUERY = gql`
  query ErpImportPatterns {
    erpImportPatterns {
      id
      name
      description
      scope
      destinationEntity
      isActive
      createdBy
      sourceFilePattern
      plantSelectionJson
      departmentSelectionJson
      resourceGroupSelectionJson
      sourceSchemaJson
      createdAt
      updatedAt
      fieldCount
    }
  }
`;

export const ERP_IMPORT_PATTERN_QUERY = gql`
  query ErpImportPattern($patternId: String!) {
    erpImportPattern(patternId: $patternId) {
      id
      name
      description
      scope
      destinationEntity
      isActive
      createdBy
      sourceFilePattern
      plantSelectionJson
      departmentSelectionJson
      resourceGroupSelectionJson
      sourceSchemaJson
      createdAt
      updatedAt
      fieldCount
    }
  }
`;

export const ERP_IMPORT_PATTERN_MAPPINGS_QUERY = gql`
  query ErpImportPatternMappings($patternId: String!) {
    erpImportPatternMappings(patternId: $patternId) {
      id
      patternId
      sourceName
      sourceDataType
      destinationName
      destinationDataType
      isRequired
      sortOrder
    }
  }
`;

export const ERP_IMPORT_PATTERN_VALIDATION_QUERY = gql`
  query ErpImportPatternValidation($patternId: String!) {
    erpImportPatternValidation(patternId: $patternId) {
      ok
      blockingErrorCount
      issues {
        sourceName
        destinationName
        severity
        code
        message
      }
    }
  }
`;

export const ERP_PATTERN_SCOPE_OPTIONS_QUERY = gql`
  query ErpPatternScopeOptions {
    erpPatternScopeOptions {
      value
      label
    }
  }
`;

export const ERP_PATTERN_DESTINATION_OPTIONS_QUERY = gql`
  query ErpPatternDestinationOptions($scope: String) {
    erpPatternDestinationOptions(scope: $scope) {
      entity
      scope
      available
    }
  }
`;

export const ERP_LIST_SOURCE_FILES = gql`
  query ErpListStorageFiles($folder: String!) {
    erpListStorageFiles(folder: $folder) {
      folder
      items {
        name
        path
        size
        modified
      }
    }
  }
`;

export const ERP_DESTINATION_DEFINITION = gql`
  query ErpDestinationDefinition($name: String!) {
    erpDestinationDefinition(name: $name) {
      name
      scope
      fields
      relationships
    }
  }
`;
