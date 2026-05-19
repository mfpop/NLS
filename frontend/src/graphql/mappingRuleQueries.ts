import { gql } from "@apollo/client";

export const MAPPING_RULES_QUERY = gql`
  query MappingRules($domain: String, $activeOnly: Boolean, $sortBy: String, $sortOrder: String, $offset: Int, $limit: Int) {
    mappingRules(domain: $domain, activeOnly: $activeOnly, sortBy: $sortBy, sortOrder: $sortOrder, offset: $offset, limit: $limit) {
      items {
        id domain sourceField destinationField transformRule isRequired isActive createdAt updatedAt
      }
      pageInfo {
        totalCount hasNextPage offset limit
      }
    }
    importSourceConfigs(isActive: true) {
      items {
        id name domain
      }
    }
  }
`;

export const MAPPING_RULES_SIMPLE_QUERY = gql`
  query MappingRulesSimple($domain: String, $activeOnly: Boolean) {
    mappingRules(domain: $domain, activeOnly: $activeOnly) {
      items {
        id domain sourceField destinationField transformRule isRequired isActive
      }
    }
  }
`;

export const DOMAINS = ["PLANT_STRUCTURE", "MATERIALS", "BOM", "ROUTING", "SCHEDULES", "INVENTORY", "PRODUCTS"] as const;

export interface MappingRuleFields {
  id: string;
  domain: string;
  sourceField: string;
  destinationField: string;
  transformRule?: string | null;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImportSourceRef {
  id: string;
  name: string;
  domain: string;
}
