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

export const WAREHOUSES_QUERY = gql`
  query Warehouses($plantId: String, $isActive: Boolean, $limit: Int, $offset: Int) {
    warehouses(plantId: $plantId, isActive: $isActive, limit: $limit, offset: $offset) {
      ${WAREHOUSE_FIELDS}
    }
  }
`;

export const WAREHOUSE_QUERY = gql`
  query Warehouse($id: String!) {
    warehouse(id: $id) {
      ${WAREHOUSE_FIELDS}
    }
  }
`;


