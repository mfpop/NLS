import { gql } from "@apollo/client";

export const CREATE_RESOURCE_GROUP = gql`
  mutation CreateResourceGroup($name: String!, $departmentId: String!, $code: String, $status: String) {
    createResourceGroup(name: $name, departmentId: $departmentId, code: $code, status: $status) {
      id
      name
      code
      status
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
