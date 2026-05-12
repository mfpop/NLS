import { gql } from "@apollo/client";

const COMPANY_FIELDS = `
  id
  code
  name
  legalName
  description
  industryType
  industryTypeId
  status
  statusId
  address
  city
  state
  country
  countryId
  phone
  email
  website
  operatingSince
  manufacturingFocus
  productLines
  productLineRefs {
    id
    name
    code
    isActive
  }
  leanMethodology
  leanMethodologyRefs {
    id
    name
    code
    isActive
  }
  defaultTimezone
  defaultTimezoneId
  defaultLanguage
  defaultLanguageId
  defaultCalendar
  defaultCalendarId
  defaultShiftModel
  defaultShiftModelId
  weekStartDay
  weekStartDayId
  adminName
  adminRole
  zipcode
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
      ok
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

export const CREATE_COMPANY_MUTATION = gql`
  mutation CreateCompany($input: CompanyInput!) {
    createCompany(input: $input) {
      ok
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

export const DELETE_COMPANY_MUTATION = gql`
  mutation DeleteCompany {
    deleteCompany {
      ok
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
