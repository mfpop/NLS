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
        <p className="text-[10px] text-muted-foreground">No bottleneck signal</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted shrink-0">          <div className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Bottleneck</h3>
          {data.isConstrained && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-medium text-warning border border-warning/20">
              <AlertTriangle className="h-2.5 w-2.5" />
              Active
            </span>
          )}
        </div>
        {onViewDetails && (
          <button type="button" onClick={onViewDetails} className="text-[10px] text-accent-foreground hover:bg-accent/10 rounded px-1.5 py-0.5 font-medium transition-colors" title="View full bottleneck details">
            View details →
          </button>
        )}
      </div>

      {/* Body — compact summary, no scroll */}
      <div className="flex-1 min-h-0 px-3 py-1.5 text-[10px] space-y-1">
        {data.resourceName && (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground text-xs truncate" title={data.resourceName}>{data.resourceName}</span>
            {data.resourceGroupName && (
              <span className="text-muted-foreground truncate" title={data.resourceGroupName}>{data.resourceGroupName}</span>
            )}
          </div>
        )}
        {(data.cycleTimeSignal || data.queueWipSignal) && (
          <p className="text-muted-foreground leading-snug">
            {data.cycleTimeSignal && <span className={data.isConstrained ? "text-warning font-medium" : ""}>{data.cycleTimeSignal}</span>}
            {data.cycleTimeSignal && data.queueWipSignal && <span className="text-muted-foreground/60"> · </span>}
            {data.queueWipSignal && <span className={data.isConstrained ? "text-warning font-medium" : ""}>{data.queueWipSignal}</span>}
          </p>
        )}
        {data.attentionMessage && (
          <div className="flex items-start gap-1 rounded border border-warning/20 bg-warning/10 px-1.5 py-1">
            <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
            <span className="text-[10px] text-warning leading-tight">{data.attentionMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
