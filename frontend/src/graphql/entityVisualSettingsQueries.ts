import { gql } from "@apollo/client";

export const ENTITY_VISUAL_SETTINGS_QUERY = gql`
  query EntityVisualSettings {
    entityVisualSettings {
      id
      entityType
      displayLabel
      iconKey
      colorKey
      description
      sortOrder
      isSystem
      isActive
    }
  }
`;

export const UPDATE_ENTITY_VISUAL_SETTING_MUTATION = gql`
  mutation UpdateEntityVisualSetting(
    $entityType: String!
    $displayLabel: String
    $iconKey: String
    $colorKey: String
    $description: String
    $sortOrder: Int
    $isActive: Boolean
  ) {
    updateEntityVisualSetting(
      entityType: $entityType
      displayLabel: $displayLabel
      iconKey: $iconKey
      colorKey: $colorKey
      description: $description
      sortOrder: $sortOrder
      isActive: $isActive
    ) {
      setting {
        id
        entityType
        displayLabel
        iconKey
        colorKey
        description
        sortOrder
        isSystem
        isActive
      }
      errors { field message }
    }
  }
`;

export const RESET_ENTITY_VISUAL_SETTING_MUTATION = gql`
  mutation ResetEntityVisualSetting($entityType: String!) {
    resetEntityVisualSettingToDefault(entityType: $entityType) {
      setting {
        id
        entityType
        displayLabel
        iconKey
        colorKey
        description
        sortOrder
        isSystem
        isActive
      }
      errors { field message }
    }
  }
`;

export const DEFAULT_SEED: EntityVisualSetting[] = [
  { entityType: "company",       displayLabel: "Company",        iconKey: "landmark",          colorKey: "emerald", description: "Parent organization entity", sortOrder: 1, isSystem: true, isActive: true },
  { entityType: "plant",         displayLabel: "Plant",          iconKey: "factory",           colorKey: "blue",    description: "Manufacturing facility",    sortOrder: 2, isSystem: true, isActive: true },
  { entityType: "productionLine",displayLabel: "Production Line",iconKey: "trending-up-down",  colorKey: "amber",   description: "Production line",           sortOrder: 3, isSystem: true, isActive: true },
  { entityType: "department",    displayLabel: "Department",     iconKey: "layers",            colorKey: "purple",  description: "Department within plant",   sortOrder: 4, isSystem: true, isActive: true },
  { entityType: "resourceGroup", displayLabel: "Resource Group", iconKey: "component",         colorKey: "rose",    description: "Group of resources",        sortOrder: 5, isSystem: true, isActive: true },
  { entityType: "resource",      displayLabel: "Resource",       iconKey: "dumbbell",          colorKey: "gray",    description: "Individual resource",       sortOrder: 6, isSystem: true, isActive: true },
];

export interface EntityVisualSetting {
  id?: string;
  entityType: string;
  displayLabel: string;
  iconKey: string;
  colorKey: string;
  description?: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
}
