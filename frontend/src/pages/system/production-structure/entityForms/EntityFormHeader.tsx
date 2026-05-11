import { type ReactNode } from "react";
import { Circle } from "lucide-react";
import { PillBadge } from "../shared";

interface EntityFormHeaderProps {
  icon: ReactNode;
  iconBg: string;
  name: string;
  entityType: string;
  code: string;
  status: string;
  isDirty: boolean;
  error?: string | null;
}

export function EntityFormHeader({ icon, iconBg, name, entityType, code, status, isDirty, error }: EntityFormHeaderProps) {
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="shrink-0 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-950">
      <div className="mx-auto px-6 py-3" style={{ maxWidth: "1000px" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
              {icon}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{name}</h2>
                {error && <span className="text-[10px] text-red-500 font-medium">{error}</span>}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-medium text-slate-600 dark:text-slate-300">{entityType}</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="font-mono">{code || "\u2014"}</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <PillBadge variant={status === "active" ? "active" : "inactive"} label={statusLabel} />
                {isDirty && (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <Circle className="h-2 w-2 fill-amber-500 stroke-none" />
                    Unsaved changes
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
