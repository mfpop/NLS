import type { ReactNode } from "react";
import { ENTITY_COLORS } from "../config/entityColors";

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

function statusBulletClass(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "active" || normalized === "running" || normalized === "online") return "bg-emerald-500";
  if (normalized === "inactive" || normalized === "idle") return "bg-slate-400";
  if (normalized === "down" || normalized === "blocked" || normalized === "error") return "bg-red-500";
  if (normalized === "maintenance" || normalized === "warning") return "bg-amber-500";
  return "bg-slate-300";
}

export function EntityListItem({ name, meta, icon, selected, status, onClick, entityType = "resource" }: EntityListItemProps) {
  const col = ENTITY_COLORS[entityType] || ENTITY_COLORS.resource;
  return (
    <div onClick={onClick}
      className={`group flex h-11 cursor-pointer items-center gap-2.5 px-3 py-2 border-l-2 transition-all select-none ${
        selected
          ? `${col.selectedBg} ${col.selectedBorder}`
          : "border-l-transparent hover:bg-slate-100"
      }`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${col.iconBg}`}>
        <span className={col.iconFg}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="grid min-w-0 items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
          <span className={`min-w-0 truncate text-[14px] ${selected ? "font-bold" : "font-semibold"} text-slate-900`} title={name}>{name}</span>
          <span className={`h-2 w-2 rounded-full ${statusBulletClass(status)}`} title={status || "unknown"} aria-label={`Status: ${status || "unknown"}`} />
        </div>
        <div className="mt-0.5 truncate text-[12px] font-medium text-slate-500" title={meta}>
          {meta}
        </div>
      </div>
    </div>
  );
}
