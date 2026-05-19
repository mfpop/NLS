import { gql } from "@apollo/client";

export const CREATE_MAPPING_RULE = gql`
  mutation CreateMappingRule($input: MappingRuleInput!) {
    createMappingRule(input: $input) {
      ok
      rule { id domain sourceField destinationField transformRule isRequired isActive createdAt updatedAt }
      errors { field code message }
    }
  }
`;

export const UPDATE_MAPPING_RULE = gql`
  mutation UpdateMappingRule($id: String!, $input: MappingRuleInput!) {
    updateMappingRule(id: $id, input: $input) {
      ok
      rule { id domain sourceField destinationField transformRule isRequired isActive createdAt updatedAt }
      errors { field code message }
    }
  }
`;

export const ARCHIVE_MAPPING_RULE = gql`
  mutation ArchiveMappingRule($id: String!) {
    archiveMappingRule(id: $id) {
      ok
      errors { field code message }
    }
  }
`;

export const RESTORE_MAPPING_RULE = gql`
  mutation RestoreMappingRule($id: String!) {
    restoreMappingRule(id: $id) {
      ok
      rule { id domain sourceField destinationField transformRule isRequired isActive }
      errors { field code message }
    }
  }
`;
