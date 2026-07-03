import { useState } from "react";
import { Clock, Activity, XCircle, CheckCircle2, AlertTriangle, GitBranch, User } from "lucide-react";
import type { LiveShopfloorTimelineEvent } from "@/types/liveShopfloor";

interface Props {
  timelineEvents: LiveShopfloorTimelineEvent[];
}

const MAX_EVENTS = 5;

const EVENT_ICONS: Record<string, typeof Clock> = {
  shift_started: Clock,
  production_count_update: Activity,
  changeover_started: Activity,
  changeover_completed: CheckCircle2,
  downtime_started: XCircle,
  downtime_closed: CheckCircle2,
  quality_alert: AlertTriangle,
  issue_created: AlertTriangle,
  action_created: CheckCircle2,
  bottleneck_detected: GitBranch,
  resource_status_changed: Activity,
  line_status_changed: Activity,
};

const EVENT_COLORS: Record<string, string> = {
  shift_started: "text-sky-600",
  production_count_update: "text-sky-600",
  changeover_started: "text-sky-600",
  changeover_completed: "text-emerald-600",
  downtime_started: "text-red-600",
  downtime_closed: "text-emerald-600",
  quality_alert: "text-amber-600",
  issue_created: "text-amber-600",
  action_created: "text-emerald-600",
  bottleneck_detected: "text-amber-600",
  resource_status_changed: "text-slate-600",
  line_status_changed: "text-sky-600",
};

export function RecentEventsPanel({ timelineEvents }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const visibleEvents = collapsed ? timelineEvents.slice(0, MAX_EVENTS) : timelineEvents;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="h-8 shrink-0 border-b border-slate-200 px-3 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Recent Events</h3>
          <span className="text-[10px] text-slate-400 tabular-nums">({timelineEvents.length})</span>
        </div>
        {timelineEvents.length > MAX_EVENTS && (
          <button type="button" onClick={() => setCollapsed(!collapsed)}
            className="text-[10px] font-medium text-sky-700 hover:bg-sky-50 rounded px-1.5 py-0.5 transition-colors">
            {collapsed ? `View all` : `Show less`}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {timelineEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-slate-500">No events recorded</p>
          </div>
        ) : (
          <div className="px-3 py-1">
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
                      {event.linkedResourceName && (
                        <><span className="text-slate-300">·</span><span className="truncate max-w-[60px]">{event.linkedResourceName}</span></>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
