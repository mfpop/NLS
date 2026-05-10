import { gql } from "@apollo/client";

const COMPANY_FIELDS = `
  id
  code
  name
  description
  status
  address
  city
  state
  country
  phone
  email
  website
  defaultTimezone
  createdAt
  updatedAt
`;

export const COMPANY_QUERY = gql`
  query Company($id: String) {
    company(id: $id) {
      ${COMPANY_FIELDS}
    }
  }
`;

export const UPDATE_COMPANY_MUTATION = gql`
  mutation UpdateCompany($input: CompanyInput!) {
    updateCompany(input: $input) {
      company {
        ${COMPANY_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CONFIG_OPTIONS_QUERY = gql`
  query ConfigOptions($category: String) {
    configOptions(category: $category) {
      category
      value
      label
      sortOrder
    }
  }
`;
