import { Layers } from "lucide-react";
import { ResourceGroupFlowCard } from "./ResourceGroupFlowCard";
import type { LiveShopfloorAssignedResourceGroup, LiveShopfloorResourceStatus } from "@/types/liveShopfloor";

interface Props {
  assignedResourceGroups: LiveShopfloorAssignedResourceGroup[];
  resourceStatuses: LiveShopfloorResourceStatus[];
  openIssuesCount?: number;
  openActionsCount?: number;
}

export function LineFlowBoard({ assignedResourceGroups, resourceStatuses, openIssuesCount, openActionsCount }: Props) {
  if (assignedResourceGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Layers className="h-5 w-5 text-muted-foreground/60" />
        <p className="text-xs text-muted-foreground">No assigned resource groups for this line</p>
      </div>
    );
  }

  const sorted = [...assignedResourceGroups].sort((a, b) => a.sequence - b.sequence);

  // Compute status counts from groups
  const runningCount = sorted.filter((g) => g.status === "running").length;
  const stoppedCount = sorted.filter((g) => g.status === "stopped" || g.status === "blocked").length;
  const starvedCount = sorted.filter((g) => g.status === "starved" || g.status === "idle").length;
  const maintenanceCount = sorted.filter((g) => g.status === "maintenance").length;
  const hasStatusSummary = runningCount > 0 || stoppedCount > 0 || starvedCount > 0 || maintenanceCount > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted shrink-0">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Assigned Resource Groups</h3>
        <span className="text-[10px] text-muted-foreground/60 ml-auto">{sorted.length} group{sorted.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {sorted.map((group, index) => {
          const groupResources = resourceStatuses.filter(
            (r) => r.resourceGroupId === group.resourceGroupId
          );
          return (
            <ResourceGroupFlowCard
              key={group.id}
              group={group}
              resources={groupResources}
              isLast={index === sorted.length - 1 && !hasStatusSummary}
            />
          );
        })}
      </div>

      {/* Compact bottom summary strip */}
      {hasStatusSummary && (
        <div className="shrink-0 flex items-center gap-3 px-3 py-1.5 border-t border-border bg-muted">
          {runningCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success/100" />
              {runningCount} Running
            </span>
          )}
          {stoppedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-danger">
              <span className="h-1.5 w-1.5 rounded-full bg-danger/100" />
              {stoppedCount} Stopped
            </span>
          )}
          {starvedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-warning/100" />
              {starvedCount} Starved
            </span>
          )}
          {maintenanceCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-warning/100" />
              {maintenanceCount} Maint.
            </span>
          )}
          <span className="ml-auto flex items-center gap-3">
            {(openIssuesCount ?? 0) > 0 && (
              <span className="text-[10px] font-medium text-warning">
                Open issues: {openIssuesCount}
              </span>
            )}
            {(openActionsCount ?? 0) > 0 && (
              <span className="text-[10px] font-medium text-accent-foreground">
                Active actions: {openActionsCount}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
