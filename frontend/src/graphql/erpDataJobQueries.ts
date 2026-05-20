import { gql } from "@apollo/client";

export const IMPORT_JOBS_QUERY = gql`
  query ImportJobs($sourceId: String, $status: String, $domain: String, $offset: Int, $limit: Int) {
    importJobs(sourceId: $sourceId, status: $status, domain: $domain, offset: $offset, limit: $limit) {
      items {
        id
        sourceConfigId
        sourceConfigName
        domain
        fileName
        filePath
        fileSize
        fileHash
        startedAt
        completedAt
        status
        recordsProcessed
        recordsCreated
        recordsUpdated
        recordsFailed
        errorSummary
        triggeredBy
        createdAt
      }
      pageInfo {
        totalCount
        hasNextPage
        offset
        limit
      }
    }
    importSourceConfigs(isActive: true) {
      items {
        id
        name
        domain
        sourceType
        isActive
      }
    }
  }
`;

export const FILE_PREVIEW_QUERY = gql`
  query FilePreview($jobId: String!) {
    filePreview(jobId: $jobId) {
      jobId
      fileName
      sheetNames
      activeSheet
      columnHeaders
      totalRows
      sampleRows {
        rowNumber
        columns
        isEmpty
      }
      detectedTypes
      emptyRequiredCells
      duplicateRows
      errors { field code message }
    }
  }
`;

export const IMPORT_VALIDATION_ERRORS_QUERY = gql`
  query ImportValidationErrors($jobId: String!, $entityType: String, $offset: Int, $limit: Int) {
    importValidationErrors(jobId: $jobId, entityType: $entityType, offset: $offset, limit: $limit) {
      items {
        id
        importJobId
        sheetName
        rowNumber
        entityType
        fieldName
        errorCode
        message
        rawValue
        createdAt
      }
      pageInfo { totalCount hasNextPage offset limit }
    }
  }
`;

export const IMPORT_COMPARE_RESULTS_QUERY = gql`
  query ImportCompareResults($jobId: String!, $actionFilter: String, $offset: Int, $limit: Int) {
    importCompareResults(jobId: $jobId, actionFilter: $actionFilter, offset: $offset, limit: $limit) {
      items {
        id
        importJobId
        action
        entityType
        stableKey
        currentValueJson
        incomingValueJson
        diffJson
        status
      }
      pageInfo { totalCount hasNextPage offset limit }
    }
  }
`;

export const IMPORT_AUDIT_LOGS_QUERY = gql`
  query ImportAuditLogs($jobId: String!, $offset: Int, $limit: Int) {
    importAuditLogs(jobId: $jobId, offset: $offset, limit: $limit) {
      items {
        id
        importJobId
        action
        user
        message
        metadataJson
        createdAt
      }
      pageInfo { totalCount hasNextPage offset limit }
    }
  }
`;

export const PARSED_DATA_QUERY = gql`
  query ParsedData($jobId: String!) {
    parsedData(jobId: $jobId) {
      ok
      fileName
      sheets {
        sheetName
        columnHeaders
        columnTypes
        totalRows
        sampleRows {
          rowNumber
          columns
          isEmpty
        }
      }
      errors { field code message }
    }
  }
`;

export const MAPPING_SUGGESTIONS_QUERY = gql`
  query MappingSuggestions($jobId: String!) {
    mappingSuggestions(jobId: $jobId) {
      ok
      items {
        sourceColumn
        nexusField
        confidence
        status
        required
        message
      }
      unmappedCount
      requiredUnmappedCount
      errors { field code message }
    }
  }
`;

export const IMPORT_APPLY_PREVIEW_QUERY = gql`
  query ImportApplyPreview($jobId: String!) {
    importApplyPreview(jobId: $jobId) {
      ok
      createCount
      updateCount
      unchangedCount
      conflictCount
      skipCount
      plannedMutations {
        rowNumber
        entityType
        entityKey
        operation
        incoming
        existing
        fieldDiffs { field incoming existing }
      }
      errors { field code message }
    }
  }
`;
