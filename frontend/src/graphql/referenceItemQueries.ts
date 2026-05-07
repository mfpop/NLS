import { gql } from "@apollo/client";

export const REFERENCE_ITEMS_QUERY = gql`
  query ReferenceItems($tableType: String) {
    referenceItems(tableType: $tableType, activeOnly: true) {
      id
      tableType
      code
      name
      description
      isActive
      sortOrder
    }
  }
`;

export const CREATE_REFERENCE_ITEM_MUTATION = gql`
  mutation CreateReferenceItem($input: ReferenceItemInput!) {
    createReferenceItem(input: $input) {
      item {
        id
        tableType
        code
        name
        description
        isActive
        sortOrder
      }
      errors { field message }
    }
  }
`;

export const UPDATE_REFERENCE_ITEM_MUTATION = gql`
  mutation UpdateReferenceItem($id: String!, $input: ReferenceItemInput!) {
    updateReferenceItem(id: $id, input: $input) {
      item {
        id
        tableType
        code
        name
        description
        isActive
        sortOrder
      }
      errors { field message }
    }
  }
`;

export const DEACTIVATE_REFERENCE_ITEM_MUTATION = gql`
  mutation DeactivateReferenceItem($id: String!) {
    deactivateReferenceItem(id: $id) {
      item {
        id
        isActive
      }
      errors { field message }
    }
  }
`;
