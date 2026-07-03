import { useState } from "react";
import { Clock, XCircle } from "lucide-react";
import type { DowntimeSummary, DowntimeEvent } from "@/types/linePerformance";

interface Props {
  downtimeSummary: DowntimeSummary | null;
  downtimeEvents: DowntimeEvent[];
  onLogDowntime: () => void;
}

export function DowntimeParetoPanel({ downtimeSummary, downtimeEvents, onLogDowntime }: Props) {
  const [showAll, setShowAll] = useState(false);

  const totalMinutes = downtimeSummary?.totalDowntimeMinutes ?? 0;

  // Group by reason code, aggregate duration
  const reasonMap = new Map<string, { reason: string; code: string; totalMinutes: number }>();
  for (const e of downtimeEvents) {
    const existing = reasonMap.get(e.reasonCode);
    if (existing) {
      existing.totalMinutes += e.durationMinutes;
    } else {
      reasonMap.set(e.reasonCode, { reason: e.reason, code: e.reasonCode, totalMinutes: e.durationMinutes });
    }
  }

  const topCauses = [...reasonMap.values()]
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  // If no events but summary has topReason, create a synthetic entry
  if (topCauses.length === 0 && downtimeSummary?.topReason && downtimeSummary.topReasonDurationMinutes) {
    topCauses.push({
      reason: downtimeSummary.topReason,
      code: "TOP",
      totalMinutes: downtimeSummary.topReasonDurationMinutes,
    });
  }

  const visibleCauses = showAll ? topCauses : topCauses.slice(0, 3);
  const hasMore = topCauses.length > 3;
  const isActive = !!downtimeSummary?.activeDowntimeEvent;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Downtime</h3>
          <span className={`text-xs font-bold tabular-nums ${totalMinutes > 60 ? "text-red-600" : totalMinutes > 30 ? "text-amber-600" : "text-slate-500"}`}>
            {totalMinutes}m
          </span>
        </div>
        <button type="button" onClick={onLogDowntime}
          className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          Log
        </button>
      </div>

      {/* Body — top 3 causes, no scroll */}
      <div className="flex-1 min-h-0 px-3 py-1.5">
        {/* Active downtime alert */}
        {isActive && downtimeSummary?.activeDowntimeEvent && (
          <div className="flex items-start gap-1.5 rounded border border-red-200 bg-red-50 p-1.5 mb-2">
            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-slate-800 leading-tight">{downtimeSummary.activeDowntimeEvent.reason}</p>
              <p className="text-[10px] text-slate-600">{downtimeSummary.activeDowntimeEvent.startTime} · {downtimeSummary.activeDowntimeEvent.durationMinutes}m</p>
            </div>
          </div>
        )}

        {/* Pareto top causes */}
        {topCauses.length === 0 && !isActive ? (
          <p className="text-[10px] text-slate-500 text-center py-3">No downtime recorded</p>
        ) : (
          <>
            {visibleCauses.map((cause) => {
              const pct = totalMinutes > 0 ? Math.round((cause.totalMinutes / totalMinutes) * 100) : 0;
              return (
                <div key={cause.code} className="mb-1.5 last:mb-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] text-slate-800 truncate font-medium">{cause.reason}</span>
                    <span className="shrink-0 text-[10px] text-slate-600 tabular-nums font-medium">{cause.totalMinutes}m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-500 tabular-nums w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
            {hasMore && !showAll && (
              <button type="button" onClick={() => setShowAll(true)}
                className="w-full py-1 text-[10px] font-medium text-sky-700 hover:bg-slate-50 transition-colors text-center">
                View all {topCauses.length} causes →
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
