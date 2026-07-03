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
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
            <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Quality</h3>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-1.5">
          {!qualitySummary ? (
            <p className="text-[10px] text-slate-500 text-center py-2">Quality data unavailable</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mb-1">
                <div>
                  <span className="text-slate-500">Good</span>
                  <p className="text-xs font-semibold text-slate-800">{qualitySummary.goodQuantity}</p>
                </div>
                <div>
                  <span className="text-slate-500">Rejected</span>
                  <p className="text-xs font-semibold text-red-600">{qualitySummary.rejectedQuantity}</p>
                </div>
                {qualitySummary.reworkQuantity !== null && (
                  <div>
                    <span className="text-slate-500">Rework</span>
                    <p className="text-xs font-semibold text-amber-600">{qualitySummary.reworkQuantity}</p>
                  </div>
                )}
                {qualitySummary.scrapQuantity !== null && (
                  <div>
                    <span className="text-slate-500">Scrap</span>
                    <p className="text-xs font-semibold text-red-600">{qualitySummary.scrapQuantity}</p>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">FPY</span>
                  <p className={`text-xs font-semibold ${
                    fpyStatus === "good" ? "text-emerald-600" : fpyStatus === "warning" ? "text-amber-600" : fpyStatus === "critical" ? "text-red-600" : "text-slate-800"
                  }`}>
                    {qualitySummary.firstPassYield !== null ? `${(qualitySummary.firstPassYield * 100).toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Defects</span>
                  <p className="text-xs font-semibold text-slate-800">{qualitySummary.defectCount}</p>
                </div>
              </div>
              {qualitySummary.topDefectReason && (
                <div className="flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                  <span className="text-[10px] text-slate-700 leading-tight">{qualitySummary.topDefectReason}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-slate-200" />

      {/* ── Timeline Section ── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Timeline</h3>
            <span className="text-[10px] text-slate-400">{timelineEvents.length}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-1.5">
          {timelineEvents.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-2">No events recorded</p>
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
              {hasMoreEvents && (
                <button type="button" className="w-full py-1 text-[10px] font-medium text-sky-700 hover:bg-slate-50 transition-colors text-center">
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
