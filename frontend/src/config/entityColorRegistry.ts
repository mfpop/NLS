export interface EntityColorTokens {
  bg: string;
  text: string;
  border: string;
  icon: string;
  hoverBg: string;
  selectedBg: string;
  darkBg: string;
  darkText: string;
  darkBorder: string;
  darkIcon: string;
  darkHoverBg: string;
  darkSelectedBg: string;
}

const COLOR_REGISTRY: Record<string, EntityColorTokens> = {
  emerald: {
    bg: "bg-entity-plant-bg",
    text: "text-entity-plant",
    border: "border-entity-plant",
    icon: "text-entity-plant",
    hoverBg: "hover:bg-entity-plant-bg",
    selectedBg: "bg-table-selected",
    darkBg: "",
    darkText: "",
    darkBorder: "",
    darkIcon: "",
    darkHoverBg: "hover:bg-entity-plant-bg",
    darkSelectedBg: "bg-table-selected",
  },
  blue: {
    bg: "bg-entity-department-bg",
    text: "text-entity-department",
    border: "border-entity-department",
    icon: "text-entity-department",
    hoverBg: "hover:bg-entity-department-bg",
    selectedBg: "bg-table-selected",
    darkBg: "",
    darkText: "",
    darkBorder: "",
    darkIcon: "",
    darkHoverBg: "hover:bg-entity-department-bg",
    darkSelectedBg: "bg-table-selected",
  },
  amber: {
    bg: "bg-entity-line-bg",
    text: "text-entity-line",
    border: "border-entity-line",
    icon: "text-entity-line",
    hoverBg: "hover:bg-entity-line-bg",
    selectedBg: "bg-table-selected",
    darkBg: "",
    darkText: "",
    darkBorder: "",
    darkIcon: "",
    darkHoverBg: "hover:bg-entity-line-bg",
    darkSelectedBg: "bg-table-selected",
  },
  purple: {
    bg: "bg-entity-department-bg",
    text: "text-entity-department",
    border: "border-entity-department",
    icon: "text-entity-department",
    hoverBg: "hover:bg-entity-department-bg",
    selectedBg: "bg-table-selected",
    darkBg: "",
    darkText: "",
    darkBorder: "",
    darkIcon: "",
    darkHoverBg: "hover:bg-entity-department-bg",
    darkSelectedBg: "bg-table-selected",
  },
  rose: {
    bg: "bg-entity-resource-group-bg",
    text: "text-entity-resource-group",
    border: "border-entity-resource-group",
    icon: "text-entity-resource-group",
    hoverBg: "hover:bg-entity-resource-group-bg",
    selectedBg: "bg-table-selected",
    darkBg: "",
    darkText: "",
    darkBorder: "",
    darkIcon: "",
    darkHoverBg: "hover:bg-entity-resource-group-bg",
    darkSelectedBg: "bg-table-selected",
  },
  gray: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    icon: "text-muted-foreground",
    hoverBg: "hover:bg-muted",
    selectedBg: "bg-table-selected",
    darkBg: "bg-muted",
    darkText: "text-muted-foreground",
    darkBorder: "border-border",
    darkIcon: "text-muted-foreground",
    darkHoverBg: "hover:bg-muted",
    darkSelectedBg: "bg-table-selected",
  },
  slate: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    icon: "text-muted-foreground",
    hoverBg: "hover:bg-muted",
    selectedBg: "bg-table-selected",
    darkBg: "bg-muted",
    darkText: "text-muted-foreground",
    darkBorder: "border-border",
    darkIcon: "text-muted-foreground",
    darkHoverBg: "hover:bg-muted",
    darkSelectedBg: "bg-table-selected",
  },
  indigo: {
    bg: "bg-entity-department-bg",
    text: "text-entity-department",
    border: "border-entity-department",
    icon: "text-entity-department",
    hoverBg: "hover:bg-entity-department-bg",
    selectedBg: "bg-table-selected",
    darkBg: "",
    darkText: "",
    darkBorder: "",
    darkIcon: "",
    darkHoverBg: "hover:bg-entity-department-bg",
    darkSelectedBg: "bg-table-selected",
  },
  zinc: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    icon: "text-muted-foreground",
    hoverBg: "hover:bg-muted",
    selectedBg: "bg-table-selected",
    darkBg: "bg-muted",
    darkText: "text-muted-foreground",
    darkBorder: "border-border",
    darkIcon: "text-muted-foreground",
    darkHoverBg: "hover:bg-muted",
    darkSelectedBg: "bg-table-selected",
  },
  cyan: {
    bg: "bg-entity-warehouse-bg",
    text: "text-entity-warehouse",
    border: "border-entity-warehouse",
    icon: "text-entity-warehouse",
    hoverBg: "hover:bg-entity-warehouse-bg",
    selectedBg: "bg-table-selected",
    darkBg: "",
    darkText: "",
    darkBorder: "",
    darkIcon: "",
    darkHoverBg: "hover:bg-entity-warehouse-bg",
    darkSelectedBg: "bg-table-selected",
  },
  violet: {
    bg: "bg-entity-department-bg",
    text: "text-entity-department",
    border: "border-entity-department",
    icon: "text-entity-department",
    hoverBg: "hover:bg-entity-department-bg",
    selectedBg: "bg-table-selected",
    darkBg: "",
    darkText: "",
    darkBorder: "",
    darkIcon: "",
    darkHoverBg: "hover:bg-entity-department-bg",
    darkSelectedBg: "bg-table-selected",
  },
  orange: {
    bg: "bg-entity-line-bg",
    text: "text-entity-line",
    border: "border-entity-line",
    icon: "text-entity-line",
    hoverBg: "hover:bg-entity-line-bg",
    selectedBg: "bg-table-selected",
    darkBg: "",
    darkText: "",
    darkBorder: "",
    darkIcon: "",
    darkHoverBg: "hover:bg-entity-line-bg",
    darkSelectedBg: "bg-table-selected",
  },
};

export const ALLOWED_COLOR_KEYS = Object.keys(COLOR_REGISTRY);

export function getColorTokens(key: string): EntityColorTokens {
  return COLOR_REGISTRY[key] || COLOR_REGISTRY.gray;
}

export function getColorClasses(key: string): { iconBg: string; iconText: string } {
  const t = getColorTokens(key);
  return { iconBg: `${t.bg} ${t.darkBg}`, iconText: `${t.text} ${t.darkText}` };
}

export default COLOR_REGISTRY;
