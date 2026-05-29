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
      className={`group mx-1 my-0.5 flex h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 transition-all duration-150 select-none ${
        selected
          ? "bg-table-selected border-l-2 shadow-sm " + r.border + " ring-1 ring-entity-line/5"
          : "border-l-2 border-l-transparent hover:bg-table-row-hover hover:border-l-muted-foreground/20 active:bg-card"
      }`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-150 ${selected ? r.iconBg + " shadow-sm" : "bg-muted/60 group-hover:bg-muted"}`}>
        <span className={`${r.iconFg} ${selected ? "scale-105" : ""} transition-transform duration-150`}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
          <span className={`min-w-0 truncate text-[14px] transition-colors duration-150 ${selected ? "font-bold " + theme.textPrimary : "font-semibold " + theme.textPrimary}`} title={name}>{name}</span>
          <span className={`h-2 w-2 rounded-full ${statusBulletClass(status)} ${status === "active" ? "shadow-sm shadow-success/30" : ""}`} title={status || "unknown"} aria-label={`Status: ${status || "unknown"}`} />
        </div>
        <div className={`mt-0.5 truncate text-[12px] font-medium ${theme.textSecondary}`} title={meta}>
          {meta}
        </div>
      </div>
    </div>
  );
}
