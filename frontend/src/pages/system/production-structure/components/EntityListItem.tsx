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

function statusBulletClass(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "active" || normalized === "running" || normalized === "online") return "bg-success";
  if (normalized === "inactive" || normalized === "idle") return "bg-muted-foreground/45";
  if (normalized === "down" || normalized === "blocked" || normalized === "error") return "bg-danger";
  if (normalized === "maintenance" || normalized === "warning") return "bg-warning";
  return "bg-muted-foreground/35";
}

export function EntityListItem({ name, meta, icon, selected, status, onClick, entityType = "resource" }: EntityListItemProps) {
  const r = RAIL[entityType] ?? RAIL.resource;
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
        <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
          <span className={`min-w-0 truncate text-[14px] font-semibold ${theme.textPrimary}`}>{name}</span>
          <span className={`h-2 w-2 rounded-full ${statusBulletClass(status)}`} title={status || "unknown"} aria-label={`Status: ${status || "unknown"}`} />
        </div>
        <div className={`mt-0.5 truncate text-[12px] font-medium ${theme.textSecondary}`} title={meta}>
          {meta}
        </div>
      </div>
    </div>
  );
}
