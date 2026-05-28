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

const ASSIGNED_RG_FIELDS = `
  id
  resourceGroupId
  resourceGroupCode
  resourceGroupName
  departmentName
  sequence
  isActive
`;

export const ASSIGN_RG_TO_LINE_MUTATION = gql`
  mutation AssignResourceGroupToProductionLine($productionLineId: String!, $resourceGroupId: String!) {
    assignResourceGroupToProductionLine(productionLineId: $productionLineId, resourceGroupId: $resourceGroupId) {
      ok
      productionLine {
        id
        assignedResourceGroups {
          ${ASSIGNED_RG_FIELDS}
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REMOVE_RG_FROM_LINE_MUTATION = gql`
  mutation RemoveResourceGroupFromProductionLine($productionLineId: String!, $resourceGroupId: String!) {
    removeResourceGroupFromProductionLine(productionLineId: $productionLineId, resourceGroupId: $resourceGroupId) {
      ok
      productionLine {
        id
        assignedResourceGroups {
          ${ASSIGNED_RG_FIELDS}
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REORDER_LINE_RGS_MUTATION = gql`
  mutation ReorderProductionLineResourceGroups($productionLineId: String!, $orderedResourceGroupIds: [String!]!) {
    reorderProductionLineResourceGroups(productionLineId: $productionLineId, orderedResourceGroupIds: $orderedResourceGroupIds) {
      ok
      productionLine {
        id
        assignedResourceGroups {
          ${ASSIGNED_RG_FIELDS}
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ACTIVATE_LINE_RG_MUTATION = gql`
  mutation ActivateProductionLineResourceGroup($productionLineId: String!, $resourceGroupId: String!) {
    activateProductionLineResourceGroup(productionLineId: $productionLineId, resourceGroupId: $resourceGroupId) {
      ok
      productionLine {
        id
        assignedResourceGroups {
          ${ASSIGNED_RG_FIELDS}
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const DEACTIVATE_LINE_RG_MUTATION = gql`
  mutation DeactivateProductionLineResourceGroup($productionLineId: String!, $resourceGroupId: String!) {
    deactivateProductionLineResourceGroup(productionLineId: $productionLineId, resourceGroupId: $resourceGroupId) {
      ok
      productionLine {
        id
        assignedResourceGroups {
          ${ASSIGNED_RG_FIELDS}
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;
