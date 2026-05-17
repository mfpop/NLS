import { gql } from "@apollo/client";

const DEPARTMENT_FIELDS = `
  id
  departmentId
  code
  name
  plantId
  plant { id name code status }
  description
  status
  statusId
  manager
  managerRef { id name }
  supervisorName
  supervisor { id name }
  employees
  employeeCount
  productionLineCount
  productionLines { id code name plantId plantName status }
  groupCount
  groupName
  resourceGroupCount
  resourceCount
  resourceGroups { id code name status resourceCount }
  createdAt
  updatedAt
`;

export const CREATE_DEPARTMENT_MUTATION = gql`
  mutation CreateDepartment($input: DepartmentInput!) {
    createDepartment(input: $input) {
      ok
      department {
        ${DEPARTMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_DEPARTMENT_MUTATION = gql`
  mutation UpdateDepartment($id: String!, $input: DepartmentInput!) {
    updateDepartment(id: $id, input: $input) {
      ok
      department {
        ${DEPARTMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const DELETE_DEPARTMENT_MUTATION = gql`
  mutation DeleteDepartment($id: String!) {
    deleteDepartment(id: $id) {
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

export const ASSIGN_DEPARTMENT_TO_LINES_MUTATION = gql`
  mutation AssignDepartmentToProductionLines($input: AssignDepartmentToLinesInput!) {
    assignDepartmentToProductionLines(input: $input) {
      ok
      department {
        ${DEPARTMENT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ASSIGN_DEPARTMENT_TO_LINE_MUTATION = gql`
  mutation AssignDepartmentToProductionLine($input: AssignDepartmentInput!) {
    assignDepartmentToProductionLine(input: $input) {
      ok
      assignment {
        id
        plantId
        productionLineId
        departmentId
        sequence
        status
        createdAt
        updatedAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REMOVE_DEPARTMENT_FROM_LINE_MUTATION = gql`
  mutation RemoveDepartmentFromProductionLine($productionLineId: String!, $departmentId: String!) {
    removeDepartmentFromProductionLine(productionLineId: $productionLineId, departmentId: $departmentId) {
      ok
      assignment {
        id
      }
      errors {
        field
        code
        message
      }
    }
  }
`;
