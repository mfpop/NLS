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
    <div className="shrink-0 border-b border-border bg-card bg-muted">
      <div className="mx-auto px-4 py-1.5" style={{ maxWidth: "1000px" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
              {icon}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs font-bold text-muted-foreground truncate">{name}</h2>
                {error && <span className="text-[10px] text-danger font-medium">{error}</span>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0">
                <span className="font-medium text-muted-foreground">{entityType}</span>
                <span className="text-muted-foreground">|</span>
                <span className="font-mono">{code || "\u2014"}</span>
                <span className="text-muted-foreground">|</span>
                <PillBadge variant={status === "active" ? "active" : "inactive"} label={statusLabel} />
                {isDirty && (
                  <span className="inline-flex items-center gap-1 text-warning font-medium">
                    <Circle className="h-2 w-2 fill-warning stroke-none" />
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
