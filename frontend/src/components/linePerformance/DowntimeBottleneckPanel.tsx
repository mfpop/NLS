import { useState } from "react";
import { Clock, AlertTriangle, XCircle, GitBranch } from "lucide-react";
import type { DowntimeSummary, DowntimeEvent, BottleneckSignal } from "@/types/linePerformance";

interface Props {
  downtimeSummary: DowntimeSummary | null;
  downtimeEvents: DowntimeEvent[];
  bottleneckSignal: BottleneckSignal | null;
  onLogDowntime: () => void;
}

const MAX_VISIBLE_DOWNTIME = 2;

export function DowntimeBottleneckPanel({ downtimeSummary, downtimeEvents, bottleneckSignal, onLogDowntime }: Props) {
  const [showAllDowntime, setShowAllDowntime] = useState(false);
  const visibleEvents = showAllDowntime ? downtimeEvents : downtimeEvents.slice(0, MAX_VISIBLE_DOWNTIME);
  const hasMoreDowntime = downtimeEvents.length > MAX_VISIBLE_DOWNTIME;

  return (
    <div className="flex flex-col h-full">
      {/* ── Downtime Section ── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Downtime</h3>
            {downtimeSummary && (
              <span className={`text-xs font-bold tabular-nums ${
                downtimeSummary.totalDowntimeMinutes > 60 ? "text-red-600" : downtimeSummary.totalDowntimeMinutes > 30 ? "text-amber-600" : "text-slate-500"
              }`}>
                {downtimeSummary.totalDowntimeMinutes}m
              </span>
            )}
          </div>
          <button type="button" onClick={onLogDowntime}
            className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Log
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-1.5">
          {downtimeSummary?.activeDowntimeEvent && (
            <div className="flex items-start gap-1.5 rounded border border-red-200 bg-red-50 p-1.5 mb-1.5">
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-slate-800 leading-tight">{downtimeSummary.activeDowntimeEvent.reason}</p>
                <p className="text-[10px] text-slate-600">{downtimeSummary.activeDowntimeEvent.startTime} · {downtimeSummary.activeDowntimeEvent.durationMinutes}m</p>
              </div>
            </div>
          )}

          {downtimeSummary?.topReason && (
            <p className="text-[10px] text-slate-600 mb-1">
              Top reason: <span className="font-medium text-slate-800">{downtimeSummary.topReason}</span> ({downtimeSummary.topReasonDurationMinutes}m)
            </p>
          )}

          {visibleEvents.length === 0 && !downtimeSummary?.activeDowntimeEvent && (
            <p className="text-[10px] text-slate-500 text-center py-2">No downtime events</p>
          )}

          {visibleEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-1.5 py-1 border-b border-slate-100 last:border-b-0">
              <Clock className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-medium text-slate-800 truncate">{event.reason}</span>
                  <span className="shrink-0 text-[10px] text-slate-500 tabular-nums">{event.durationMinutes}m</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                  <span>{event.startTime}{event.endTime ? `→${event.endTime}` : ""}</span>
                  {event.resourceName && <><span className="text-slate-300">·</span><span className="truncate">{event.resourceName}</span></>}
                </div>
              </div>
            </div>
          ))}

          {hasMoreDowntime && !showAllDowntime && (
            <button type="button" onClick={() => setShowAllDowntime(true)}
              className="w-full py-1 text-[10px] font-medium text-sky-700 hover:bg-slate-50 text-center transition-colors">
              View all {downtimeEvents.length} events →
            </button>
          )}
          {showAllDowntime && hasMoreDowntime && (
            <button type="button" onClick={() => setShowAllDowntime(false)}
              className="w-full py-1 text-[10px] font-medium text-sky-700 hover:bg-slate-50 text-center transition-colors">
              Show less
            </button>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-slate-200" />

      {/* ── Bottleneck Section ── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <GitBranch className="h-3.5 w-3.5 text-slate-500" />
          <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Bottleneck</h3>
          {bottleneckSignal?.isConstrained && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 border border-amber-200">
              <AlertTriangle className="h-2.5 w-2.5" />
              Active
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-1.5">
          {!bottleneckSignal || (!bottleneckSignal.resourceName && !bottleneckSignal.resourceGroupName) ? (
            <p className="text-[10px] text-slate-500 text-center py-2">No bottleneck signal</p>
          ) : (
            <div className="space-y-1 text-[10px]">
              <div className="grid grid-cols-2 gap-1">
                {bottleneckSignal.resourceName && (
                  <div>
                    <span className="text-slate-500">Resource</span>
                    <p className="font-medium text-slate-800 truncate" title={bottleneckSignal.resourceName}>{bottleneckSignal.resourceName}</p>
                  </div>
                )}
                {bottleneckSignal.resourceGroupName && (
                  <div>
                    <span className="text-slate-500">Group</span>
                    <p className="font-medium text-slate-800 truncate" title={bottleneckSignal.resourceGroupName}>{bottleneckSignal.resourceGroupName}</p>
                  </div>
                )}
              </div>
              {(bottleneckSignal.cycleTimeSignal || bottleneckSignal.queueWipSignal) && (
                <div className="flex items-center gap-2 text-[10px] text-slate-600 border-t border-slate-100 pt-1">
                  {bottleneckSignal.cycleTimeSignal && (
                    <span className="truncate" title={bottleneckSignal.cycleTimeSignal}>
                      <span className="text-slate-500">CT:</span> {bottleneckSignal.cycleTimeSignal}
                    </span>
                  )}
                  {bottleneckSignal.queueWipSignal && (
                    <span className="truncate" title={bottleneckSignal.queueWipSignal}>
                      <span className="text-slate-500">WIP:</span> {bottleneckSignal.queueWipSignal}
                    </span>
                  )}
                </div>
              )}
              {bottleneckSignal.attentionMessage && (
                <p className="flex items-start gap-1 text-[10px] text-amber-700 leading-tight truncate" title={bottleneckSignal.attentionMessage}>
                  <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                  <span className="truncate">{bottleneckSignal.attentionMessage}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
