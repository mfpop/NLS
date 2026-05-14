import { gql } from "@apollo/client";

export const UPDATE_RESOURCE_GROUP = gql`
  mutation UpdateResourceGroup($id: String!, $input: ResourceGroupInput!) {
    updateResourceGroup(id: $id, input: $input) {
      ok
      resourceGroup {
        id
        code
        name
        description
        status
        statusId
        departmentId
        departmentName
        members
        leader
        groupTypeId
        resourceCount
        resourceType
        createdAt
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

export const CREATE_RESOURCE_GROUP = gql`
  mutation CreateResourceGroup($input: ResourceGroupInput!) {
    createResourceGroup(input: $input) {
      ok
      resourceGroup {
        id
        code
        name
        description
        status
        statusId
        departmentId
        departmentName
        members
        leader
        groupTypeId
        resourceCount
        resourceType
        createdAt
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

export const DELETE_RESOURCE_GROUP = gql`
  mutation ArchiveResourceGroup($id: String!) {
    archiveResourceGroup(id: $id) {
      ok
      resourceGroup {
        id
        status
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
