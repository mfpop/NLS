import { gql } from "@apollo/client";

export const CREATE_ADMINISTRATIVE_DEPARTMENT = gql`
  mutation CreateAdministrativeDepartment($input: CreateAdministrativeDepartmentInput!) {
    createAdministrativeDepartment(input: $input) {
      administrativeDepartment {
        id
        code
        name
        description
        companyId
        companyName
        plantId
        plantName
        managerId
        managerName
        isActive
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

export const UPDATE_ADMINISTRATIVE_DEPARTMENT = gql`
  mutation UpdateAdministrativeDepartment($id: String!, $input: UpdateAdministrativeDepartmentInput!) {
    updateAdministrativeDepartment(id: $id, input: $input) {
      administrativeDepartment {
        id
        code
        name
        description
        companyId
        companyName
        plantId
        plantName
        managerId
        managerName
        isActive
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

export const ARCHIVE_ADMINISTRATIVE_DEPARTMENT = gql`
  mutation ArchiveAdministrativeDepartment($id: String!) {
    archiveAdministrativeDepartment(id: $id) {
      administrativeDepartment {
        id
        isActive
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_USER_PROFILE = gql`
  mutation CreateUserProfile($input: CreateUserProfileInput!) {
    createUserProfile(input: $input) {
      userProfile {
        id
        userId
        username
        email
        fullName
        companyId
        companyName
        plantId
        plantName
        administrativeDepartmentId
        administrativeDepartmentName
        jobTitle
        phone
        isActive
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

export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($id: String!, $input: UpdateUserProfileInput!) {
    updateUserProfile(id: $id, input: $input) {
      userProfile {
        id
        userId
        username
        email
        fullName
        companyId
        companyName
        plantId
        plantName
        administrativeDepartmentId
        administrativeDepartmentName
        jobTitle
        phone
        isActive
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

export const ASSIGN_USER_ADMINISTRATIVE_DEPARTMENT = gql`
  mutation AssignUserAdministrativeDepartment($userProfileId: String!, $administrativeDepartmentId: String!) {
    assignUserAdministrativeDepartment(userProfileId: $userProfileId, administrativeDepartmentId: $administrativeDepartmentId) {
      userProfile {
        id
        administrativeDepartmentId
        administrativeDepartmentName
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ACTIVATE_USER_PROFILE = gql`
  mutation ActivateUserProfile($id: String!) {
    activateUserProfile(id: $id) {
      userProfile {
        id
        isActive
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const DEACTIVATE_USER_PROFILE = gql`
  mutation DeactivateUserProfile($id: String!) {
    deactivateUserProfile(id: $id) {
      userProfile {
        id
        isActive
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_ROLE = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      role {
        id
        code
        name
        description
        isSystemRole
        isActive
        createdAt
        updatedAt
        permissions {
          id
          code
          name
          module
          action
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_ROLE = gql`
  mutation UpdateRole($id: String!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) {
      role {
        id
        code
        name
        description
        isSystemRole
        isActive
        createdAt
        updatedAt
        permissions {
          id
          code
          name
          module
          action
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ARCHIVE_ROLE = gql`
  mutation ArchiveRole($id: String!) {
    archiveRole(id: $id) {
      role {
        id
        isActive
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ASSIGN_PERMISSION_TO_ROLE = gql`
  mutation AssignPermissionToRole($roleId: String!, $permissionId: String!) {
    assignPermissionToRole(roleId: $roleId, permissionId: $permissionId) {
      role {
        id
        permissions {
          id
          code
          name
          module
          action
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REMOVE_PERMISSION_FROM_ROLE = gql`
  mutation RemovePermissionFromRole($roleId: String!, $permissionId: String!) {
    removePermissionFromRole(roleId: $roleId, permissionId: $permissionId) {
      role {
        id
        permissions {
          id
          code
          name
          module
          action
        }
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ASSIGN_ROLE_TO_USER = gql`
  mutation AssignRoleToUser($input: AssignRoleToUserInput!) {
    assignRoleToUser(input: $input) {
      assignment {
        id
        userProfileId
        roleId
        roleCode
        roleName
        companyId
        companyName
        plantId
        plantName
        administrativeDepartmentId
        administrativeDepartmentName
        isActive
        assignedAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const REMOVE_ROLE_FROM_USER = gql`
  mutation RemoveRoleFromUser($assignmentId: String!) {
    removeRoleFromUser(assignmentId: $assignmentId) {
      assignment {
        id
        isActive
      }
      errors {
        field
        code
        message
      }
    }
  }
`;
