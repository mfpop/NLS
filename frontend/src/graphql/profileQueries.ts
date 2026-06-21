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

export const PROFILE_SKILLS_QUERY = gql`
  query ProfileSkills($userProfileId: String!) {
    profileSkills(userProfileId: $userProfileId) {
      id
      userProfileId
      name
      category
      level
      issuer
      issuedDate
      expiresDate
      notes
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PROFILE_SKILL_MUTATION = gql`
  mutation CreateProfileSkill($input: CreateProfileSkillInput!) {
    createProfileSkill(input: $input) {
      skill {
        id
        userProfileId
        name
        category
        level
        issuer
        issuedDate
        expiresDate
        notes
        isActive
        createdAt
        updatedAt
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_PROFILE_SKILL_MUTATION = gql`
  mutation UpdateProfileSkill($id: String!, $input: UpdateProfileSkillInput!) {
    updateProfileSkill(id: $id, input: $input) {
      skill {
        id
        userProfileId
        name
        category
        level
        issuer
        issuedDate
        expiresDate
        notes
        isActive
        createdAt
        updatedAt
      }
      errors {
        field
        message
      }
    }
  }
`;

export const ARCHIVE_PROFILE_SKILL_MUTATION = gql`
  mutation ArchiveProfileSkill($id: String!) {
    archiveProfileSkill(id: $id) {
      skill {
        id
        userProfileId
        name
        category
        level
        issuer
        issuedDate
        expiresDate
        notes
        isActive
        createdAt
        updatedAt
      }
      errors {
        field
        message
      }
    }
  }
`;
