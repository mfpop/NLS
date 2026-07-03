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
  const color = status === "running" ? "bg-emerald-500"
    : status === "stopped" ? "bg-red-500"
      : status === "idle" || status === "starved" ? "bg-amber-500"
        : status === "changeover" ? "bg-sky-500"
          : "bg-slate-300";
  return <div className={`w-1 shrink-0 rounded-full ${color}`} />;
}

function ResourceBadge({ status }: { status: string }) {
  const color = status === "running" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "stopped" ? "border-red-200 bg-red-50 text-red-700"
      : status === "idle" || status === "starved" ? "border-amber-200 bg-amber-50 text-amber-700"
        : status === "changeover" ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-slate-100 text-slate-600";
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="h-8 shrink-0 border-b border-slate-200 px-3 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Assigned Resource Groups</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {sorted.filter((r) => r.status === "running").length}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            {sorted.filter((r) => r.status === "stopped").length}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {sorted.filter((r) => r.status === "idle" || r.status === "starved").length}
          </span>
        </div>
      </div>

      {/* Resource Group list */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-slate-500">No resource groups assigned</p>
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
                className={`w-full text-left flex items-stretch gap-2 h-[68px] transition-colors hover:bg-slate-50 ${
                  isSelected ? "bg-sky-50/30" : ""
                }`}
              >
                <StatusColorBar status={rg.status} />
                <div className="flex-1 min-w-0 flex items-center py-1.5 pr-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] text-slate-400 tabular-nums shrink-0">#{rg.sequence}</span>
                      <span className="text-xs font-semibold text-slate-800 truncate">{rg.resourceGroupName}</span>
                      <ResourceBadge status={rg.displayStatus} />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      {keyResources.map((rs) => (
                        <span key={rs.id} className="truncate max-w-[100px]" title={rs.name}>{rs.name}</span>
                      ))}
                      {hasMoreResources && <span className="text-slate-400">+{resourceStatuses.filter((rs) => rs.resourceGroupId === rg.resourceGroupId).length - 2} more</span>}
                    </div>
                    {rg.activeDowntimeReason && (
                      <div className="flex items-center gap-1 mt-0.5 text-[9px] text-red-600">
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{rg.activeDowntimeReason}</span>
                      </div>
                    )}
                  </div>
                  {(rg.issueCount > 0 || rg.actionCount > 0) && (
                    <div className="shrink-0 flex items-center gap-1 ml-2">
                      {rg.issueCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1 py-0.5 text-[9px] font-medium text-amber-700">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {rg.issueCount}
                        </span>
                      )}
                      {rg.actionCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-sky-50 px-1 py-0.5 text-[9px] font-medium text-sky-700">
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
