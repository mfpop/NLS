import { Clock, Activity, AlertTriangle, XCircle, CheckCircle2, GitBranch, User, Package } from "lucide-react";
import type { LiveShopfloorTimelineEvent } from "@/types/liveShopfloor";

interface Props {
  events: LiveShopfloorTimelineEvent[];
}

const EVENT_ICONS: Record<string, typeof Clock> = {
  line_status_changed: Activity,
  resource_status_changed: Activity,
  downtime_started: XCircle,
  downtime_closed: CheckCircle2,
  issue_created: AlertTriangle,
  action_created: CheckCircle2,
  action_completed: CheckCircle2,
  quality_alert: AlertTriangle,
  material_shortage: AlertTriangle,
  safety_alert: AlertTriangle,
  production_count_update: Package,
  shift_started: Clock,
  changeover_started: Clock,
  changeover_completed: CheckCircle2,
  bottleneck_detected: GitBranch,
};

const EVENT_COLORS: Record<string, string> = {
  line_status_changed: "text-accent-foreground",
  resource_status_changed: "text-accent-foreground",
  downtime_started: "text-danger",
  downtime_closed: "text-success",
  issue_created: "text-warning",
  action_created: "text-success",
  action_completed: "text-success",
  quality_alert: "text-warning",
  material_shortage: "text-warning",
  safety_alert: "text-danger",
  production_count_update: "text-accent-foreground",
  shift_started: "text-accent-foreground",
  changeover_started: "text-accent-foreground",
  changeover_completed: "text-success",
  bottleneck_detected: "text-warning",
};

const MAX_VISIBLE_EVENTS = 5;

export function ShopfloorTimeline({ events }: Props) {
  const hasMore = events.length > MAX_VISIBLE_EVENTS;
  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Recent Events</h3>
          {events.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60">{events.length}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No recent events</p>
          </div>
        ) : (
          <>
            {visibleEvents.map((event) => {
              const Icon = EVENT_ICONS[event.eventType] || Activity;
              const color = EVENT_COLORS[event.eventType] || "text-muted-foreground/60";
              return (
                <div key={event.id} className="flex items-start gap-2 px-3 py-1.5 border-b border-border/50 last:border-b-0 hover:bg-muted/50">
                  <div className={`shrink-0 mt-0.5 ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground leading-snug truncate">{event.description}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground leading-tight">
                      <span className="tabular-nums">{event.timestamp}</span>
                      {event.userName && (
                        <><span className="text-muted-foreground/30">·</span><span className="flex items-center gap-0.5"><User className="h-3 w-3" />{event.userName}</span></>
                      )}
                      {event.linkedResourceName && (
                        <><span className="text-muted-foreground/30">·</span><span className="truncate">{event.linkedResourceName}</span></>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <button
                type="button"
                className="w-full py-1.5 text-[10px] font-medium text-accent-foreground hover:bg-muted transition-colors text-center"
                onClick={() => {}}
              >
                View all {events.length} events →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
