import { useState } from "react";
import { Clock, Plus, AlertTriangle, XCircle } from "lucide-react";
import type { DowntimeSummary, DowntimeEvent } from "@/types/linePerformance";
import { DowntimeEventRow } from "./DowntimeEventRow";

interface Props {
  summary: DowntimeSummary | null;
  events: DowntimeEvent[];
  onLogDowntime: () => void;
  onOpenDetail?: (id: string) => void;
  onCreateIssueFromDowntime?: (id: string) => void;
  onCreateActionFromDowntime?: (id: string) => void;
}

export function DowntimePanel({ summary, events, onLogDowntime, onOpenDetail, onCreateIssueFromDowntime, onCreateActionFromDowntime }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-border/50 bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Downtime</h3>
          {summary && (
            <span className={`text-xs font-bold tabular-nums ${
              summary.totalDowntimeMinutes > 60 ? "text-danger"
                : summary.totalDowntimeMinutes > 30 ? "text-warning"
                  : "text-muted-foreground"
            }`}>
              {summary.totalDowntimeMinutes}m
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {summary?.activeDowntimeEvent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger animate-pulse">
              <XCircle className="h-3 w-3" />
              Active
            </span>
          )}
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
      </div>

      {summary?.activeDowntimeEvent && (
        <div className="mx-3 my-2 rounded-md border border-danger/20 bg-danger/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-danger" />
            <span className="text-xs font-semibold text-danger">Active Downtime</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{summary.activeDowntimeEvent.reason}</p>
          <p className="text-[10px] text-foreground font-medium mt-1">
            Started: {summary.activeDowntimeEvent.startTime} · {summary.activeDowntimeEvent.durationMinutes}m elapsed
          </p>
        </div>
      )}

      {summary && (
        <div className="px-4 py-2 border-b border-border/10 text-[10px] text-muted-foreground">
          {summary.topReason ? (
            <span>Top reason: <span className="font-medium text-foreground">{summary.topReason}</span> ({summary.topReasonDurationMinutes}m)</span>
          ) : (
            <span>No downtime recorded</span>
          )}
        </div>
      )}

      {events.length > 0 && (
        <>
          <div className="max-h-48 overflow-y-auto">
            {(expanded ? events : events.slice(0, 5)).map((event) => (
              <DowntimeEventRow
                key={event.id}
                event={event}
                onOpenDetail={onOpenDetail}
                onCreateIssue={onCreateIssueFromDowntime}
                onCreateAction={onCreateActionFromDowntime}
              />
            ))}
          </div>
          {events.length > 5 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-full py-1.5 text-[10px] font-medium text-accent hover:bg-muted/30 transition-colors"
            >
              {expanded ? "Show less" : `Show all ${events.length} events`}
            </button>
          )}
        </>
      )}

      {events.length === 0 && !summary?.activeDowntimeEvent && (
        <div className="px-4 py-6 text-center">
          <p className="text-[10px] text-muted-foreground">No downtime events recorded</p>
        </div>
      )}
    </div>
  );
}
