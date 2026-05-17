import { gql } from "@apollo/client";

const DEPT_FIELDS = `
  id
  departmentId
  code
  name
  plantId
  plant {
    id
    name
    code
    status
  }
  description
  status
  statusId
  manager
  managerRef {
    id
    name
  }
  supervisorName
  supervisor {
    id
    name
  }
  employees
  employeeCount
  productionLineCount
  productionLines {
    id
    code
    name
    plantId
    plantName
    status
  }
  groupCount
  groupName
  resourceGroupCount
  resourceCount
  resourceGroups {
    id
    code
    name
    status
    resourceCount
  }
  createdAt
  updatedAt
`;

const RG_FIELDS = `
  id
  code
  name
  companyId
  companyName
  description
  status
  statusId
  statusRef {
    id
    name
    code
    isActive
  }
  departmentId
  departmentName
  plantId
  plantName
  members
  leader
  supervisor
  groupTypeId
  groupTypeRef {
    id
    name
    code
    isActive
  }
  capabilityType
  shiftPatternId
  shiftPatternRef {
    id
    name
    code
    isActive
  }
  capacityModel
  oeeTarget
  assignedResourceCount
  isBottleneck
  isConstraint
  resourceCount
  resourceType
  createdAt
  updatedAt
  latestCapacity {
    availableMinutes
    theoreticalCapacity
    effectiveCapacity
    bottleneckCapacity
    capacityUom
    machineCapacityUnits
    laborCapacityUnits
    effectiveCapacityUnits
    constraintReason
    machineAvailableMinutes
    laborAvailableMinutes
    operatorsRequired
    operatorsAvailable
    snapshotType
    status
    version
    fromDatetime
    toDatetime
    calculatedAt
  }
  scheduleStatus
  resolvedScheduleSource
  resolvedScheduleName
  resolvedShiftName
  resolvedSchedule {
    source
    calendarName
    shiftName
    timezone
    weekStart
    isConfigured
  }
`;

export const MATERIAL_BIN_FIELDS = `
  id
  plantId
  plantName
  resourceGroupId
  resourceGroupName
  code
  name
  binType
  materialId
  materialCode
  materialName
  capacity
  uomId
  uomName
  locationCode
  isActive
  createdAt
  updatedAt
`;

export const CAPACITY_SNAPSHOT_FIELDS = `
  id
  scopeType
  scopeId
  availableMinutes
  theoreticalCapacity
  effectiveCapacity
  bottleneckCapacity
  capacityUom
  machineCapacityUnits
  laborCapacityUnits
  effectiveCapacityUnits
  constraintReason
  machineAvailableMinutes
  laborAvailableMinutes
  operatorsRequired
  operatorsAvailable
  fromDatetime
  toDatetime
  snapshotType
  status
  version
  calculatedAt
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
  departmentId
  departmentName
  plantId
  plantName
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
  query Departments($productionLineId: String, $status: String, $search: String, $limit: Int, $offset: Int) {
    departments(productionLineId: $productionLineId, status: $status, search: $search, limit: $limit, offset: $offset) {
      ${DEPT_FIELDS}
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

export const MATERIAL_BINS_QUERY = gql`
  query MaterialBins($plantId: String, $resourceGroupId: String, $binType: String, $isActive: Boolean, $limit: Int, $offset: Int) {
    materialBins(plantId: $plantId, resourceGroupId: $resourceGroupId, binType: $binType, isActive: $isActive, limit: $limit, offset: $offset) {
      ${MATERIAL_BIN_FIELDS}
    }
  }
`;

export const CAPACITY_SNAPSHOTS_QUERY = gql`
  query CapacitySnapshots(
    $resourceGroupId: String
    $snapshotType: String
    $status: String
    $limit: Int
    $offset: Int
  ) {
    capacitySnapshots(
      resourceGroupId: $resourceGroupId
      snapshotType: $snapshotType
      status: $status
      limit: $limit
      offset: $offset
    ) {
      items {
        ${CAPACITY_SNAPSHOT_FIELDS}
      }
      total
      limit
      offset
      hasMore
    }
  }
`;

export const MATERIAL_BIN_QUERY = gql`
  query MaterialBin($id: String!) {
    materialBin(id: $id) {
      ${MATERIAL_BIN_FIELDS}
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

export const REFERENCE_TABLES_LIST_QUERY = gql`
  query ReferenceTablesList {
    referenceTablesList {
      categoryId
      categoryCode
      categoryName
      totalCount
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

