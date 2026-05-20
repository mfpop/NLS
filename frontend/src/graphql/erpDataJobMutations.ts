import { gql } from "@apollo/client";

export const VALIDATE_PLANT_STRUCTURE = gql`
  mutation ValidatePlantStructure($jobId: String) {
    validatePlantStructureExcel(jobId: $jobId) {
      ok
      validationErrors { field code message }
    }
  }
`;

export const COMPARE_PLANT_STRUCTURE = gql`
  mutation ComparePlantStructure($jobId: String) {
    comparePlantStructureExcel(jobId: $jobId) {
      ok
      validationErrors { field code message }
      compareRows {
        sheet
        rowNumber
        entityType
        businessKey
        status
        fieldDifferences { field excelValue appValue }
        message
      }
    }
  }
`;

export const IMPORT_PLANT_STRUCTURE = gql`
  mutation ImportPlantStructure($jobId: String, $mode: String) {
    importPlantStructureExcel(jobId: $jobId, mode: $mode) {
      ok
      validationErrors { field code message }
      compareRows {
        sheet
        rowNumber
        entityType
        businessKey
        status
        fieldDifferences { field excelValue appValue }
        message
      }
      companiesCreated
      companiesUpdated
      plantsCreated
      plantsUpdated
      linesCreated
      linesUpdated
      departmentsCreated
      departmentsUpdated
      assignmentsCreated
      assignmentsUpdated
      resourceGroupsCreated
      resourceGroupsUpdated
      resourcesCreated
      resourcesUpdated
      totalCreated
      totalUpdated
    }
  }
`;

export const CREATE_IMPORT_JOB = gql`
  mutation CreateImportJob($sourceId: String!, $fileName: String, $fileHash: String) {
    createImportJob(sourceId: $sourceId, fileName: $fileName, fileHash: $fileHash) {
      ok
      errorCode
      message
      existingJobId
      sourceConfigId
      fileName
      job { id status fileName filePath fileSize fileHash startedAt createdAt sourceConfigId sourceConfigName domain }
      errors { field code message }
    }
  }
`;

export const ATTACH_IMPORT_FILE = gql`
  mutation AttachImportFile($jobId: String!, $input: AttachFileInput!) {
    attachImportFile(jobId: $jobId, input: $input) {
      ok
      errorCode
      message
      existingJobId
      sourceConfigId
      fileName
      job { id status fileName filePath fileSize fileHash startedAt createdAt sourceConfigId sourceConfigName domain }
      errors { field code message }
    }
  }
`;

export const TRANSITION_IMPORT_JOB = gql`
  mutation TransitionImportJob($action: String!, $jobId: String!) {
    transitionImportJob(action: $action, jobId: $jobId) {
      ok
      job { id status recordsCreated recordsUpdated recordsFailed errorSummary completedAt }
      errors { field code message }
    }
  }
`;

export const DELETE_IMPORT_JOB = gql`
  mutation DeleteImportJob($jobId: String!) {
    deleteImportJob(jobId: $jobId) {
      ok
      message
      errors { field code message }
    }
  }
`;
