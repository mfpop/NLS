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
      taxId
      description
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
        taxId
        description
      }
      errors {
        field
        message
      }
    }
  }
`;
