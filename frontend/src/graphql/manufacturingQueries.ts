import { gql } from "@apollo/client";

const DEPT_FIELDS = `
  id
  departmentId
  code
  name
  description
  status
  statusId
  manager
  employees
  groupCount
  groupName
  createdAt
  updatedAt
`;

const RG_FIELDS = `
  id
  code
  name
  description
  status
  statusId
  departmentId
  departmentName
  members
  leader
  groupTypeId
  resourceCount
  resourceType
  createdAt
  updatedAt
`;

const RES_FIELDS = `
  id
  code
  name
  description
  status
  statusId
  resourceGroupId
  resourceGroupName
  resourceTypeId
  utilization
  opStatus
  lastActivity
  shiftPattern
  createdAt
  updatedAt
`;

const LINE_FIELDS = `
  id
  code
  name
  description
  status
  statusId
  plantId
  plantName
  shiftPattern
  shiftPatternId
  isConstraint
  lineCount
  modelsProduced
  createdAt
  updatedAt
`;

export const DEPARTMENTS_QUERY = gql`
  query Departments($productionLineId: String, $status: String, $limit: Int, $offset: Int) {
    departments(productionLineId: $productionLineId, status: $status, limit: $limit, offset: $offset) {
      items {
        ${DEPT_FIELDS}
      }
      total
      hasMore
    }
  }
`;

export const DEPARTMENT_QUERY = gql`
  query Department($id: String!) {
    department(id: $id) {
      ${DEPT_FIELDS}
    }
  }
`;

export const RESOURCE_GROUPS_QUERY = gql`
  query ResourceGroups($departmentId: String, $limit: Int, $offset: Int) {
    resourceGroups(departmentId: $departmentId, limit: $limit, offset: $offset) {
      ${RG_FIELDS}
    }
  }
`;

export const RESOURCE_GROUP_QUERY = gql`
  query ResourceGroup($id: String!) {
    resourceGroup(id: $id) {
      ${RG_FIELDS}
    }
  }
`;

export const RESOURCES_QUERY = gql`
  query Resources($resourceGroupId: String, $limit: Int, $offset: Int) {
    resources(resourceGroupId: $resourceGroupId, limit: $limit, offset: $offset) {
      ${RES_FIELDS}
    }
  }
`;

export const RESOURCE_QUERY = gql`
  query Resource($id: String!) {
    resource(id: $id) {
      ${RES_FIELDS}
    }
  }
`;

export const PRODUCTION_LINES_QUERY = gql`
  query ProductionLines($plantId: String, $status: String, $limit: Int, $offset: Int) {
    productionLines(plantId: $plantId, status: $status, limit: $limit, offset: $offset) {
      ${LINE_FIELDS}
    }
  }
`;

export const PRODUCTION_LINE_QUERY = gql`
  query ProductionLine($id: String!) {
    productionLine(id: $id) {
      ${LINE_FIELDS}
    }
  }
`;

export const REFERENCE_TABLE_QUERY = gql`
  query ReferenceTable($category: String!) {
    referenceTable: referenceTables(category: $category) {
      categoryId
      categoryCode
      categoryName
      values {
        id
        categoryId
        code
        name
        description
        sortOrder
        isActive
        status
        createdAt
        updatedAt
      }
      totalCount
      createdAt
      updatedAt
    }
  }
`;

export const REFERENCE_CATEGORIES_QUERY = gql`
  query ReferenceCategories($limit: Int, $offset: Int) {
    referenceCategories(limit: $limit, offset: $offset) {
      items {
        id
        code
        name
        description
        status
        createdAt
        updatedAt
      }
      total
      hasMore
    }
  }
`;

export const REFERENCE_VALUES_QUERY = gql`
  query ReferenceValues($categoryId: String, $limit: Int, $offset: Int) {
    referenceValues(categoryId: $categoryId, limit: $limit, offset: $offset) {
      items {
        id
        categoryId
        code
        name
        description
        sortOrder
        isActive
        status
        createdAt
        updatedAt
      }
      total
      hasMore
    }
  }
`;

