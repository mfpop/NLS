import { gql } from "@apollo/client";

const WAREHOUSE_FIELDS = `
  id
  plantId
  plantName
  code
  name
  warehouseType
  location
  isActive
  createdAt
  updatedAt
`;

export const CREATE_WAREHOUSE_MUTATION = gql`
  mutation CreateWarehouse($input: WarehouseInput!) {
    createWarehouse(input: $input) {
      ok
      warehouse {
        ${WAREHOUSE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_WAREHOUSE_MUTATION = gql`
  mutation UpdateWarehouse($id: String!, $input: WarehouseInput!) {
    updateWarehouse(id: $id, input: $input) {
      ok
      warehouse {
        ${WAREHOUSE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ARCHIVE_WAREHOUSE_MUTATION = gql`
  mutation ArchiveWarehouse($id: String!) {
    archiveWarehouse(id: $id) {
      ok
      warehouse {
        ${WAREHOUSE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;
