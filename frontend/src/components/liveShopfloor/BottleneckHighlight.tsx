import { GitBranch, AlertTriangle } from "lucide-react";
import type { LiveShopfloorBottleneckSignal } from "@/types/liveShopfloor";

interface Props {
  bottleneckSignal: LiveShopfloorBottleneckSignal | null;
}

export function BottleneckHighlight({ bottleneckSignal }: Props) {
  if (!bottleneckSignal?.isConstrained) return null;

  return (
    <div className="flex items-start gap-2 rounded border border-warning/20 bg-warning/10/70 px-2.5 py-2 mx-3 mb-2">
      <div className="shrink-0 mt-0.5">
        <GitBranch className="h-4 w-4 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-warning uppercase tracking-wide">Bottleneck</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-medium text-warning border border-warning/20">
            <AlertTriangle className="h-2.5 w-2.5" />
            Active
          </span>
        </div>
        {bottleneckSignal.resourceName && (
          <p className="text-xs font-medium text-foreground mt-0.5 truncate" title={bottleneckSignal.resourceName}>
            {bottleneckSignal.resourceName}
          </p>
        )}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
          {bottleneckSignal.cycleTimeSignal && (
            <span className="truncate" title={bottleneckSignal.cycleTimeSignal}>CT: {bottleneckSignal.cycleTimeSignal}</span>
          )}
          {bottleneckSignal.queueWipSignal && (
            <span className="truncate" title={bottleneckSignal.queueWipSignal}>WIP: {bottleneckSignal.queueWipSignal}</span>
          )}
        </div>
        {bottleneckSignal.attentionMessage && (
          <p className="text-[10px] text-warning mt-0.5 leading-tight truncate" title={bottleneckSignal.attentionMessage}>
            {bottleneckSignal.attentionMessage}
          </p>
        )}
      </div>
    </div>
  );
}
