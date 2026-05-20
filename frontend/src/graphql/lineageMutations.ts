import { gql } from "@apollo/client";

export const CREATE_ERP_SOURCE_DEFINITION = gql`
  mutation CreateErpSourceDefinition($input: ErpSourceDefinitionInput!) {
    createErpSourceDefinition(input: $input) {
      ok
      definition {
        id
        name
        scope
        sourceType
        destinationTable
        active
        status
        rowCount
      }
      errors { field code message }
    }
  }
`;

export const UPDATE_ERP_SOURCE_DEFINITION = gql`
  mutation UpdateErpSourceDefinition($id: String!, $input: ErpSourceDefinitionUpdateInput!) {
    updateErpSourceDefinition(id: $id, input: $input) {
      ok
      definition {
        id
        name
        scope
        sourceType
        destinationTable
        active
        status
        rowCount
      }
      errors { field code message }
    }
  }
`;

export const DELETE_ERP_SOURCE_DEFINITION = gql`
  mutation DeleteErpSourceDefinition($id: String!) {
    deleteErpSourceDefinition(id: $id) {
      ok
      errors { field code message }
    }
  }
`;

export const SAVE_ERP_DEFINITION_FIELD = gql`
  mutation SaveErpDefinitionField($sourceDefinitionId: String!, $input: ErpDefinitionFieldInput!) {
    saveErpDefinitionField(sourceDefinitionId: $sourceDefinitionId, input: $input) {
      ok
      field {
        id
        fieldName
        dataType
        required
        primaryKey
        foreignKey
        nexusField
        active
      }
      errors { field code message }
    }
  }
`;

export const DELETE_ERP_DEFINITION_FIELD = gql`
  mutation DeleteErpDefinitionField($id: String!) {
    deleteErpDefinitionField(id: $id) {
      ok
      errors { field code message }
    }
  }
`;

export const SAVE_ERP_RELATIONSHIP_DEFINITION = gql`
  mutation SaveErpRelationshipDefinition($sourceDefinitionId: String!, $input: ErpRelationshipDefinitionInput!) {
    saveErpRelationshipDefinition(sourceDefinitionId: $sourceDefinitionId, input: $input) {
      ok
      relationship {
        id
        sourceField
        targetSourceDefinitionId
        targetField
        relationshipType
        required
        active
      }
      errors { field code message }
    }
  }
`;

export const DELETE_ERP_RELATIONSHIP_DEFINITION = gql`
  mutation DeleteErpRelationshipDefinition($id: String!) {
    deleteErpRelationshipDefinition(id: $id) {
      ok
      errors { field code message }
    }
  }
`;

export const VALIDATE_ERP_LINEAGE = gql`
  mutation ValidateErpLineage($sourceDefinitionId: String!, $destinationTable: String!) {
    validateErpLineage(sourceDefinitionId: $sourceDefinitionId, destinationTable: $destinationTable) {
      ok
      results {
        id
        severity
        entity
        fieldName
        rowNumber
        ruleCode
        message
        recommendedAction
      }
      totalErrors
      totalWarnings
      totalInfo
      errors { field code message }
    }
  }
`;
