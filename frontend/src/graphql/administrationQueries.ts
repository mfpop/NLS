import { gql } from "@apollo/client";

export const ADMINISTRATIVE_DEPARTMENTS_QUERY = gql`
  query AdministrativeDepartments($companyId: String, $plantId: String, $isActive: Boolean) {
    administrativeDepartments(companyId: $companyId, plantId: $plantId, isActive: $isActive) {
      id
      companyId
      companyName
      plantId
      plantName
      code
      name
      description
      managerId
      managerName
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const ADMINISTRATIVE_DEPARTMENT_QUERY = gql`
  query AdministrativeDepartment($id: String!) {
    administrativeDepartment(id: $id) {
      id
      companyId
      companyName
      plantId
      plantName
      code
      name
      description
      managerId
      managerName
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const USER_PROFILES_QUERY = gql`
  query UserProfiles($companyId: String, $plantId: String, $administrativeDepartmentId: String, $isActive: Boolean, $search: String) {
    userProfiles(companyId: $companyId, plantId: $plantId, administrativeDepartmentId: $administrativeDepartmentId, isActive: $isActive, search: $search) {
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
  }
`;

export const USER_PROFILE_QUERY = gql`
  query UserProfile($id: String!) {
    userProfile(id: $id) {
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
  }
`;

export const ROLES_QUERY = gql`
  query Roles($isActive: Boolean) {
    roles(isActive: $isActive) {
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
        description
        module
        action
        isActive
      }
    }
  }
`;

export const ROLE_QUERY = gql`
  query Role($id: String!) {
    role(id: $id) {
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
        description
        module
        action
        isActive
      }
    }
  }
`;

export const PERMISSIONS_QUERY = gql`
  query Permissions {
    permissions {
      id
      code
      name
      description
      module
      action
      isActive
    }
  }
`;

export const USER_ROLES_QUERY = gql`
  query UserRoles($userProfileId: String!) {
    userRoles(userProfileId: $userProfileId) {
      id
      userProfileId
      username
      fullName
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
  }
`;

export const USER_PERMISSIONS_QUERY = gql`
  query UserPermissions($userProfileId: String!) {
    userPermissions(userProfileId: $userProfileId) {
      id
      code
      name
      description
      module
      action
      isActive
    }
  }
`;

export const COMPANIES_LIST_QUERY = gql`
  query CompaniesList {
    companies {
      id
      code
      name
    }
  }
`;

export const USERS_LIST_QUERY = gql`
  query UsersList {
    usersList {
      id
      username
      fullName
    }
  }
`;
