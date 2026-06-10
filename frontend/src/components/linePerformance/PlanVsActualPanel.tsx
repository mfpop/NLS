import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import type { PlanVsActual } from "@/types/linePerformance";

interface Props {
  data: PlanVsActual | null;
}

export function PlanVsActualPanel({ data }: Props) {
  if (!data) {
    return (
      <div className="rounded-md border border-border/50 bg-card p-4">
        <p className="text-xs text-muted-foreground">Plan vs actual data unavailable</p>
      </div>
    );
  }

  const statusColor =
    data.status === "ahead" || data.status === "on_plan"
      ? "text-success"
      : data.status === "behind"
        ? "text-warning"
        : data.status === "critical"
          ? "text-danger"
          : "text-muted-foreground";

  const barColor =
    data.status === "ahead" || data.status === "on_plan"
      ? "bg-success"
      : data.status === "behind"
        ? "bg-warning"
        : data.status === "critical"
          ? "bg-danger"
          : "bg-muted-foreground";

  return (
    <div className="rounded-md border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Plan vs Actual</h3>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <span className="text-[10px] text-muted-foreground block">Planned</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{data.plannedQuantity}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Actual</span>
          <span className={`text-lg font-bold tabular-nums ${statusColor}`}>{data.actualQuantity}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Remaining</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{data.remainingQuantity}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Gap</span>
          <span className={`text-lg font-bold tabular-nums flex items-center gap-1 ${statusColor}`}>
            {data.gap >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {data.gap >= 0 ? `+${data.gap}` : data.gap}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Progress</span>
          <span>{data.progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(data.progressPercent, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[10px]">
        <div className="flex items-center justify-between border-b border-border/20 pb-1">
          <span className="text-muted-foreground">Target Run Rate</span>
          <span className="font-medium text-foreground">{data.targetRunRate} {data.runRateUnit}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border/20 pb-1">
          <span className="text-muted-foreground">Actual Run Rate</span>
          <span className={`font-medium ${statusColor}`}>{data.actualRunRate} {data.runRateUnit}</span>
        </div>
        {data.projectedEndOfShift !== null && (
          <div className="flex items-center justify-between col-span-2 pt-1">
            <span className="text-muted-foreground">Projected EOS</span>
            <span className={`font-medium ${statusColor}`}>{data.projectedEndOfShift}</span>
          </div>
        )}
      </div>
    </div>
  );
}
