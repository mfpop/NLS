import { Clock, XCircle, AlertTriangle, User, Wrench, Plus } from "lucide-react";
import type { LiveShopfloorActiveDowntime } from "@/types/liveShopfloor";

interface Props {
  activeDowntime: LiveShopfloorActiveDowntime | null;
  onResolveDowntime: (id: string) => void;
  onCreateIssue: () => void;
}

export function ActiveDowntimePanel({ activeDowntime, onResolveDowntime, onCreateIssue }: Props) {
  if (!activeDowntime) {
    return (
      <div className="flex flex-col h-full min-h-[140px] overflow-hidden bg-muted border-b border-border">
        <div className="h-8 shrink-0 border-b border-border px-3 flex items-center justify-between bg-muted">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Active Downtime</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success/100" />
            No active downtime
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[140px] overflow-hidden border-b border-border">
      {/* Subtle red tint only when active downtime exists */}
      <div className="h-8 shrink-0 border-b border-danger/20 px-3 flex items-center justify-between bg-danger/10">
        <div className="flex items-center gap-1.5">
          <XCircle className="h-3.5 w-3.5 text-danger" />
          <h3 className="text-[11px] font-semibold text-red-800 uppercase tracking-wide">Active Downtime</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-1.5 py-0.5 text-[9px] font-medium text-red-800 border border-danger/20">
            <span className="h-1.5 w-1.5 rounded-full bg-danger/100 animate-pulse" />
            {activeDowntime.durationMinutes}m
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 bg-danger/10/30">
        {/* Reason */}
        <div className="flex items-start gap-1.5 mb-1.5">
          <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">{activeDowntime.reason}</p>
          </div>
        </div>

        {/* Resource info */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] mb-2">
          {activeDowntime.affectedResourceName && (
            <div>
              <span className="text-muted-foreground">Resource</span>
              <p className="font-medium text-foreground truncate">{activeDowntime.affectedResourceName}</p>
            </div>
          )}
          {activeDowntime.affectedResourceGroupName && (
            <div>
              <span className="text-muted-foreground">Group</span>
              <p className="font-medium text-foreground truncate">{activeDowntime.affectedResourceGroupName}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Started</span>
            <p className="font-medium text-foreground">{activeDowntime.startTime}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Duration</span>
            <p className="font-medium text-foreground">{activeDowntime.durationMinutes} min</p>
          </div>
        </div>

        {/* Owner */}
        {activeDowntime.owner && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
            <User className="h-3 w-3 text-muted-foreground/60" />
            <span className="font-medium text-muted-foreground truncate">{activeDowntime.owner}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onResolveDowntime(activeDowntime.id)}
            className="inline-flex h-7 items-center gap-1 rounded-[2px] bg-success px-2 text-[10px] font-medium text-white hover:bg-success/80 transition-colors"
          >
            <Wrench className="h-3 w-3" />
            Resolve
          </button>
          <button
            type="button"
            onClick={onCreateIssue}
            className="inline-flex h-7 items-center gap-1 rounded-[2px] border border-danger/20 bg-background px-2 text-[10px] font-medium text-danger hover:bg-danger/10 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Create Issue
          </button>
        </div>
      </div>
    </div>
  );
}
