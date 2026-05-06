import { gql } from "@apollo/client";

export const PROFILE_QUERY = gql`
    query Profile {
    profile {
      id
      name
      role
      email
      phone
      location
      plant
      department
      reportsTo
      language
      about
      createdAt
      updatedAt
      workHistory {
        id
        role
        company
        period
        description
      }
      education {
        id
        degree
        school
        period
      }
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: ProfileInput!) {
    updateProfile(input: $input) {
      profile {
        id
        name
        role
        email
        phone
        location
        department
        reportsTo
        language
        about
        createdAt
        updatedAt
        workHistory {
          id
          role
          company
          period
          description
        }
        education {
          id
          degree
          school
          period
        }
      }
      errors {
        field
        message
      }
    }
  }
`;
