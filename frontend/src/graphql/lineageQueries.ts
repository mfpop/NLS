import { gql } from "@apollo/client";

export const ERP_SCOPES = gql`
  query ErpScopes {
    erpScopes
  }
`;

export const ERP_DESTINATION_TABLES = gql`
  query ErpDestinationTables($scope: String) {
    erpDestinationTables(scope: $scope)
  }
`;

export const ERP_SOURCE_DEFINITIONS = gql`
  query ErpSourceDefinitions($scope: String, $isActive: Boolean, $offset: Int, $limit: Int) {
    erpSourceDefinitions(scope: $scope, isActive: $isActive, offset: $offset, limit: $limit) {
      items {
        id
        name
        scope
        sourceType
        destinationTable
        expectedFilePattern
        active
        status
        schemaJson
        rowCount
        lastImportedAt
        createdAt
        updatedAt
        fieldCount
      }
      pageInfo {
        totalCount
        hasNextPage
        offset
        limit
      }
    }
  }
`;

export const ERP_SOURCE_DEFINITION = gql`
  query ErpSourceDefinition($id: String!) {
    erpSourceDefinition(id: $id) {
      id
      name
      scope
      sourceType
      destinationTable
      expectedFilePattern
      active
      status
      schemaJson
      rowCount
      lastImportedAt
      createdAt
      updatedAt
      fieldCount
    }
  }
`;

export const ERP_DEFINITION_FIELDS = gql`
  query ErpDefinitionFields($sourceDefinitionId: String!, $offset: Int, $limit: Int) {
    erpDefinitionFields(sourceDefinitionId: $sourceDefinitionId, offset: $offset, limit: $limit) {
      items {
        id
        sourceDefinitionId
        fieldName
        dataType
        required
        primaryKey
        foreignKey
        nexusField
        aliasesJson
        active
        createdAt
        updatedAt
      }
      pageInfo {
        totalCount
        hasNextPage
        offset
        limit
      }
    }
  }
`;

export const ERP_RELATIONSHIP_DEFINITIONS = gql`
  query ErpRelationshipDefinitions($sourceDefinitionId: String!, $offset: Int, $limit: Int) {
    erpRelationshipDefinitions(sourceDefinitionId: $sourceDefinitionId, offset: $offset, limit: $limit) {
      items {
        id
        sourceDefinitionId
        sourceField
        targetSourceDefinitionId
        targetField
        relationshipType
        required
        active
        createdAt
        updatedAt
        targetName
      }
      pageInfo {
        totalCount
        hasNextPage
        offset
        limit
      }
    }
  }
`;

export const ERP_RELATED_DATA = gql`
  query ErpRelatedData($sourceDefinitionId: String!, $batchId: String, $offset: Int, $limit: Int) {
    erpRelatedData(sourceDefinitionId: $sourceDefinitionId, batchId: $batchId, offset: $offset, limit: $limit) {
      items {
        id
        batchId
        sourceDefinitionId
        rowNumber
        rawDataJson
        normalizedDataJson
        validationStatus
        createdAt
      }
      pageInfo {
        totalCount
        hasNextPage
        offset
        limit
      }
    }
  }
`;

export const ERP_FIELD_PROFILE = gql`
  query ErpFieldProfile($sourceDefinitionId: String!, $fieldName: String!) {
    erpFieldProfile(sourceDefinitionId: $sourceDefinitionId, fieldName: $fieldName) {
      fieldName
      distinctValues
      nullCount
      duplicateCount
      sampleValues
      nexusField
      invalidValues
    }
  }
`;

export const ERP_VALIDATION_RESULTS = gql`
  query ErpValidationResults($sourceDefinitionId: String!, $severity: String, $offset: Int, $limit: Int) {
    erpValidationResults(sourceDefinitionId: $sourceDefinitionId, severity: $severity, offset: $offset, limit: $limit) {
      items {
        id
        scope
        sourceDefinitionId
        destinationTable
        severity
        entity
        fieldName
        rowNumber
        ruleCode
        message
        recommendedAction
        createdAt
      }
      pageInfo {
        totalCount
        hasNextPage
        offset
        limit
      }
    }
  }
`;

export const ERP_STRUCTURE_DEFINITIONS = gql`
  query ErpStructureDefinitions {
    erpStructureDefinitions {
      name
      scope
      sourceType
      destinationTable
      expectedFilePattern
      active
      status
      fileName
    }
  }
`;

export const ERP_PATTERN_DEFINITIONS = gql`
  query ErpPatternDefinitions {
    erpPatternDefinitions {
      name
      scope
      sourceType
      destinationTable
      expectedFilePattern
      active
      status
      fileName
    }
  }
`;

export const ERP_STRUCTURE_DEFINITION = gql`
  query ErpStructureDefinition($name: String!) {
    erpStructureDefinition(name: $name) {
      name
      scope
      sourceType
      destinationTable
      expectedFilePattern
      active
      status
      fields
      relationships
      fileName
    }
  }
`;

export const ERP_LINEAGE_VALIDATION = gql`
  query ErpLineageValidation($sourceDefinitionId: String!, $destinationTable: String!) {
    erpLineageValidation(sourceDefinitionId: $sourceDefinitionId, destinationTable: $destinationTable) {
      scope
      sourceDefinitionName
      destinationTable
      status
      totalIssues
      errors
      warnings
      info
      lastValidatedAt
    }
  }
`;

export const ERP_RELATIONSHIP_GRAPH = gql`
  query ErpRelationshipGraph($sourceDefinitionId: String!, $destinationTable: String) {
    erpRelationshipGraph(sourceDefinitionId: $sourceDefinitionId, destinationTable: $destinationTable) {
      tables {
        id
        name
        fields {
          name
          dataType
          required
          primaryKey
          foreignKey
          nexusField
          validationState
        }
      }
      relationships {
        id
        sourceTableId
        sourceField
        targetTableId
        targetField
        cardinality
        required
        status
      }
      validationState
    }
  }
`;

export const ERP_IMPORT_BATCHES = gql`
  query ErpImportBatches($sourceDefinitionId: String!, $offset: Int, $limit: Int) {
    erpImportBatches(sourceDefinitionId: $sourceDefinitionId, offset: $offset, limit: $limit) {
      items {
        id
        sourceDefinitionId
        fileName
        fileHash
        importedBy
        importedAt
        mode
        status
        rowCount
        errorMessage
        createdAt
      }
      pageInfo {
        totalCount
        hasNextPage
        offset
        limit
      }
    }
  }
`;


