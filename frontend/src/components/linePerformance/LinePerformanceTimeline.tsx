import { Clock, Activity, AlertTriangle, CheckCircle2, XCircle, GitBranch, User } from "lucide-react";
import type { TimelineEvent } from "@/types/linePerformance";

interface Props {
  events: TimelineEvent[];
}

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
  shift_started: "text-accent",
  production_count_update: "text-accent",
  downtime_started: "text-danger",
  downtime_stopped: "text-success",
  quality_issue_logged: "text-warning",
  issue_created: "text-warning",
  action_created: "text-success",
  action_completed: "text-success",
  bottleneck_detected: "text-warning",
  line_status_changed: "text-accent",
};

export function LinePerformanceTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Timeline</h3>
        </div>
        <p className="text-[10px] text-muted-foreground text-center py-4">No events recorded</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Timeline</h3>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {events.map((event) => {
          const Icon = EVENT_ICONS[event.eventType] || Clock;
          const color = EVENT_COLORS[event.eventType] || "text-muted-foreground";
          return (
            <div key={event.id} className="flex items-start gap-3 px-4 py-2 border-b border-border/10 hover:bg-muted/30 transition-colors">
              <div className={`shrink-0 mt-0.5 ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{event.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <span>{event.timestamp}</span>
                  {event.userName && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {event.userName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
