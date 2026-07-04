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
  shift_started: "text-accent-foreground",
  production_count_update: "text-accent-foreground",
  downtime_started: "text-danger",
  downtime_stopped: "text-success",
  quality_issue_logged: "text-warning",
  issue_created: "text-warning",
  action_created: "text-success",
  action_completed: "text-success",
  bottleneck_detected: "text-warning",
  line_status_changed: "text-accent-foreground",
};

export function TimelineMiniPanel({ timelineEvents }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visibleEvents = showAll ? timelineEvents : timelineEvents.slice(0, MAX_EVENTS);
  const hasMore = timelineEvents.length > MAX_EVENTS;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h3>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">{timelineEvents.length}</span>
        </div>
      </div>

      {/* Body — max 4 events, no scroll */}
      <div className="flex-1 min-h-0 px-3 py-1">
        {timelineEvents.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-3">No events recorded</p>
        ) : (
          <>
            {visibleEvents.map((event) => {
              const Icon = EVENT_ICONS[event.eventType] || Clock;
              const color = EVENT_COLORS[event.eventType] || "text-muted-foreground/60";
              return (
                <div key={event.id} className="flex items-start gap-1.5 py-1 border-b border-border/50 last:border-b-0">
                  <div className={`shrink-0 mt-0.5 ${color}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground leading-tight truncate">{event.description}</p>
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span className="tabular-nums">{event.timestamp}</span>
                      {event.userName && (
                        <><span className="text-muted-foreground/30">·</span><span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{event.userName}</span></>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMore && !showAll && (
              <button type="button" onClick={() => setShowAll(true)}
                className="w-full py-1 text-[10px] font-medium text-accent-foreground hover:bg-muted transition-colors text-center">
                View all {timelineEvents.length} events →
              </button>
            )}
            {showAll && hasMore && (
              <button type="button" onClick={() => setShowAll(false)}
                className="w-full py-1 text-[10px] font-medium text-accent-foreground hover:bg-muted transition-colors text-center">
                Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
