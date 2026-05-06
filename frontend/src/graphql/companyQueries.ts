import { gql } from "@apollo/client";

export const COMPANY_QUERY = gql`
  query Company($id: String) {
    company(id: $id) {
      id
      code
      name
      address
      phone
      email
      website
      description
      industryType
      manufacturingType
      defaultTimezone
      defaultUnits
      defaultShiftModel
      productionCalendar
      defaultLanguage
      leanMethodology
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_COMPANY_MUTATION = gql`
  mutation UpdateCompany($input: CompanyInput!) {
    updateCompany(input: $input) {
      company {
        id
        code
        name
        address
        phone
        email
        website
        description
        industryType
        manufacturingType
        defaultTimezone
        defaultUnits
        defaultShiftModel
        productionCalendar
        defaultLanguage
        leanMethodology
      }
      errors {
        field
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
