/**
 * Shared entity color configuration — single source of truth for entity-specific
 * Tailwind color classes across all production-structure pages.
 *
 * Every entity type maps to explicit Tailwind color values (not theme tokens)
 * for icon backgrounds, icon foregrounds, selected-row borders, and selected-row backgrounds.
 */

export interface EntityColorScheme {
  /** Entity key used for semantic grouping (e.g. "plant", "line", "department") */
  entityType: string;
  /** Background class for the icon container */
  iconBg: string;
  /** Foreground/text class for the icon SVG */
  iconFg: string;
  /** Left border class for a selected row */
  selectedBorder: string;
  /** Background class for a selected row */
  selectedBg: string;
  /** Human-readable label */
  label: string;
}

export const ENTITY_COLORS: Record<string, EntityColorScheme> = {
  company: {
    entityType: "company",
    iconBg: "bg-slate-100",
    iconFg: "text-slate-600",
    selectedBorder: "border-l-slate-600",
    selectedBg: "bg-slate-600/10",
    label: "Company",
  },
  plant: {
    entityType: "plant",
    iconBg: "bg-blue-100",
    iconFg: "text-blue-600",
    selectedBorder: "border-l-blue-600",
    selectedBg: "bg-blue-600/10",
    label: "Plant",
  },
  productionLine: {
    entityType: "productionLine",
    iconBg: "bg-amber-100",
    iconFg: "text-amber-600",
    selectedBorder: "border-l-amber-600",
    selectedBg: "bg-amber-600/10",
    label: "Production Line",
  },
  line: {
    entityType: "line",
    iconBg: "bg-amber-100",
    iconFg: "text-amber-600",
    selectedBorder: "border-l-amber-600",
    selectedBg: "bg-amber-600/10",
    label: "Line",
  },
  department: {
    entityType: "department",
    iconBg: "bg-violet-100",
    iconFg: "text-violet-600",
    selectedBorder: "border-l-violet-600",
    selectedBg: "bg-violet-600/10",
    label: "Department",
  },
  resourceGroup: {
    entityType: "resourceGroup",
    iconBg: "bg-teal-100",
    iconFg: "text-teal-600",
    selectedBorder: "border-l-teal-600",
    selectedBg: "bg-teal-600/10",
    label: "Resource Group",
  },
  group: {
    entityType: "group",
    iconBg: "bg-teal-100",
    iconFg: "text-teal-600",
    selectedBorder: "border-l-teal-600",
    selectedBg: "bg-teal-600/10",
    label: "Resource Group",
  },
  resource: {
    entityType: "resource",
    iconBg: "bg-cyan-100",
    iconFg: "text-cyan-600",
    selectedBorder: "border-l-cyan-600",
    selectedBg: "bg-cyan-600/10",
    label: "Resource",
  },
  warehouse: {
    entityType: "warehouse",
    iconBg: "bg-sky-100",
    iconFg: "text-sky-600",
    selectedBorder: "border-l-sky-600",
    selectedBg: "bg-sky-600/10",
    label: "Warehouse",
  },
};

/**
 * Resolve an entity type (or alias) to its color scheme.
 * Falls back to `resource` for unknown types.
 */
export function getEntityColors(entityType: string): EntityColorScheme {
  return ENTITY_COLORS[entityType] || ENTITY_COLORS.resource;
}
