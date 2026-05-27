import { gql } from "@apollo/client";

export const ERP_IMPORT_PATTERNS_QUERY = gql`
  query ErpImportPatterns {
    erpImportPatterns {
      id
      name
      destinationEntity
      sourceFileType
      sourceFilePattern
      sourceSchemaJson
      isActive
    }
  }
`;

export const ERP_IMPORT_VALIDATION_QUERY = gql`
  query ErpImportValidation($patternId: Int!) {
    erpImportValidation(patternId: $patternId) {
      status
      errors
      warnings
      missingFields
    }
  }
`;

export const ERP_IMPORT_LOGS_QUERY = gql`
  query ErpImportLogs($patternId: Int) {
    erpImportLogs(patternId: $patternId) {
      id
      patternId
      sourceFileId
      status
      rowsTotal
      rowsAdded
      rowsUpdated
      rowsNotUpdated
      rowsFailed
      errorMessage
      startedAt
      completedAt
      createdAt
    }
  }
`;
