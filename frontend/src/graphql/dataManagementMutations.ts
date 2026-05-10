import { gql } from "@apollo/client";

export const UPDATE_RESOURCE_GROUP = gql`
  mutation UpdateResourceGroup($id: String!, $input: ResourceGroupInput!) {
    updateResourceGroup(id: $id, input: $input) {
      id
      name
      code
      status
      groupType
      members
      leader
    }
  }
`;

export const DELETE_RESOURCE_GROUP = gql`
  mutation DeleteResourceGroup($id: String!) {
    deleteResourceGroup(id: $id) {
      success
      message
    }
  }
`;
