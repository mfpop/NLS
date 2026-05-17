import { gql } from "@apollo/client";

export const APPLICATION_SETTINGS_QUERY = gql`
  query ApplicationSettings($category: String) {
    applicationSettings(category: $category) {
      key
      category
      valueType
      value
      description
      updatedAt
    }
  }
`;
