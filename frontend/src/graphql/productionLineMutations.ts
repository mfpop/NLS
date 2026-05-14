import { gql } from "@apollo/client";

const FAMILY_ASSIGNMENT_FIELDS = `
  id
  name
  code
  isPrimary
  status
`;

const MODEL_ASSIGNMENT_FIELDS = `
  id
  name
  code
  familyId
  familyName
  isPrimary
  status
`;

export const ASSIGN_FAMILIES_MUTATION = gql`
  mutation AssignFamiliesToProductionLine($productionLineId: String!, $familyIds: [String!]!, $primaryFamilyId: String) {
    assignFamiliesToProductionLine(productionLineId: $productionLineId, familyIds: $familyIds, primaryFamilyId: $primaryFamilyId) {
      ok
      assignments {
        ${FAMILY_ASSIGNMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REMOVE_FAMILY_MUTATION = gql`
  mutation RemoveFamilyFromProductionLine($productionLineId: String!, $familyId: String!) {
    removeFamilyFromProductionLine(productionLineId: $productionLineId, familyId: $familyId) {
      ok
      assignments {
        ${FAMILY_ASSIGNMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ASSIGN_MODELS_MUTATION = gql`
  mutation AssignModelsToProductionLine($productionLineId: String!, $modelIds: [String!]!, $primaryModelId: String) {
    assignModelsToProductionLine(productionLineId: $productionLineId, modelIds: $modelIds, primaryModelId: $primaryModelId) {
      ok
      assignments {
        ${MODEL_ASSIGNMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REMOVE_MODEL_MUTATION = gql`
  mutation RemoveModelFromProductionLine($productionLineId: String!, $modelId: String!) {
    removeModelFromProductionLine(productionLineId: $productionLineId, modelId: $modelId) {
      ok
      assignments {
        ${MODEL_ASSIGNMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const SET_PRIMARY_FAMILY_MUTATION = gql`
  mutation SetPrimaryProductionLineFamily($productionLineId: String!, $familyId: String!) {
    setPrimaryProductionLineFamily(productionLineId: $productionLineId, familyId: $familyId) {
      ok
      assignments {
        ${FAMILY_ASSIGNMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const SET_PRIMARY_MODEL_MUTATION = gql`
  mutation SetPrimaryProductionLineModel($productionLineId: String!, $modelId: String!) {
    setPrimaryProductionLineModel(productionLineId: $productionLineId, modelId: $modelId) {
      ok
      assignments {
        ${MODEL_ASSIGNMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;
