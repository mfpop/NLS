import { AlertTriangle, ListChecks, Clock } from "lucide-react";
import type { LiveShopfloorAssignedResourceGroup, LiveShopfloorResourceStatus } from "@/types/liveShopfloor";

interface Props {
  group: LiveShopfloorAssignedResourceGroup;
  resources: LiveShopfloorResourceStatus[];
  isLast: boolean;
}

const STATUS_BORDER: Record<string, string> = {
  running: "border-l-emerald-500",
  idle: "border-l-slate-300",
  stopped: "border-l-red-500",
  blocked: "border-l-red-500",
  starved: "border-l-amber-500",
  maintenance: "border-l-amber-500",
  changeover: "border-l-sky-500",
  unknown: "border-l-slate-200",
};

const STATUS_BADGE: Record<string, string> = {
  running: "bg-success/15 text-success border-success/20",
  idle: "bg-muted text-muted-foreground border-border",
  stopped: "bg-danger/15 text-red-800 border-danger/20",
  blocked: "bg-danger/15 text-red-800 border-danger/20",
  starved: "bg-warning/15 text-warning border-warning/20",
  maintenance: "bg-warning/15 text-warning border-warning/20",
  changeover: "bg-sky-100 text-sky-800 border-accent/20",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function ResourceGroupFlowCard({ group, resources, isLast }: Props) {
  const border = STATUS_BORDER[group.status] || STATUS_BORDER.unknown;
  const badge = STATUS_BADGE[group.status] || STATUS_BADGE.unknown;
  const visibleResources = resources.slice(0, 2);
  const extraCount = resources.length - 2;

  return (
    <div className={`flex items-stretch gap-2 border-l-4 ${border} ${!isLast ? "border-b border-b-slate-100" : ""}`}>
      {/* Sequence + Status badge */}
      <div className="flex w-10 shrink-0 flex-col items-center justify-center gap-0.5">
        <span className="text-[10px] font-bold text-muted-foreground">{String(group.sequence).padStart(2, "0")}</span>
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border ${badge}`}>
          {group.displayStatus || group.status}
        </span>
      </div>

      {/* Group info */}
      <div className="flex-1 min-w-0 py-2 pr-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground truncate">{group.resourceGroupName}</span>
          <span className="text-[10px] text-muted-foreground truncate">{group.departmentName}</span>
        </div>
        {group.activeOperation && (
          <p className="text-[10px] text-muted-foreground truncate leading-tight">{group.activeOperation}</p>
        )}
        {/* Resources */}
        {visibleResources.length > 0 && (
          <div className="flex items-center gap-2 mt-0.5">
            {visibleResources.map((r) => (
              <span key={r.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  r.status === "running" ? "bg-success/100" :
                  r.status === "stopped" || r.status === "blocked" ? "bg-danger/100" :
                  r.status === "starved" || r.status === "maintenance" ? "bg-warning/100" :
                  "bg-slate-300"
                }`} />
                <span className="truncate max-w-[80px]">{r.name}</span>
              </span>
            ))}
            {extraCount > 0 && (
              <span className="text-[10px] text-muted-foreground/60">+{extraCount} more</span>
            )}
          </div>
        )}
      </div>

      {/* Mini badges */}
      <div className="flex items-center gap-1 pr-2 shrink-0">
        {group.activeDowntimeReason && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-medium text-danger border border-danger/20" title={group.activeDowntimeReason}>
            <Clock className="h-2.5 w-2.5" />
            D
          </span>
        )}
        {group.issueCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-medium text-warning border border-warning/20">
            <AlertTriangle className="h-2.5 w-2.5" />
            {group.issueCount}
          </span>
        )}
        {group.actionCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent-foreground border border-accent/20">
            <ListChecks className="h-2.5 w-2.5" />
            {group.actionCount}
          </span>
        )}
      </div>
    </div>
  );
}
