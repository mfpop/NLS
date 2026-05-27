import { gql } from "@apollo/client";

export const UPLOAD_ERP_SOURCE_FILE = gql`
  mutation UploadErpSourceFile($file: Upload!) {
    uploadErpSourceFile(file: $file) {
      id
      originalName
      storedName
      fileType
      status
    }
  }
`;

export const VALIDATE_ERP_PATTERN = gql`
  mutation ValidateErpPattern($patternId: Int!) {
    validateErpPattern(patternId: $patternId) {
      status
      errors
      warnings
      missingFields
    }
  }
`;

export const EXECUTE_ERP_IMPORT = gql`
  mutation ExecuteErpImport($patternId: Int!, $confirmed: Boolean!) {
    executeErpImport(patternId: $patternId, confirmed: $confirmed) {
      patternId
      patternName
      status
      rowsAdded
      rowsUpdated
      rowsNotUpdated
      rowsFailed
      errorMessage
    }
  }
`;

export const RESET_ERP_IMPORT_WORKSPACE = gql`
  mutation ResetErpImportWorkspace($confirmed: Boolean!) {
    resetErpImportWorkspace(confirmed: $confirmed)
  }
`;
