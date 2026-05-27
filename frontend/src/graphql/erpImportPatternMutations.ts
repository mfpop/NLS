import { gql } from "@apollo/client";

export const CREATE_ERP_IMPORT_PATTERN = gql`
  mutation CreateErpImportPattern(
    $name: String!
    $destinationEntity: String!
    $scope: String!
    $description: String!
    $sourceFilePattern: String!
    $plantSelectionJson: String!
    $departmentSelectionJson: String!
    $resourceGroupSelectionJson: String!
  ) {
    createErpImportPattern(
      name: $name
      destinationEntity: $destinationEntity
      scope: $scope
      description: $description
      sourceFilePattern: $sourceFilePattern
      plantSelectionJson: $plantSelectionJson
      departmentSelectionJson: $departmentSelectionJson
      resourceGroupSelectionJson: $resourceGroupSelectionJson
    ) {
      ok
      pattern {
        id
        name
        description
        scope
        destinationEntity
        isActive
        fieldCount
        plantSelectionJson
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_ERP_IMPORT_PATTERN = gql`
  mutation UpdateErpImportPattern(
    $patternId: String!
    $name: String
    $description: String
    $scope: String
    $destinationEntity: String
    $isActive: Boolean
    $sourceFilePattern: String
    $plantSelectionJson: String
    $departmentSelectionJson: String
    $resourceGroupSelectionJson: String
  ) {
    updateErpImportPattern(
      patternId: $patternId
      name: $name
      description: $description
      scope: $scope
      destinationEntity: $destinationEntity
      isActive: $isActive
      sourceFilePattern: $sourceFilePattern
      plantSelectionJson: $plantSelectionJson
      departmentSelectionJson: $departmentSelectionJson
      resourceGroupSelectionJson: $resourceGroupSelectionJson
    ) {
      ok
      pattern {
        id
        name
        description
        scope
        destinationEntity
        isActive
        fieldCount
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const DELETE_ERP_IMPORT_PATTERN = gql`
  mutation DeleteErpImportPattern($patternId: String!) {
    deleteErpImportPattern(patternId: $patternId) {
      ok
      errors {
        field
        code
        message
      }
    }
  }
`;

export const SAVE_ERP_IMPORT_PATTERN_MAPPING = gql`
  mutation SaveErpImportPatternMapping(
    $patternId: String!
    $sourceName: String!
    $sourceDataType: String!
    $destinationName: String!
    $destinationDataType: String!
    $isRequired: Boolean!
    $sortOrder: Int!
  ) {
    saveErpImportPatternMapping(
      patternId: $patternId
      sourceName: $sourceName
      sourceDataType: $sourceDataType
      destinationName: $destinationName
      destinationDataType: $destinationDataType
      isRequired: $isRequired
      sortOrder: $sortOrder
    ) {
      ok
      mapping {
        id
        patternId
        sourceName
        sourceDataType
        destinationName
        destinationDataType
        isRequired
        sortOrder
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REMOVE_ERP_IMPORT_PATTERN_MAPPING = gql`
  mutation RemoveErpImportPatternMapping($patternId: String!, $mappingId: String!) {
    removeErpImportPatternMapping(patternId: $patternId, mappingId: $mappingId) {
      ok
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REPLACE_ERP_IMPORT_PATTERN_MAPPINGS = gql`
  mutation ReplaceErpImportPatternMappings(
    $patternId: String!
    $mappings: [FieldMappingInput!]!
  ) {
    replaceErpImportPatternMappings(patternId: $patternId, mappings: $mappings) {
      ok
      pattern {
        id
        fieldCount
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const VALIDATE_ERP_IMPORT_PATTERN = gql`
  mutation ValidateErpImportPattern($patternId: String!) {
    validateErpImportPattern(patternId: $patternId) {
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

export const UPLOAD_SOURCE_FILE = gql`
  mutation ErpUploadSourceFile($fileName: String!, $contentBase64: String!) {
    erpUploadSourceFile(fileName: $fileName, contentBase64: $contentBase64) {
      ok
      path
      errors {
        field
        code
        message
      }
    }
  }
`;
