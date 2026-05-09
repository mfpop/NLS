import { gql } from "@apollo/client";

export const DEPARTMENTS_QUERY = gql`
  query Departments($search: String, $status: String) {
    departments(search: $search, status: $status) {
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
  }
`;

export const DEPARTMENT_QUERY = gql`
  query Department($id: String!) {
    department(id: $id) {
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
  }
`;

export const RESOURCE_GROUPS_QUERY = gql`
  query ResourceGroups($search: String, $type: String) {
    resourceGroups(search: $search, type: $type) {
      id
      code
      name
      groupType
      status
      members
      leader
      departmentName
      departmentId
      plantName
      plantId
      resourceCount
      createdAt
      updatedAt
    }
  }
`;

export const RESOURCE_GROUP_QUERY = gql`
  query ResourceGroup($id: String!) {
    resourceGroup(id: $id) {
      id
      code
      name
      groupType
      status
      members
      leader
      departmentName
      departmentId
      plantName
      plantId
      resourceCount
      createdAt
      updatedAt
    }
  }
`;

export const RESOURCES_QUERY = gql`
  query Resources($search: String, $status: String) {
    resources(search: $search, status: $status) {
      id
      name
      code
      resourceType
      status
      opStatus
      utilization
      shift
      lastActivity
      flowPosition
      groupName
      groupId
      departmentName
      departmentId
      plantName
      plantId
      createdAt
      updatedAt
    }
  }
`;

export const REFERENCE_TABLES_QUERY = gql`
  query ReferenceTables($search: String, $status: String) {
    referenceTables(search: $search, status: $status) {
      id
      name
      status
      group
      entryCount
      description
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_REFERENCE_TABLE_MUTATION = gql`
  mutation CreateReferenceTable($input: ReferenceTableInput!) {
    createReferenceTable(input: $input) {
      table {
        id
        name
        status
        group
        entryCount
        description
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_REFERENCE_TABLE_MUTATION = gql`
  mutation UpdateReferenceTable($id: String!, $input: ReferenceTableInput!) {
    updateReferenceTable(id: $id, input: $input) {
      table {
        id
        name
        status
        group
        entryCount
        description
      }
      errors {
        field
        message
      }
    }
  }
`;

export const DELETE_REFERENCE_TABLE_MUTATION = gql`
  mutation DeleteReferenceTable($id: String!) {
    deleteReferenceTable(id: $id) {
      success
      errors {
        field
        message
      }
    }
  }
`;
