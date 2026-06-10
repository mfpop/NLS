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
  line_status_changed: "text-accent",
  resource_status_changed: "text-accent",
  downtime_started: "text-danger",
  downtime_closed: "text-success",
  issue_created: "text-warning",
  action_created: "text-success",
  action_completed: "text-success",
  quality_alert: "text-warning",
  material_shortage: "text-warning",
  safety_alert: "text-danger",
  production_count_update: "text-accent",
  shift_started: "text-accent",
  changeover_started: "text-accent",
  changeover_completed: "text-success",
  bottleneck_detected: "text-warning",
};

export function ShopfloorTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Recent Events</h3>
        </div>
        <p className="text-[10px] text-muted-foreground text-center py-3">No recent events</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/50 bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Recent Events</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{events.length} event{events.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {events.slice(0, 20).map((event) => {
          const Icon = EVENT_ICONS[event.eventType] || Activity;
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
                  {event.userName && <><span className="w-1 h-1 rounded-full bg-border" /><User className="h-3 w-3" /><span>{event.userName}</span></>}
                  {event.linkedResourceName && <><span className="w-1 h-1 rounded-full bg-border" /><span>{event.linkedResourceName}</span></>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
