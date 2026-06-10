import { useState } from "react";
import { Clock, Plus, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { LiveShopfloorActiveDowntime, LiveShopfloorRecentDowntimeEvent } from "@/types/liveShopfloor";

interface Props {
  activeDowntime: LiveShopfloorActiveDowntime | null;
  recentEvents: LiveShopfloorRecentDowntimeEvent[];
  onLogDowntime: () => void;
  onCloseDowntime?: (id: string) => void;
  onCreateIssue?: (id: string) => void;
  onCreateAction?: (id: string) => void;
}

export function ActiveDowntimePanel({ activeDowntime, recentEvents, onLogDowntime, onCloseDowntime, onCreateIssue, onCreateAction }: Props) {
  const [showRecent, setShowRecent] = useState(false);

  return (
    <div className="rounded-md border border-border/50 bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Downtime</h3>
          {activeDowntime && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger animate-pulse">
              <XCircle className="h-3 w-3" />
              Active
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onLogDowntime}
          className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] font-medium text-foreground hover:bg-muted transition-colors"
          title="Log Downtime"
        >
          <Plus className="h-3.5 w-3.5" />
          Log
        </button>
      </div>

      {/* Active Downtime Alert */}
      {activeDowntime ? (
        <div className="mx-3 my-2 rounded-md border border-danger/20 bg-danger/5 p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <span className="text-xs font-semibold text-danger">Active Downtime</span>
            </div>
            <span className="text-[10px] tabular-nums font-bold text-danger">{activeDowntime.durationMinutes}m</span>
          </div>
          <p className="text-xs font-medium text-foreground">{activeDowntime.reason}</p>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Started: {activeDowntime.startTime}
            {activeDowntime.affectedResourceName && <> · {activeDowntime.affectedResourceName}</>}
            {activeDowntime.affectedResourceGroupName && <> · {activeDowntime.affectedResourceGroupName}</>}
            {activeDowntime.owner && <> · Owner: {activeDowntime.owner}</>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {onCloseDowntime && (
              <button type="button" onClick={() => onCloseDowntime(activeDowntime.id)}
                className="inline-flex h-6 items-center gap-1 rounded px-2 text-[10px] font-medium text-danger hover:bg-danger/10 transition-colors">
                <CheckCircle2 className="h-3 w-3" />
                Resolve
              </button>
            )}
            {onCreateIssue && !activeDowntime.linkedIssueId && (
              <button type="button" onClick={() => onCreateIssue(activeDowntime.id)} className="text-[10px] text-accent hover:underline">Create Issue</button>
            )}
            {onCreateAction && !activeDowntime.linkedActionId && (
              <button type="button" onClick={() => onCreateAction(activeDowntime.id)} className="text-[10px] text-accent hover:underline">Create Action</button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 text-center text-[10px] text-muted-foreground">
          No active downtime
        </div>
      )}

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowRecent(!showRecent)}
            className="w-full px-4 py-1.5 text-[10px] font-medium text-accent hover:bg-muted/30 transition-colors border-b border-border/10"
          >
            {showRecent ? "Hide recent" : `Recent (${recentEvents.length})`}
          </button>
          {showRecent && (
            <div className="max-h-40 overflow-y-auto">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-2 px-4 py-2 border-b border-border/10 hover:bg-muted/30 transition-colors">
                  <div className="shrink-0 mt-0.5">
                    <Clock className={`h-3.5 w-3.5 ${
                      event.status === "active" ? "text-danger" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-foreground truncate">{event.reason}</span>
                      <span className="text-[10px] text-muted-foreground">{event.durationMinutes}m</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {event.startTime}{event.endTime ? ` → ${event.endTime}` : ""}
                      {event.affectedResourceName && <> · {event.affectedResourceName}</>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
