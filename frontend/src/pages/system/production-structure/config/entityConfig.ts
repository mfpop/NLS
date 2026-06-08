import { Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell, Warehouse } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface EntityConfigItem {
  icon: LucideIcon;
  color: string;
  borderTop: string;
  label: string;
}

export const ENTITY_CONFIG: Record<string, EntityConfigItem> = {
  company: {
    icon: Landmark,
    color: "text-entity-company bg-entity-company-bg",
    borderTop: "border-t-entity-company",
    label: "Company",
  },
  plant: {
    icon: Factory,
    color: "text-entity-plant bg-entity-plant-bg",
    borderTop: "border-t-entity-plant",
    label: "Plant",
  },
  productionLine: {
    icon: TrendingUpDown,
    color: "text-entity-line bg-entity-line-bg",
    borderTop: "border-t-entity-line",
    label: "Production Line",
  },
  line: {
    icon: TrendingUpDown,
    color: "text-entity-line bg-entity-line-bg",
    borderTop: "border-t-entity-line",
    label: "Line",
  },
  lineGroup: {
    icon: TrendingUpDown,
    color: "text-entity-line bg-entity-line-bg",
    borderTop: "border-t-entity-line",
    label: "Line Group",
  },
  department: {
    icon: Layers,
    color: "text-entity-department bg-entity-department-bg",
    borderTop: "border-t-entity-department",
    label: "Department",
  },
  resourceGroup: {
    icon: Component,
    color: "text-entity-resource-group bg-entity-resource-group-bg",
    borderTop: "border-t-entity-resource-group",
    label: "Resource Group",
  },
  group: {
    icon: Component,
    color: "text-entity-resource-group bg-entity-resource-group-bg",
    borderTop: "border-t-entity-resource-group",
    label: "Resource Group",
  },
  resource: {
    icon: Dumbbell,
    color: "text-entity-resource bg-entity-resource-bg",
    borderTop: "border-t-entity-resource",
    label: "Resource",
  },
  warehouse: {
    icon: Warehouse,
    color: "text-entity-warehouse bg-entity-warehouse-bg",
    borderTop: "border-t-entity-warehouse",
    label: "Warehouse",
  },
};

export const TYPE_TITLES: Record<string, string> = {
  productionLine: "Production Line",
  line: "Line",
  lineGroup: "Line Group",
  department: "Department",
  resourceGroup: "Resource Group",
  group: "Resource Group",
  resource: "Resource",
  warehouse: "Warehouse",
  plant: "Plant",
  company: "Company",
};

export const CHILD_TYPE_MAP: Record<string, string> = {
  company: "Plant",
  plant: "Production Line",
  lineGroup: "Production Line",
  productionLine: "Resource Group",
  line: "Resource Group",
  department: "Resource Group",
  resourceGroup: "Resource",
  group: "Resource",
};

export const ENTITY_ROUTES: Record<string, string> = {
  plant: "/system/production-structure/plant/",
  productionLine: "/system/production-structure/production-lines/",
  line: "/system/production-structure/production-lines/",
  department: "/system/production-structure/departments/",
  resourceGroup: "/system/production-structure/resource-groups/",
  group: "/system/production-structure/resource-groups/",
  resource: "/system/production-structure/resources/",
};

export const ADD_ROUTES: Record<string, string> = {
  company: "/system/production-structure/plant",
  plant: "/system/production-structure/production-lines",
  productionLine: "/system/production-structure/departments",
  line: "/system/production-structure/departments",
  department: "/system/production-structure/resource-groups",
  resourceGroup: "/system/production-structure/resources",
  group: "/system/production-structure/resources",
};

/* ── Reference / Configuration Table Type → Entity Mapping ── */

export const TABLE_ENTITY_MAP: Record<string, string> = {
  production_calendar: "company",
  shift_pattern: "company",
  language: "company",
  timezone: "company",
  manufacturing_type: "plant",
  work_center_type: "plant",
  machine_type: "plant",
  operation_code: "plant",
  routing_type: "plant",
  material_category: "department",
  inventory_type: "department",
  kanban_type: "department",
  container_type: "department",
  unit_type: "department",
  downtime_code: "resource",
  defect_code: "resource",
  scrap_reason: "resource",
  kaizen_category: "resource",
  skill_type: "resourceGroup",
  role: "resourceGroup",
  admin_department: "department",
  shift_team: "resourceGroup",
  staff_user: "department",
  staff_assignment: "department",
};

export function getTableEntityStyle(tableType: string): EntityConfigItem {
  const entityKey = TABLE_ENTITY_MAP[tableType] || "resource";
  return ENTITY_CONFIG[entityKey] || ENTITY_CONFIG.resource;
}
