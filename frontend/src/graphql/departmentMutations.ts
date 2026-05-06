import { gql } from "@apollo/client";

export const CREATE_DEPARTMENT_MUTATION = gql`
  mutation CreateDepartment($input: DepartmentInput!) {
    createDepartment(input: $input) {
      department {
        id
        code
        name
        status
        manager
        employees
        groupCount
        resourceCount
        createdAt
        updatedAt
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_DEPARTMENT_MUTATION = gql`
  mutation UpdateDepartment($id: String!, $input: DepartmentInput!) {
    updateDepartment(id: $id, input: $input) {
      department {
        id
        code
        name
        status
        manager
        employees
        groupCount
        resourceCount
        createdAt
        updatedAt
      }
      errors {
        field
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
