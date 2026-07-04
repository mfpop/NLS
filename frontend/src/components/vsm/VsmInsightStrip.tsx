import { Lightbulb, AlertTriangle, BarChart3 } from "lucide-react";
import type { VsmDiagram } from "@/types/vsm";

interface Props {
  diagram: VsmDiagram;
  className?: string;
}

export function VsmInsightStrip({ diagram, className = "" }: Props) {
  const nodes = diagram.processNodes;
  const bottleneck = nodes.find((n) => n.isBottleneck);
  const largestWip = [...nodes].sort((a, b) => b.wipAfter - a.wipAfter)[0];
  const totalWip = nodes.reduce((sum, n) => sum + n.wipBefore + n.wipAfter, 0);
  const vaPct = diagram.totalLeadTimeMinutes > 0
    ? Math.round((diagram.totalValueAddMinutes / diagram.totalLeadTimeMinutes) * 100)
    : 0;

  let insight = "Flow appears balanced — monitor CT and WIP levels.";
  if (bottleneck) {
    insight = `Lead time driven by queue at ${bottleneck.label}. Immediate: reduce CT or rebalance workload.`;
  } else if (largestWip && largestWip.wipAfter > 100) {
    insight = `Excessive WIP at ${largestWip.label} (${largestWip.wipAfter} units) — flow imbalance detected.`;
  } else if (vaPct < 30) {
    insight = `Only ${vaPct}% of lead time is value-added — significant waste in waiting/queues.`;
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-1 border-t border-border bg-muted text-[11px] shrink-0 ${className}`}>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="flex items-center gap-1 text-muted-foreground">
          <BarChart3 className="h-3 w-3 text-muted-foreground/60" />
          Lead: <strong className="text-foreground tabular-nums">{formatTime(diagram.totalLeadTimeMinutes)}</strong>
        </span>
        <span className="text-muted-foreground/30">|</span>
        <span className="text-success">
          VA: <strong className="tabular-nums">{formatTime(diagram.totalValueAddMinutes)}</strong>
          <span className={`ml-0.5 font-semibold ${vaPct < 10 ? "text-danger" : vaPct < 30 ? "text-warning" : "text-success"}`}>
            ({vaPct}%)
          </span>
        </span>
        <span className="text-muted-foreground/30">|</span>
        <span className="text-muted-foreground">
          WIP: <strong className="tabular-nums">{totalWip}</strong>
        </span>
      </div>

      <span className="text-slate-200 shrink-0">|</span>

      {bottleneck && (
        <span className="flex items-center gap-1 text-warning shrink-0">
          <AlertTriangle className="h-3 w-3" />
          <strong>{bottleneck.label}</strong> bottleneck · CT={bottleneck.cycleTimeSeconds}s · WIP={bottleneck.wipAfter}
        </span>
      )}
      {!bottleneck && largestWip && largestWip.wipAfter > 80 && (
        <span className="flex items-center gap-1 text-warning shrink-0">
          <AlertTriangle className="h-3 w-3" />
          High WIP at <strong>{largestWip.label}</strong> ({largestWip.wipAfter})
        </span>
      )}

      <span className="text-slate-200 shrink-0">|</span>

      <span className="flex items-center gap-1 text-muted-foreground truncate min-w-0">
        <Lightbulb className="h-3 w-3 text-accent-foreground shrink-0" />
        <span className="truncate">{insight}</span>
      </span>
    </div>
  );
}

function formatTime(minutes: number): string {
  if (minutes >= 1440) return `${(minutes / 1440).toFixed(1)}d`;
  if (minutes >= 60) return `${Math.round(minutes / 60)}min`;
  return `${minutes}min`;
}
