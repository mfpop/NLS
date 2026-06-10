import { GitBranch, AlertTriangle, HelpCircle } from "lucide-react";
import type { BottleneckSignal } from "@/types/linePerformance";

interface Props {
  data: BottleneckSignal | null;
}

export function BottleneckPanel({ data }: Props) {
  if (!data) {
    return (
      <div className="rounded-md border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Bottleneck data unavailable</p>
        </div>
      </div>
    );
  }

  if (!data.resourceName && !data.resourceGroupName && !data.cycleTimeSignal) {
    return (
      <div className="rounded-md border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No bottleneck signal detected</p>
        </div>
      </div>
    );
  }

  const hasIssue = data.isConstrained || data.blockedStatus === "blocked" || data.starvedStatus === "starved";

  return (
    <div className={`rounded-md border p-4 ${
      hasIssue ? "border-warning/30 bg-warning/5" : "border-border/50 bg-card"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Bottleneck</h3>
        <GitBranch className="h-4 w-4 text-muted-foreground" />
      </div>

      {data.resourceName && (
        <div className="mb-2">
          <span className="text-[10px] text-muted-foreground block">Resource</span>
          <span className="text-sm font-semibold text-foreground">{data.resourceName}</span>
        </div>
      )}

      {data.resourceGroupName && (
        <div className="mb-2">
          <span className="text-[10px] text-muted-foreground block">Resource Group</span>
          <span className="text-xs font-medium text-foreground">{data.resourceGroupName}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-2">
        {data.cycleTimeSignal && (
          <div className="rounded bg-muted/50 px-2 py-1">
            <span className="text-[10px] text-muted-foreground block">Cycle Time</span>
            <span className="text-xs font-medium text-foreground">{data.cycleTimeSignal}</span>
          </div>
        )}
        {data.queueWipSignal && (
          <div className="rounded bg-muted/50 px-2 py-1">
            <span className="text-[10px] text-muted-foreground block">Queue/WIP</span>
            <span className="text-xs font-medium text-foreground">{data.queueWipSignal}</span>
          </div>
        )}
        <div className="rounded bg-muted/50 px-2 py-1">
          <span className="text-[10px] text-muted-foreground block">Status</span>
          <span className={`text-xs font-medium ${
            data.runningStatus === "running" ? "text-success"
              : data.blockedStatus === "blocked" ? "text-danger"
                : data.starvedStatus === "starved" ? "text-warning"
                  : "text-muted-foreground"
          }`}>
            {data.runningStatus === "running" ? "Running"
              : data.blockedStatus === "blocked" ? "Blocked"
                : data.starvedStatus === "starved" ? "Starved"
                  : "—"}
          </span>
        </div>
      </div>

      {hasIssue && (
        <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/20 p-2 mt-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
          <div>
            {data.reasonSummary && (
              <p className="text-[10px] font-medium text-foreground">{data.reasonSummary}</p>
            )}
            {data.attentionMessage && (
              <p className="text-[10px] text-warning mt-0.5">{data.attentionMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
