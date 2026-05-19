import { gql } from "@apollo/client";

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
