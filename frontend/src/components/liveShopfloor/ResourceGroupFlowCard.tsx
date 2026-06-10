import { Circle, AlertTriangle, ListChecks, Clock } from "lucide-react";
import type { LiveShopfloorAssignedResourceGroup, LiveShopfloorResourceStatus } from "@/types/liveShopfloor";

interface Props {
  group: LiveShopfloorAssignedResourceGroup;
  resources: LiveShopfloorResourceStatus[];
  isLast: boolean;
}

const STATUS_BORDER: Record<string, string> = {
  running: "border-l-success/50",
  idle: "border-l-border/50",
  stopped: "border-l-danger/50",
  blocked: "border-l-danger/50",
  starved: "border-l-warning/50",
  maintenance: "border-l-warning/50",
  changeover: "border-l-accent/50",
  unknown: "border-l-border/30",
};

const STATUS_BG: Record<string, string> = {
  running: "bg-success/5",
  idle: "bg-card",
  stopped: "bg-danger/5",
  blocked: "bg-danger/5",
  starved: "bg-warning/5",
  maintenance: "bg-warning/5",
  changeover: "bg-accent/5",
  unknown: "bg-muted/30",
};

export function ResourceGroupFlowCard({ group, resources, isLast }: Props) {
  const border = STATUS_BORDER[group.status] || STATUS_BORDER.unknown;
  const bg = STATUS_BG[group.status] || STATUS_BG.unknown;

  return (
    <div className={`relative border border-border/40 border-l-4 rounded-md ${border} ${bg} p-3 ${
      !isLast ? "mb-3" : ""
    }`}>
      {/* Flow connector arrow */}
      {!isLast && (
        <div className="absolute -bottom-3 left-6 flex justify-center">
          <div className="h-3 w-px bg-border/40" />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
            {group.sequence}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-foreground truncate block">{group.resourceGroupName}</span>
            <span className="text-[10px] text-muted-foreground">{group.departmentName}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {group.activeDowntimeReason && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger" title={group.activeDowntimeReason}>
              <Clock className="h-3 w-3" />
              D
            </span>
          )}
          {group.issueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
              <AlertTriangle className="h-3 w-3" />
              {group.issueCount}
            </span>
          )}
          {group.actionCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              <ListChecks className="h-3 w-3" />
              {group.actionCount}
            </span>
          )}
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
            group.status === "running" ? "bg-success/10 text-success border-success/20"
              : group.status === "stopped" || group.status === "blocked" ? "bg-danger/10 text-danger border-danger/20"
                : group.status === "starved" || group.status === "maintenance" ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-muted text-muted-foreground border-border/50"
          }`}>
            {group.displayStatus || group.status}
          </span>
        </div>
      </div>

      {group.activeOperation && (
        <p className="text-[10px] text-muted-foreground mb-2 truncate">
          Operation: {group.activeOperation}
        </p>
      )}

      {/* Nested resources */}
      {resources.length > 0 && (
        <div className="space-y-1.5 mt-2 pl-8 border-l border-border/20">
          {resources.map((resource) => (
            <div key={resource.id} className="flex items-center gap-2 py-0.5">
              <Circle className={`h-2.5 w-2.5 fill-current shrink-0 ${
                resource.status === "running" ? "text-success"
                  : resource.status === "stopped" || resource.status === "blocked" ? "text-danger"
                    : resource.status === "starved" || resource.status === "maintenance" ? "text-warning"
                      : "text-muted-foreground"
              }`} />
              <span className="text-[10px] text-foreground truncate">{resource.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{resource.code}</span>
              {resource.activeDowntimeReason && (
                <span className="text-[10px] text-danger truncate">{resource.activeDowntimeReason}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
