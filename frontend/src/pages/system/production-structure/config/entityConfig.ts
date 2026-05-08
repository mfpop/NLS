import { Landmark, Factory, TrendingUpDown, Layers, Component, Dumbbell } from "lucide-react";
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
    color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
    borderTop: "border-t-emerald-400",
    label: "Company",
  },
  plant: {
    icon: Factory,
    color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10",
    borderTop: "border-t-blue-400",
    label: "Plant",
  },
  productionLine: {
    icon: TrendingUpDown,
    color: "text-amber-600 bg-transparent dark:text-amber-400",
    borderTop: "border-t-amber-400",
    label: "Production Line",
  },
  line: {
    icon: TrendingUpDown,
    color: "text-amber-600 bg-transparent dark:text-amber-400",
    borderTop: "border-t-amber-400",
    label: "Line",
  },
  department: {
    icon: Layers,
    color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10",
    borderTop: "border-t-purple-400",
    label: "Department",
  },
  resourceGroup: {
    icon: Component,
    color: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10",
    borderTop: "border-t-rose-400",
    label: "Resource Group",
  },
  group: {
    icon: Component,
    color: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10",
    borderTop: "border-t-rose-400",
    label: "Resource Group",
  },
  resource: {
    icon: Dumbbell,
    color: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10",
    borderTop: "border-t-gray-400",
    label: "Resource",
  },
};

export const TYPE_TITLES: Record<string, string> = {
  productionLine: "Production Line",
  line: "Line",
  department: "Department",
  resourceGroup: "Resource Group",
  group: "Resource Group",
  resource: "Resource",
  plant: "Plant",
  company: "Company",
};

export const CHILD_TYPE_MAP: Record<string, string> = {
  company: "Plant",
  plant: "Production Line",
  productionLine: "Department",
  line: "Department",
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
  shift_team: "resourceGroup",
};

export function getTableEntityStyle(tableType: string): EntityConfigItem {
  const entityKey = TABLE_ENTITY_MAP[tableType] || "resource";
  return ENTITY_CONFIG[entityKey] || ENTITY_CONFIG.resource;
}
