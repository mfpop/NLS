import { useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import type {
  LiveShopfloorAssignedResourceGroup,
  LiveShopfloorResourceStatus,
} from "@/types/liveShopfloor";

interface Props {
  assignedResourceGroups: LiveShopfloorAssignedResourceGroup[];
  resourceStatuses: LiveShopfloorResourceStatus[];
  openIssuesCount: number;
  openActionsCount: number;
}

function StatusColorBar({ status }: { status: string }) {
  const color = status === "running" ? "bg-success/100"
    : status === "stopped" ? "bg-danger/100"
      : status === "idle" || status === "starved" ? "bg-warning/100"
        : status === "changeover" ? "bg-accent/100"
          : "bg-slate-300";
  return <div className={`w-1 shrink-0 rounded-full ${color}`} />;
}

function ResourceBadge({ status }: { status: string }) {
  const color = status === "running" ? "border-success/20 bg-success/10 text-success"
    : status === "stopped" ? "border-danger/20 bg-danger/10 text-danger"
      : status === "idle" || status === "starved" ? "border-warning/20 bg-warning/10 text-warning"
        : status === "changeover" ? "border-accent/20 bg-accent/10 text-accent-foreground"
          : "border-border bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border leading-tight ${color}`}>
      {status}
    </span>
  );
}

export function ResourceFlowPanel({
  assignedResourceGroups,
  resourceStatuses,
}: Props) {
  const [selectedRg, setSelectedRg] = useState<string | null>(null);

  const sorted = [...assignedResourceGroups].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted">
      {/* Header */}
      <div className="h-8 shrink-0 border-b border-border px-3 flex items-center justify-between bg-muted">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Assigned Resource Groups</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success/100" />
            {sorted.filter((r) => r.status === "running").length}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-danger/100" />
            {sorted.filter((r) => r.status === "stopped").length}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-warning/100" />
            {sorted.filter((r) => r.status === "idle" || r.status === "starved").length}
          </span>
        </div>
      </div>

      {/* Resource Group list */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/50">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No resource groups assigned</p>
          </div>
        ) : (
          sorted.map((rg) => {
            const keyResources = resourceStatuses
              .filter((rs) => rs.resourceGroupId === rg.resourceGroupId)
              .slice(0, 2);
            const hasMoreResources = resourceStatuses.filter((rs) => rs.resourceGroupId === rg.resourceGroupId).length > 2;
            const isSelected = selectedRg === rg.id;

            return (
              <button
                key={rg.id}
                type="button"
                onClick={() => setSelectedRg(isSelected ? null : rg.id)}
                className={`w-full text-left flex items-stretch gap-2 h-[68px] transition-colors hover:bg-muted ${
                  isSelected ? "bg-accent/30" : ""
                }`}
              >
                <StatusColorBar status={rg.status} />
                <div className="flex-1 min-w-0 flex items-center py-1.5 pr-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">#{rg.sequence}</span>
                      <span className="text-xs font-semibold text-foreground truncate">{rg.resourceGroupName}</span>
                      <ResourceBadge status={rg.displayStatus} />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {keyResources.map((rs) => (
                        <span key={rs.id} className="truncate max-w-[100px]" title={rs.name}>{rs.name}</span>
                      ))}
                      {hasMoreResources && <span className="text-muted-foreground/60">+{resourceStatuses.filter((rs) => rs.resourceGroupId === rg.resourceGroupId).length - 2} more</span>}
                    </div>
                    {rg.activeDowntimeReason && (
                      <div className="flex items-center gap-1 mt-0.5 text-[9px] text-danger">
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{rg.activeDowntimeReason}</span>
                      </div>
                    )}
                  </div>
                  {(rg.issueCount > 0 || rg.actionCount > 0) && (
                    <div className="shrink-0 flex items-center gap-1 ml-2">
                      {rg.issueCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-warning/10 px-1 py-0.5 text-[9px] font-medium text-warning">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {rg.issueCount}
                        </span>
                      )}
                      {rg.actionCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-accent/10 px-1 py-0.5 text-[9px] font-medium text-accent-foreground">
                          {rg.actionCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
