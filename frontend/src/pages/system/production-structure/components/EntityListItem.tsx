import { theme } from "../../../../styles/themeTokens";
import type { ReactNode } from "react";

type EntityType = "company" | "plant" | "line" | "department" | "resourceGroup" | "resource" | "warehouse";

interface EntityListItemProps {
  name: string;
  code?: string | null;
  meta: string;
  icon: ReactNode;
  selected: boolean;
  status?: string;
  onClick: () => void;
  entityType?: EntityType;
  issueTags?: ReactNode;
}

const RAIL: Record<string, { border: string; iconBg: string; iconFg: string }> = {
  company:       { border: "border-l-entity-company",       iconBg: "bg-entity-company-bg",       iconFg: "text-entity-company" },
  plant:         { border: "border-l-entity-plant",         iconBg: "bg-entity-plant-bg",         iconFg: "text-entity-plant" },
  line:          { border: "border-l-entity-line",          iconBg: "bg-entity-line-bg",          iconFg: "text-entity-line" },
  department:    { border: "border-l-entity-department",    iconBg: "bg-entity-department-bg",    iconFg: "text-entity-department" },
  resourceGroup: { border: "border-l-entity-resource-group", iconBg: "bg-entity-resource-group-bg", iconFg: "text-entity-resource-group" },
  resource:      { border: "border-l-entity-resource",      iconBg: "bg-entity-resource-bg",      iconFg: "text-entity-resource" },
  warehouse:     { border: "border-l-entity-warehouse",     iconBg: "bg-entity-warehouse-bg",     iconFg: "text-entity-warehouse" },
};

export function EntityListItem({ name, code, meta, icon, selected, status, onClick, entityType = "resource", issueTags }: EntityListItemProps) {
  const r = RAIL[entityType] ?? RAIL.resource;
  const isActive = status !== "inactive";
  return (
    <div onClick={onClick}
      className={`group mx-1 my-0.5 flex h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 transition-all duration-150 ${
        selected
          ? "bg-table-selected border-l-2 " + r.border
          : "border-l-2 border-l-transparent hover:bg-table-row-hover"
      }`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${selected ? r.iconBg : "bg-muted"} transition-colors`}>
        <span className={`${r.iconFg}`}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[14px] font-semibold truncate ${theme.textPrimary}`}>{name}</span>
          {code && <span className={`text-[11px] font-mono font-semibold ${theme.textSecondary} shrink-0`}>{code}</span>}
          {issueTags}
        </div>
        <div className={`mt-0.5 truncate text-[12px] font-medium ${theme.textSecondary}`} title={meta}>
          {meta}
        </div>
      </div>
      <span className={`ml-2 inline-block h-1 w-1 rounded-full shrink-0 ${isActive ? "bg-status-active" : "bg-status-inactive/60"}`} />
    </div>
  );
}
