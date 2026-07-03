import { useState } from "react";
import { Clock, Activity, XCircle, CheckCircle2, AlertTriangle, GitBranch, User } from "lucide-react";
import type { TimelineEvent } from "@/types/linePerformance";

interface Props {
  timelineEvents: TimelineEvent[];
}

const MAX_EVENTS = 4;

const EVENT_ICONS: Record<string, typeof Clock> = {
  shift_started: Clock,
  production_count_update: Activity,
  downtime_started: XCircle,
  downtime_stopped: CheckCircle2,
  quality_issue_logged: AlertTriangle,
  issue_created: AlertTriangle,
  action_created: CheckCircle2,
  action_completed: CheckCircle2,
  bottleneck_detected: GitBranch,
  line_status_changed: Activity,
};

const EVENT_COLORS: Record<string, string> = {
  shift_started: "text-sky-600",
  production_count_update: "text-sky-600",
  downtime_started: "text-red-600",
  downtime_stopped: "text-emerald-600",
  quality_issue_logged: "text-amber-600",
  issue_created: "text-amber-600",
  action_created: "text-emerald-600",
  action_completed: "text-emerald-600",
  bottleneck_detected: "text-amber-600",
  line_status_changed: "text-sky-600",
};

export function TimelineMiniPanel({ timelineEvents }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visibleEvents = showAll ? timelineEvents : timelineEvents.slice(0, MAX_EVENTS);
  const hasMore = timelineEvents.length > MAX_EVENTS;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Timeline</h3>
          <span className="text-[10px] text-slate-400 tabular-nums">{timelineEvents.length}</span>
        </div>
      </div>

      {/* Body — max 4 events, no scroll */}
      <div className="flex-1 min-h-0 px-3 py-1">
        {timelineEvents.length === 0 ? (
          <p className="text-[10px] text-slate-500 text-center py-3">No events recorded</p>
        ) : (
          <>
            {visibleEvents.map((event) => {
              const Icon = EVENT_ICONS[event.eventType] || Clock;
              const color = EVENT_COLORS[event.eventType] || "text-slate-400";
              return (
                <div key={event.id} className="flex items-start gap-1.5 py-1 border-b border-slate-100 last:border-b-0">
                  <div className={`shrink-0 mt-0.5 ${color}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-700 leading-tight truncate">{event.description}</p>
                    <div className="flex items-center gap-1 text-[9px] text-slate-500">
                      <span className="tabular-nums">{event.timestamp}</span>
                      {event.userName && (
                        <><span className="text-slate-300">·</span><span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{event.userName}</span></>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMore && !showAll && (
              <button type="button" onClick={() => setShowAll(true)}
                className="w-full py-1 text-[10px] font-medium text-sky-700 hover:bg-slate-50 transition-colors text-center">
                View all {timelineEvents.length} events →
              </button>
            )}
            {showAll && hasMore && (
              <button type="button" onClick={() => setShowAll(false)}
                className="w-full py-1 text-[10px] font-medium text-sky-700 hover:bg-slate-50 transition-colors text-center">
                Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
