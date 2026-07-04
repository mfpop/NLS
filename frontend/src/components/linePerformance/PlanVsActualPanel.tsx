import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import type { PlanVsActual } from "@/types/linePerformance";

interface Props {
  data: PlanVsActual | null;
}

export function PlanVsActualPanel({ data }: Props) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground">Plan vs actual data unavailable</p>
      </div>
    );
  }

  const behind = data.status === "behind" || data.status === "critical";
  const barColor = data.status === "ahead" || data.status === "on_plan" ? "bg-success/100"
    : behind ? "bg-warning/100" : "bg-muted-foreground/40";
  const statusTextColor = data.status === "ahead" || data.status === "on_plan" ? "text-success"
    : behind ? "text-warning" : "text-muted-foreground";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted shrink-0">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Plan vs Actual</h3>
        </div>
        <span className={`text-xs font-bold tabular-nums ${statusTextColor}`}>
          {data.progressPercent}%
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 px-3 py-1.5">
        {/* Large progress bar */}
        <div className="mb-2">
          <div className="h-3 rounded-[2px] bg-muted/80 overflow-hidden">
            <div className={`h-full rounded-[2px] transition-all ${barColor}`}
              style={{ width: `${Math.min(data.progressPercent, 100)}%` }} />
          </div>
        </div>

        {/* Key figures */}
        <div className="grid grid-cols-4 gap-1 mb-1.5">
          <div>
            <span className="text-[10px] text-muted-foreground block">Plan</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{data.plannedQuantity}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Actual</span>
            <span className={`text-sm font-bold tabular-nums ${statusTextColor}`}>{data.actualQuantity}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Gap</span>
            <span className={`text-sm font-bold tabular-nums flex items-center gap-0.5 ${statusTextColor}`}>
              {data.gap >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {data.gap >= 0 ? `+${data.gap}` : data.gap}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Remain</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{data.remainingQuantity}</span>
          </div>
        </div>

        {/* Run rates */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Target:</span>
            <span className="font-medium text-foreground tabular-nums">{data.targetRunRate} {data.runRateUnit}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Actual:</span>
            <span className={`font-medium tabular-nums ${statusTextColor}`}>{data.actualRunRate} {data.runRateUnit}</span>
          </div>
        </div>

        {/* EOS projection */}
        {data.projectedEndOfShift !== null && (
          <div className="flex items-center gap-1 text-[10px] mt-1 pt-1 border-t border-border/50">
            <span className="text-muted-foreground">EOS Projection:</span>
            <span className={`font-medium tabular-nums ${statusTextColor}`}>{data.projectedEndOfShift}</span>
            <span className="text-muted-foreground/60">units</span>
          </div>
        )}
      </div>
    </div>
  );
}
