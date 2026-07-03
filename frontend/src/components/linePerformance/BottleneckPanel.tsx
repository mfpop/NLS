import { GitBranch, AlertTriangle } from "lucide-react";
import type { BottleneckSignal } from "@/types/linePerformance";

interface Props {
  data: BottleneckSignal | null;
  onViewDetails?: () => void;
}

export function BottleneckPanel({ data, onViewDetails }: Props) {
  if (!data || (!data.resourceName && !data.cycleTimeSignal)) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[10px] text-slate-500">No bottleneck signal</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">          <div className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 text-slate-500" />
          <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Bottleneck</h3>
          {data.isConstrained && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 border border-amber-200">
              <AlertTriangle className="h-2.5 w-2.5" />
              Active
            </span>
          )}
        </div>
        {onViewDetails && (
          <button type="button" onClick={onViewDetails} className="text-[10px] text-sky-700 hover:bg-sky-50 rounded px-1.5 py-0.5 font-medium transition-colors" title="View full bottleneck details">
            View details →
          </button>
        )}
      </div>

      {/* Body — compact summary, no scroll */}
      <div className="flex-1 min-h-0 px-3 py-1.5 text-[10px] space-y-1">
        {data.resourceName && (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-800 text-xs truncate" title={data.resourceName}>{data.resourceName}</span>
            {data.resourceGroupName && (
              <span className="text-slate-500 truncate" title={data.resourceGroupName}>{data.resourceGroupName}</span>
            )}
          </div>
        )}
        {(data.cycleTimeSignal || data.queueWipSignal) && (
          <p className="text-slate-700 leading-snug">
            {data.cycleTimeSignal && <span className={data.isConstrained ? "text-amber-700 font-medium" : ""}>{data.cycleTimeSignal}</span>}
            {data.cycleTimeSignal && data.queueWipSignal && <span className="text-slate-400"> · </span>}
            {data.queueWipSignal && <span className={data.isConstrained ? "text-amber-700 font-medium" : ""}>{data.queueWipSignal}</span>}
          </p>
        )}
        {data.attentionMessage && (
          <div className="flex items-start gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-1">
            <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-[10px] text-amber-800 leading-tight">{data.attentionMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
