import { gql } from "@apollo/client";

const LINE_FIELDS = `
  id
  code
  name
  description
  status
  plantId
  plantName
  shiftPattern
  isConstraint
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
