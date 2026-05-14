import { gql } from "@apollo/client";

const FAMILY_ASSIGNMENT_FIELDS = `
  id
  name
  code
  isPrimary
  status
`;

const MODEL_ASSIGNMENT_FIELDS = `
  id
  name
  code
  familyId
  familyName
  isPrimary
  status
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
  lineType
  lineTypeId
  lineTypeRef {
    id
    code
    name
  }
  shiftPattern
  shiftPatternId
  shiftPatternRef {
    id
    code
    name
  }
  defaultCalendar
  defaultCalendarId
  defaultCalendarRef {
    id
    code
    name
  }
  weekStartDay
  weekStartDayId
  weekStartDayRef {
    id
    code
    name
  }
  timezone
  timezoneId
  timezoneRef {
    id
    code
    name
  }
  productFamily {
    ${FAMILY_ASSIGNMENT_FIELDS}
  }
  productFamilyId
  productFamilies {
    ${FAMILY_ASSIGNMENT_FIELDS}
  }
  productModels {
    ${MODEL_ASSIGNMENT_FIELDS}
  }
  productFamilyCount
  productModelCount
  primaryModelId
  primaryProductModel {
    ${MODEL_ASSIGNMENT_FIELDS}
  }
  bottleneckResourceGroupCalculated
  constraintStatus
  capacityBasis
  capacityUom
  capacityUomId
  capacityUomRef {
    id
    code
    name
  }
  bottleneckResourceGroupId
  bottleneckResourceGroup
  resourceGroupOptions {
    id
    code
    name
    departmentName
  }
  isConstraint
  departmentCount
  groupCount
  resourceCount
  departmentLinks {
    id
    sequence
    departmentId
    departmentName
    departmentCode
    resourceGroups
    resources
    schedule
    status
  }
  createdAt
  updatedAt
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

export const PRODUCT_MODELS_BY_FAMILY_QUERY = gql`
  query ProductModelsByFamily($familyId: String!) {
    productModelsByFamily(familyId: $familyId) {
      id
      name
      code
      familyId
      status
    }
  }
`;

export const CREATE_PRODUCTION_LINE_MUTATION = gql`
  mutation CreateProductionLine($input: ProductionLineInput!) {
    createProductionLine(input: $input) {
      ok
      productionLine {
        ${LINE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_PRODUCTION_LINE_MUTATION = gql`
  mutation UpdateProductionLine($id: String!, $input: ProductionLineInput!) {
    updateProductionLine(id: $id, input: $input) {
      ok
      productionLine {
        ${LINE_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ARCHIVE_PRODUCTION_LINE_MUTATION = gql`
  mutation ArchiveProductionLine($id: String!) {
    archiveProductionLine(id: $id) {
      ok
      productionLine {
        id
        code
        name
        status
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const PRODUCT_MODELS_OPTIONS_QUERY = gql`
  query ProductModelsOptions {
    productModels(limit: 500, offset: 0) {
      items {
        id
        code
        name
        status
      }
    }
  }
`;
