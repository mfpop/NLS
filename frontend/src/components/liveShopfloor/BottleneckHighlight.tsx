import { GitBranch, AlertTriangle } from "lucide-react";
import type { LiveShopfloorBottleneckSignal } from "@/types/liveShopfloor";

interface Props {
  bottleneckSignal: LiveShopfloorBottleneckSignal | null;
}

export function BottleneckHighlight({ bottleneckSignal }: Props) {
  if (!bottleneckSignal?.isConstrained) return null;

  return (
    <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50/70 px-2.5 py-2 mx-3 mb-2">
      <div className="shrink-0 mt-0.5">
        <GitBranch className="h-4 w-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">Bottleneck</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 border border-amber-200">
            <AlertTriangle className="h-2.5 w-2.5" />
            Active
          </span>
        </div>
        {bottleneckSignal.resourceName && (
          <p className="text-xs font-medium text-slate-800 mt-0.5 truncate" title={bottleneckSignal.resourceName}>
            {bottleneckSignal.resourceName}
          </p>
        )}
        <div className="flex items-center gap-3 text-[10px] text-slate-600 mt-0.5">
          {bottleneckSignal.cycleTimeSignal && (
            <span className="truncate" title={bottleneckSignal.cycleTimeSignal}>CT: {bottleneckSignal.cycleTimeSignal}</span>
          )}
          {bottleneckSignal.queueWipSignal && (
            <span className="truncate" title={bottleneckSignal.queueWipSignal}>WIP: {bottleneckSignal.queueWipSignal}</span>
          )}
        </div>
        {bottleneckSignal.attentionMessage && (
          <p className="text-[10px] text-amber-800 mt-0.5 leading-tight truncate" title={bottleneckSignal.attentionMessage}>
            {bottleneckSignal.attentionMessage}
          </p>
        )}
      </div>
    </div>
  );
}
