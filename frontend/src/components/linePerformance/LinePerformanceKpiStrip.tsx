import { Package, Activity, TrendingDown, Gauge, Target, Clock, ShieldCheck } from "lucide-react";
import { LinePerformanceKpiCard } from "./LinePerformanceKpiCard";
import type { LinePerformanceKpis } from "@/types/linePerformance";

interface Props {
  kpis: LinePerformanceKpis | null;
}

function mapCritical(status: string): "good" | "warning" | "critical" | "neutral" {
  if (status === "ahead" || status === "on_plan" || status === "good" || status === "on_target") return "good";
  if (status === "behind" || status === "warning" || status === "needs_attention") return "warning";
  if (status === "critical") return "critical";
  return "neutral";
}

export function LinePerformanceKpiStrip({ kpis }: Props) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-7 divide-x divide-slate-200 border-b border-slate-200 h-16">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center px-3 animate-pulse">
            <div className="h-8 w-full rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 divide-x divide-slate-300 border-b border-slate-300 bg-slate-50">
      <LinePerformanceKpiCard
        title="Plan"
        value={kpis.planQuantity}
        icon={<Target className="h-4 w-4" />}
        critical="neutral"
      />
      <LinePerformanceKpiCard
        title="Actual"
        value={kpis.actualQuantity}
        icon={<Package className="h-4 w-4" />}
        critical={mapCritical(kpis.gapStatus)}
        delta={kpis.gap >= 0 ? `+${kpis.gap}` : `${kpis.gap}`}
      />
      <LinePerformanceKpiCard
        title="Gap"
        value={kpis.gap >= 0 ? `+${kpis.gap}` : `${kpis.gap}`}
        icon={<TrendingDown className="h-4 w-4" />}
        critical={mapCritical(kpis.gapStatus)}
      />
      <LinePerformanceKpiCard
        title="Run Rate"
        value={kpis.runRate}
        unit={kpis.runRateUnit}
        icon={<Gauge className="h-4 w-4" />}
        critical={mapCritical(kpis.gapStatus)}
      />
      <LinePerformanceKpiCard
        title="OEE"
        value={kpis.oeeSignal !== null ? `${(kpis.oeeSignal * 100).toFixed(1)}%` : "—"}
        icon={<Activity className="h-4 w-4" />}
        critical={mapCritical(kpis.oeeStatus)}
      />
      <LinePerformanceKpiCard
        title="Downtime"
        value={`${kpis.downtimeMinutes}`}
        unit="min"
        icon={<Clock className="h-4 w-4" />}
        critical={kpis.downtimeMinutes > 60 ? "critical" : kpis.downtimeMinutes > 30 ? "warning" : "neutral"}
      />
      <LinePerformanceKpiCard
        title="Quality"
        value={kpis.firstPassYield !== null ? `${(kpis.firstPassYield * 100).toFixed(1)}%` : "—"}
        icon={<ShieldCheck className="h-4 w-4" />}
        critical={mapCritical(kpis.qualityStatus || "neutral")}
      />
    </div>
  );
}
