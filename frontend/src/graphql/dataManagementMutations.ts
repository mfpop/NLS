import { gql } from "@apollo/client";

export const CREATE_RESOURCE_GROUP = gql`
  mutation CreateResourceGroup($name: String!, $departmentId: String!, $code: String, $status: String, $groupType: String, $members: Int, $leader: String) {
    createResourceGroup(name: $name, departmentId: $departmentId, code: $code, status: $status, groupType: $groupType, members: $members, leader: $leader) {
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

export const CREATE_RESOURCE = gql`
  mutation CreateResource($name: String!, $resourceGroupId: String!, $code: String, $status: String) {
    createResource(name: $name, resourceGroupId: $resourceGroupId, code: $code, status: $status) {
      id
      name
      code
      status
    }
  }
`;
