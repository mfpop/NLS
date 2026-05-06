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

export const RESOURCE_GROUPS_QUERY = gql`
  query ResourceGroups($search: String, $type: String) {
    resourceGroups(search: $search, type: $type) {
      id
      name
      groupType
      status
      members
      leader
      department
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
      lineName
      lineId
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
      entryCount
      description
      createdAt
      updatedAt
    }
  }
`;
