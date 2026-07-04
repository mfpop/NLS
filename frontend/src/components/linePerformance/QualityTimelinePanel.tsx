import { ShieldCheck, AlertTriangle, Clock, Activity, XCircle, CheckCircle2, GitBranch, User } from "lucide-react";
import type { QualitySummary, TimelineEvent } from "@/types/linePerformance";

interface Props {
  qualitySummary: QualitySummary | null;
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

export function QualityTimelinePanel({ qualitySummary, timelineEvents }: Props) {
  const visibleEvents = timelineEvents.slice(0, MAX_EVENTS);
  const hasMoreEvents = timelineEvents.length > MAX_EVENTS;

  const fpyStatus = qualitySummary?.firstPassYield !== null && qualitySummary?.firstPassYield !== undefined
    ? qualitySummary.firstPassYield >= 0.98 ? "good" : qualitySummary.firstPassYield >= 0.95 ? "warning" : "critical"
    : "neutral";

  return (
    <div className="flex flex-col h-full">
      {/* ── Quality Section ── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Quality</h3>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-1.5">
          {!qualitySummary ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">Quality data unavailable</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mb-1">
                <div>
                  <span className="text-muted-foreground">Good</span>
                  <p className="text-xs font-semibold text-foreground">{qualitySummary.goodQuantity}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rejected</span>
                  <p className="text-xs font-semibold text-danger">{qualitySummary.rejectedQuantity}</p>
                </div>
                {qualitySummary.reworkQuantity !== null && (
                  <div>
                    <span className="text-muted-foreground">Rework</span>
                    <p className="text-xs font-semibold text-warning">{qualitySummary.reworkQuantity}</p>
                  </div>
                )}
                {qualitySummary.scrapQuantity !== null && (
                  <div>
                    <span className="text-muted-foreground">Scrap</span>
                    <p className="text-xs font-semibold text-danger">{qualitySummary.scrapQuantity}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">FPY</span>
                  <p className={`text-xs font-semibold ${
                    fpyStatus === "good" ? "text-success" : fpyStatus === "warning" ? "text-warning" : fpyStatus === "critical" ? "text-danger" : "text-foreground"
                  }`}>
                    {qualitySummary.firstPassYield !== null ? `${(qualitySummary.firstPassYield * 100).toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Defects</span>
                  <p className="text-xs font-semibold text-foreground">{qualitySummary.defectCount}</p>
                </div>
              </div>
              {qualitySummary.topDefectReason && (
                <div className="flex items-center gap-1 rounded bg-warning/10 border border-warning/20 px-1.5 py-1">
                  <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                  <span className="text-[10px] text-muted-foreground leading-tight">{qualitySummary.topDefectReason}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-border" />

      {/* ── Timeline Section ── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h3>
            <span className="text-[10px] text-muted-foreground/60">{timelineEvents.length}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-1.5">
          {timelineEvents.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">No events recorded</p>
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
              {hasMoreEvents && (
                <button type="button" className="w-full py-1 text-[10px] font-medium text-accent-foreground hover:bg-muted transition-colors text-center">
                  View all {timelineEvents.length} events →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
