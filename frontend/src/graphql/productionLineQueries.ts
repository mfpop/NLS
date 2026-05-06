import { gql } from "@apollo/client";

export const PRODUCTION_LINES_QUERY = gql`
  query ProductionLines($search: String, $status: String, $limit: Int, $offset: Int) {
    productionLines(search: $search, status: $status, limit: $limit, offset: $offset) {
      items {
        id
        code
        name
        status
        plantName
        plantId
        modelsProduced
        shiftPattern
        isConstraint
        departmentCount
        groupCount
        resourceCount
        createdAt
        updatedAt
      }
      totalCount
      page
      pageSize
      totalPages
    }
  }
`;

export const PRODUCTION_LINE_QUERY = gql`
  query ProductionLine($id: String!) {
    productionLine(id: $id) {
      id
      code
      name
      status
      plantName
      plantId
      modelsProduced
      shiftPattern
      isConstraint
      departmentCount
      groupCount
      resourceCount
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PRODUCTION_LINE_MUTATION = gql`
  mutation CreateProductionLine($name: String!, $code: String!, $plantId: String!, $status: String, $modelsProduced: String, $shiftPattern: String, $isConstraint: Boolean) {
    createProductionLine(name: $name, code: $code, plantId: $plantId, status: $status, modelsProduced: $modelsProduced, shiftPattern: $shiftPattern, isConstraint: $isConstraint) {
      id
      code
      name
      status
      plantName
      plantId
      modelsProduced
      shiftPattern
      isConstraint
      departmentCount
      groupCount
      resourceCount
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PRODUCTION_LINE_MUTATION = gql`
  mutation UpdateProductionLine($id: String!, $name: String!, $code: String!, $plantId: String!, $status: String, $modelsProduced: String, $shiftPattern: String, $isConstraint: Boolean) {
    updateProductionLine(id: $id, name: $name, code: $code, plantId: $plantId, status: $status, modelsProduced: $modelsProduced, shiftPattern: $shiftPattern, isConstraint: $isConstraint) {
      id
      code
      name
      status
      plantName
      plantId
      modelsProduced
      shiftPattern
      isConstraint
      departmentCount
      groupCount
      resourceCount
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_PRODUCTION_LINE_MUTATION = gql`
  mutation DeleteProductionLine($id: String!) {
    deleteProductionLine(id: $id) {
      success
      inUse
      message
      errors {
        field
        message
      }
    }
  }
`;

export const TOGGLE_PRODUCTION_LINE_STATUS_MUTATION = gql`
  mutation ToggleProductionLineStatus($id: String!) {
    toggleProductionLineStatus(id: $id) {
      id
      name
      status
    }
  }
`;
