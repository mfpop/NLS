import { ArrowRight, HelpCircle, Layers } from "lucide-react";
import { ResourceGroupFlowCard } from "./ResourceGroupFlowCard";
import type { LiveShopfloorAssignedResourceGroup, LiveShopfloorResourceStatus } from "@/types/liveShopfloor";

interface Props {
  assignedResourceGroups: LiveShopfloorAssignedResourceGroup[];
  resourceStatuses: LiveShopfloorResourceStatus[];
}

export function LineFlowBoard({ assignedResourceGroups, resourceStatuses }: Props) {
  if (assignedResourceGroups.length === 0) {
    return (
      <div className="rounded-md border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Assigned Resource Groups</h3>
        </div>
        <div className="flex items-center gap-2 py-4">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No assigned resource groups for this line</p>
        </div>
      </div>
    );
  }

  const sorted = [...assignedResourceGroups].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="rounded-md border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Assigned Resource Groups</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{sorted.length} group{sorted.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-0">
        {sorted.map((group, index) => {
          const groupResources = resourceStatuses.filter(
            (r) => r.resourceGroupId === group.resourceGroupId
          );
          return (
            <div key={group.id}>
              <ResourceGroupFlowCard
                group={group}
                resources={groupResources}
                isFirst={index === 0}
                isLast={index === sorted.length - 1}
              />
              {!group.activeDowntimeReason && index < sorted.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
