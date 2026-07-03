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
        <Layers className="h-5 w-5 text-slate-400" />
        <p className="text-xs text-slate-500">No assigned resource groups for this line</p>
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
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <Layers className="h-3.5 w-3.5 text-slate-500" />
        <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Assigned Resource Groups</h3>
        <span className="text-[10px] text-slate-400 ml-auto">{sorted.length} group{sorted.length !== 1 ? "s" : ""}</span>
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
        <div className="shrink-0 flex items-center gap-3 px-3 py-1.5 border-t border-slate-200 bg-slate-50">
          {runningCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {runningCount} Running
            </span>
          )}
          {stoppedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {stoppedCount} Stopped
            </span>
          )}
          {starvedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {starvedCount} Starved
            </span>
          )}
          {maintenanceCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {maintenanceCount} Maint.
            </span>
          )}
          <span className="ml-auto flex items-center gap-3">
            {(openIssuesCount ?? 0) > 0 && (
              <span className="text-[10px] font-medium text-amber-700">
                Open issues: {openIssuesCount}
              </span>
            )}
            {(openActionsCount ?? 0) > 0 && (
              <span className="text-[10px] font-medium text-sky-700">
                Active actions: {openActionsCount}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
