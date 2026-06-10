import { Package, Activity, TrendingDown, Gauge, Target, Clock, ShieldCheck } from "lucide-react";
import { LinePerformanceKpiCard } from "./LinePerformanceKpiCard";
import type { LinePerformanceKpis, KpiStatus } from "@/types/linePerformance";

interface KpiStripProps {
  kpis: LinePerformanceKpis | null;
}

function mapGapStatus(status: string): KpiStatus {
  if (status === "ahead" || status === "on_plan") return "good";
  if (status === "behind") return "warning";
  if (status === "critical") return "critical";
  return "neutral";
}

function mapOeeStatus(status: string): KpiStatus {
  if (status === "good" || status === "on_target") return "good";
  if (status === "warning" || status === "needs_attention") return "warning";
  if (status === "critical") return "critical";
  return "neutral";
}

function mapQualityStatus(status: string): KpiStatus {
  if (status === "good") return "good";
  if (status === "warning") return "warning";
  if (status === "critical") return "critical";
  return "neutral";
}

export function LinePerformanceKpiStrip({ kpis }: KpiStripProps) {
  if (!kpis) {
    return (
      <div className="flex gap-3 px-4 pt-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 h-20 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 pt-3">
      <LinePerformanceKpiCard
        title="Plan"
        value={kpis.planQuantity}
        icon={<Target className="h-4 w-4" />}
        status="neutral"
      />
      <LinePerformanceKpiCard
        title="Actual"
        value={kpis.actualQuantity}
        icon={<Package className="h-4 w-4" />}
        status={mapGapStatus(kpis.gapStatus)}
        delta={kpis.gap >= 0 ? `+${kpis.gap}` : `${kpis.gap}`}
      />
      <LinePerformanceKpiCard
        title="Gap"
        value={kpis.gap >= 0 ? `+${kpis.gap}` : `${kpis.gap}`}
        icon={<TrendingDown className="h-4 w-4" />}
        status={mapGapStatus(kpis.gapStatus)}
      />
      <LinePerformanceKpiCard
        title="Run Rate"
        value={kpis.runRate}
        unit={kpis.runRateUnit}
        icon={<Gauge className="h-4 w-4" />}
        status={mapGapStatus(kpis.gapStatus)}
      />
      <LinePerformanceKpiCard
        title="OEE"
        value={kpis.oeeSignal !== null ? `${(kpis.oeeSignal * 100).toFixed(1)}%` : "—"}
        icon={<Activity className="h-4 w-4" />}
        status={mapOeeStatus(kpis.oeeStatus)}
      />
      <LinePerformanceKpiCard
        title="Downtime"
        value={`${kpis.downtimeMinutes}`}
        unit="min"
        icon={<Clock className="h-4 w-4" />}
        status={kpis.downtimeMinutes > 30 ? "warning" : kpis.downtimeMinutes > 60 ? "critical" : "neutral"}
      />
      <LinePerformanceKpiCard
        title="Quality"
        value={kpis.firstPassYield !== null ? `${(kpis.firstPassYield * 100).toFixed(1)}%` : "—"}
        icon={<ShieldCheck className="h-4 w-4" />}
        status={mapQualityStatus(kpis.qualityStatus)}
      />
    </div>
  );
}
