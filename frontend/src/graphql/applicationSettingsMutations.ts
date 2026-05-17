import { gql } from "@apollo/client";

export const UPDATE_APPLICATION_SETTINGS = gql`
  mutation UpdateApplicationSettings($settings: [ApplicationSettingInput!]!) {
    updateApplicationSettings(settings: $settings) {
      ok
      settings {
        key
        category
        valueType
        value
        description
        updatedAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;
